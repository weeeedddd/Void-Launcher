# Character renders

Drop-in art for the installer's render slot (View 1).

- **`shadow.png`** — a **licensed** high-quality Cid Kagenou / "Shadow" render.
  The installer loads `/renders/shadow.png`; if the file is absent it falls
  back to a styled placeholder, so the app runs fine without it.

Vite serves everything in `public/` from the web root, so a file at
`public/renders/shadow.png` is reachable at `/renders/shadow.png`.

> ⚠️ Ship only artwork you have the rights to. "The Eminence in Shadow" is
> © Daisuke Aizawa / KADOKAWA — no copyrighted art is committed to this repo.
