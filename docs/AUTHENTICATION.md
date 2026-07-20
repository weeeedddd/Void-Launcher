# Microsoft → Minecraft Authentication

How the launcher turns "Sign in with Microsoft" into a Minecraft access token. Implementation: [`src-tauri/src/auth/microsoft.rs`](../src-tauri/src/auth/microsoft.rs).

```mermaid
sequenceDiagram
    participant U as User (browser)
    participant L as Launcher (Rust)
    participant MS as login.microsoftonline.com
    participant XBL as Xbox Live
    participant XSTS as XSTS
    participant MC as api.minecraftservices.com

    L->>MS: 1a. POST /devicecode (client_id, scope)
    MS-->>L: user_code + verification_uri
    L->>U: open browser, show user_code
    U->>MS: signs in, enters code
    L->>MS: 1b. POST /token (poll until approved)
    MS-->>L: MSA access_token (+ refresh_token)
    L->>XBL: 2. /user/authenticate (RpsTicket "d=<token>")
    XBL-->>L: XBL token + user hash (uhs)
    L->>XSTS: 3. /xsts/authorize (RelyingParty rp://api.minecraftservices.com/)
    XSTS-->>L: XSTS token
    L->>MC: 4. /authentication/login_with_xbox ("XBL3.0 x=<uhs>;<xsts>")
    MC-->>L: Minecraft access_token (~24 h)
    L->>MC: 5. GET /minecraft/profile (Bearer)
    MC-->>L: UUID + player name
```

## 0. One-time setup (required!)

1. **Azure app registration** — [portal.azure.com](https://portal.azure.com) → *App registrations* → *New*:
   - Supported account types: **"Personal Microsoft accounts only"**
   - *Authentication* → enable **"Allow public client flows"** (this is what makes the device-code grant work; no client secret needed — the launcher is a public client)
   - Configure the **Application (client) ID** as `CLIENT_ID` in `src-tauri/src/auth/microsoft.rs`. The ID is a public application identifier (not a client secret) and ships with the desktop app; users only see the Microsoft sign-in button.
2. **Mojang approval** — the final `login_with_xbox` call only works for client IDs Mojang has approved. Apply via the official form: <https://aka.ms/mce-reviewappid>. Until approval you'll get **HTTP 403** at step 4 (the launcher shows a matching error message). Steps 1–3 can be developed and tested before approval.

## The five steps

| # | Endpoint | In → Out |
| --- | --- | --- |
| 1a | `POST login.microsoftonline.com/consumers/oauth2/v2.0/devicecode` — form: `client_id`, `scope=XboxLive.signin offline_access` | → `user_code`, `device_code`, `verification_uri` |
| 1b | `POST …/token` — form: `client_id`, `grant_type=urn:ietf:params:oauth:grant-type:device_code`, `device_code` — poll every 5 s; HTTP 400 `authorization_pending` until approved | → MSA `access_token`, `refresh_token` |
| 2 | `POST user.auth.xboxlive.com/user/authenticate` — JSON with `"RpsTicket": "d=<msa_access_token>"` (the `d=` prefix is required for Azure-app tokens!) | → XBL `Token`, `DisplayClaims.xui[0].uhs` |
| 3 | `POST xsts.auth.xboxlive.com/xsts/authorize` — `"SandboxId": "RETAIL"`, `"RelyingParty": "rp://api.minecraftservices.com/"` | → XSTS `Token` |
| 4 | `POST api.minecraftservices.com/authentication/login_with_xbox` — `"identityToken": "XBL3.0 x=<uhs>;<xsts_token>"` | → MC `access_token` (~24 h) |
| 5 | `GET api.minecraftservices.com/minecraft/profile` — `Authorization: Bearer` | → `id` (UUID), `name` |

### XSTS error codes (step 3, HTTP 401 + `XErr`)

| XErr | Meaning / user message |
| --- | --- |
| `2148916233` | Account has no Xbox profile → sign in once at xbox.com |
| `2148916235` | Xbox Live unavailable in this country |
| `2148916236/7` | Adult verification required (South Korea) |
| `2148916238` | Child account → must be added to a Microsoft family |

### Step 5 doubles as the ownership check

Accounts that don't own Java Edition get **404** on `/minecraft/profile`. Note the Game Pass case: entitled but must start the official launcher once to create a profile — our error message says so. (The `entitlements/mcstore` endpoint exists but is unreliable for Game Pass; the profile check is what launchers actually use.)

## Design decisions & security

- **Device-code flow** over auth-code+PKCE: no localhost redirect server, no embedded webview (Microsoft discourages those for credentials), and the UI just shows a short code. Prism Launcher does the same.
- **Split into two commands** (`begin_…`/`complete_…`) so the UI can display the code while Rust polls.
- **Tokens never reach the WebView.** The frontend only sees `{ uuid, name }`; the MC token lives in `AppState.session` and is injected into the Java command line at launch.
- **Refresh (M1):** persist `refresh_token` in the OS keychain (`keyring` crate — Windows Credential Manager / macOS Keychain / libsecret), then `grant_type=refresh_token` at startup and re-run steps 2–5. Never store tokens in plain files.

## Libraries, if you'd rather not hand-roll

| Stack | Library |
| --- | --- |
| Rust | [`minecraft-msa-auth`](https://crates.io/crates/minecraft-msa-auth) (chain on top of `oauth2`) |
| Node/Electron | `msmc`, `prismarine-auth` |
| C#/.NET | `CmlLib.Core.Auth.Microsoft` |

We hand-roll in ~300 commented lines because the chain is 5 plain HTTP calls — full control over error messages, no dependency risk.
