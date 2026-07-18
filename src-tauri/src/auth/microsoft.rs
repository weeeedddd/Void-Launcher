//! The complete Microsoft → Minecraft authentication chain.
//!
//! ```text
//!  ┌─ 1. OAuth2 Device Code ──────► MSA access token (+ refresh token)
//!  ├─ 2. Xbox Live (XBL) ────────► XBL token + user hash ("uhs")
//!  ├─ 3. XSTS authorization ─────► XSTS token
//!  ├─ 4. login_with_xbox ────────► Minecraft access token (~24 h)
//!  └─ 5. /minecraft/profile ─────► player UUID + name (and ownership check)
//! ```
//!
//! See docs/AUTHENTICATION.md for the annotated walkthrough of every step.
//!
//! ⚠ PREREQUISITES
//!  * Register an Azure app (portal.azure.com → App registrations):
//!      - account type: "Personal Microsoft accounts only"
//!      - enable "Allow public client flows" (required for device code)
//!  * Have the client ID approved for the Minecraft services API by Mojang,
//!    otherwise step 4 returns 403: https://aka.ms/mce-reviewappid

use serde::{Deserialize, Serialize};

use super::{MinecraftProfile, MinecraftSession};
use crate::error::LauncherError;

/// TODO: replace with your own Azure application (client) ID.
pub const CLIENT_ID: &str = "00000000-0000-0000-0000-000000000000";

/// `XboxLive.signin` is the only scope Minecraft needs;
/// `offline_access` additionally yields a refresh token.
const SCOPE: &str = "XboxLive.signin offline_access";

const DEVICE_CODE_URL: &str =
    "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_AUTH_URL: &str = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL: &str = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_LOGIN_URL: &str = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL: &str = "https://api.minecraftservices.com/minecraft/profile";

// ─────────────────────────────────────────────────────────────────────────
// Step 1a: request a device code
// ─────────────────────────────────────────────────────────────────────────

/// Microsoft's device-code response. Deserialized from snake_case (their
/// wire format), serialized to camelCase for our frontend.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all(serialize = "camelCase"))]
pub struct DeviceCodeResponse {
    /// Short code the user types at the verification URI.
    pub user_code: String,
    /// Opaque code *we* use when polling for the token.
    pub device_code: String,
    /// Where the user signs in — usually https://www.microsoft.com/link
    pub verification_uri: String,
    pub expires_in: u64,
    /// Suggested polling interval in seconds.
    pub interval: u64,
    /// Pre-formatted instruction text ("To sign in, visit … and enter …").
    pub message: String,
}

pub async fn request_device_code(
    http: &reqwest::Client,
) -> Result<DeviceCodeResponse, LauncherError> {
    let resp = http
        .post(DEVICE_CODE_URL)
        .form(&[("client_id", CLIENT_ID), ("scope", SCOPE)])
        .send()
        .await?
        .error_for_status()?;
    Ok(resp.json().await?)
}

// ─────────────────────────────────────────────────────────────────────────
// Step 1b: poll until the user finished signing in
// ─────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct MsaTokens {
    pub access_token: String,
    /// Present because we request the `offline_access` scope.
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[allow(dead_code)]
    pub expires_in: u64,
}

#[derive(Debug, Deserialize)]
struct MsaTokenError {
    error: String,
}

/// Polls the token endpoint until the browser login completes.
/// Microsoft answers HTTP 400 + `"authorization_pending"` until then.
pub async fn poll_for_msa_tokens(
    http: &reqwest::Client,
    device_code: &str,
) -> Result<MsaTokens, LauncherError> {
    let mut interval = std::time::Duration::from_secs(5);
    let deadline = std::time::Instant::now() + std::time::Duration::from_secs(15 * 60);

    loop {
        if std::time::Instant::now() > deadline {
            return Err(LauncherError::Auth("Sign-in timed out — please try again.".into()));
        }
        tokio::time::sleep(interval).await;

        let resp = http
            .post(TOKEN_URL)
            .form(&[
                ("client_id", CLIENT_ID),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
                ("device_code", device_code),
            ])
            .send()
            .await?;

        if resp.status().is_success() {
            return Ok(resp.json().await?);
        }

        let err: MsaTokenError = resp.json().await?;
        match err.error.as_str() {
            // Still waiting for the user — keep polling.
            "authorization_pending" => continue,
            // We poll too fast — back off as the spec demands.
            "slow_down" => interval += std::time::Duration::from_secs(5),
            "authorization_declined" => {
                return Err(LauncherError::Auth("Sign-in was cancelled in the browser.".into()))
            }
            "expired_token" => {
                return Err(LauncherError::Auth("The code expired — please try again.".into()))
            }
            other => {
                return Err(LauncherError::Auth(format!("Microsoft sign-in failed: {other}")))
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────
// Steps 2+3: Xbox Live & XSTS (same response shape for both)
// ─────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct XboxTokenResponse {
    #[serde(rename = "Token")]
    token: String,
    #[serde(rename = "DisplayClaims")]
    display_claims: XboxDisplayClaims,
}

#[derive(Debug, Deserialize)]
struct XboxDisplayClaims {
    xui: Vec<XboxUserInfo>,
}

#[derive(Debug, Deserialize)]
struct XboxUserInfo {
    /// The "user hash" — combined with the XSTS token in step 4.
    uhs: String,
}

/// Step 2: trade the MSA access token for an Xbox Live token.
async fn xbox_live_auth(
    http: &reqwest::Client,
    msa_access_token: &str,
) -> Result<XboxTokenResponse, LauncherError> {
    let body = serde_json::json!({
        "Properties": {
            "AuthMethod": "RPS",
            "SiteName": "user.auth.xboxlive.com",
            // The "d=" prefix is required for tokens from Azure app registrations.
            "RpsTicket": format!("d={msa_access_token}"),
        },
        "RelyingParty": "http://auth.xboxlive.com",
        "TokenType": "JWT",
    });

    Ok(http
        .post(XBL_AUTH_URL)
        .json(&body)
        .send()
        .await?
        .error_for_status()?
        .json()
        .await?)
}

/// Step 3: trade the XBL token for an XSTS token scoped to Minecraft.
async fn xsts_auth(
    http: &reqwest::Client,
    xbl_token: &str,
) -> Result<XboxTokenResponse, LauncherError> {
    let body = serde_json::json!({
        "Properties": {
            "SandboxId": "RETAIL",
            "UserTokens": [xbl_token],
        },
        "RelyingParty": "rp://api.minecraftservices.com/",
        "TokenType": "JWT",
    });

    let resp = http.post(XSTS_AUTH_URL).json(&body).send().await?;

    // XSTS communicates account problems via 401 + an XErr code.
    if resp.status() == reqwest::StatusCode::UNAUTHORIZED {
        #[derive(Deserialize)]
        struct XstsError {
            #[serde(rename = "XErr")]
            xerr: u64,
        }
        let err: XstsError = resp.json().await?;
        let message = match err.xerr {
            2148916233 => {
                "This Microsoft account has no Xbox profile — sign in once at xbox.com to create one."
            }
            2148916235 => "Xbox Live is not available in your country.",
            2148916236 | 2148916237 => "This account requires adult verification on xbox.com.",
            2148916238 => {
                "This is a child account — an adult must add it to a Microsoft family first."
            }
            _ => "Xbox rejected the sign-in (XSTS error).",
        };
        return Err(LauncherError::Auth(message.into()));
    }

    Ok(resp.error_for_status()?.json().await?)
}

// ─────────────────────────────────────────────────────────────────────────
// Steps 4+5: Minecraft services
// ─────────────────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
struct McLoginResponse {
    access_token: String,
    /// Seconds until the Minecraft token expires (usually 86400 = 24 h).
    expires_in: i64,
}

/// Step 4: trade user-hash + XSTS token for a Minecraft access token.
async fn minecraft_login(
    http: &reqwest::Client,
    user_hash: &str,
    xsts_token: &str,
) -> Result<McLoginResponse, LauncherError> {
    let body = serde_json::json!({
        "identityToken": format!("XBL3.0 x={user_hash};{xsts_token}"),
    });

    let resp = http.post(MC_LOGIN_URL).json(&body).send().await?;

    if resp.status() == reqwest::StatusCode::FORBIDDEN {
        // The most common cause by far during development:
        return Err(LauncherError::Auth(
            "Minecraft rejected the login. Most likely this Azure client ID has not \
             been approved for the Minecraft API yet — see docs/AUTHENTICATION.md."
                .into(),
        ));
    }

    Ok(resp.error_for_status()?.json().await?)
}

#[derive(Debug, Deserialize)]
struct McProfileResponse {
    id: String,
    name: String,
}

/// Step 5: fetch the player profile. Doubles as the ownership check —
/// accounts without Java Edition have no profile (HTTP 404).
async fn fetch_profile(
    http: &reqwest::Client,
    mc_access_token: &str,
) -> Result<MinecraftProfile, LauncherError> {
    let resp = http.get(MC_PROFILE_URL).bearer_auth(mc_access_token).send().await?;

    if resp.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(LauncherError::Auth(
            "This account does not own Minecraft: Java Edition. (Game Pass users: \
             start the official launcher once to create your profile.)"
                .into(),
        ));
    }

    let profile: McProfileResponse = resp.error_for_status()?.json().await?;
    Ok(MinecraftProfile { uuid: profile.id, name: profile.name })
}

// ─────────────────────────────────────────────────────────────────────────
// Glue: MSA tokens → full Minecraft session (steps 2–5)
// ─────────────────────────────────────────────────────────────────────────

pub async fn login_with_msa(
    http: &reqwest::Client,
    msa: MsaTokens,
) -> Result<MinecraftSession, LauncherError> {
    let xbl = xbox_live_auth(http, &msa.access_token).await?;
    let user_hash = xbl
        .display_claims
        .xui
        .first()
        .ok_or_else(|| LauncherError::Auth("Xbox response contained no user hash.".into()))?
        .uhs
        .clone();

    let xsts = xsts_auth(http, &xbl.token).await?;
    let mc = minecraft_login(http, &user_hash, &xsts.token).await?;
    let profile = fetch_profile(http, &mc.access_token).await?;

    Ok(MinecraftSession {
        profile,
        access_token: mc.access_token,
        expires_at: chrono::Utc::now() + chrono::Duration::seconds(mc.expires_in),
        msa_refresh_token: msa.refresh_token,
    })
}
