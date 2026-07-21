from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "public" / "void-shadow-blade-app-icon.png"
ICON_DIRECTORIES = [ROOT / "src-tauri" / "icons", ROOT / "bootstrapper" / "src-tauri" / "icons"]


def main() -> None:
    image = Image.open(SOURCE).convert("RGBA")
    for directory in ICON_DIRECTORIES:
        directory.mkdir(parents=True, exist_ok=True)
        image.resize((1024, 1024), Image.Resampling.LANCZOS).save(directory / "icon.png", optimize=True)
        image.resize((128, 128), Image.Resampling.LANCZOS).save(directory / "128x128.png", optimize=True)
        image.resize((32, 32), Image.Resampling.LANCZOS).save(directory / "32x32.png", optimize=True)
        image.save(directory / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])

    image.resize((256, 256), Image.Resampling.LANCZOS).save(ROOT / "public" / "favicon.png", optimize=True)


if __name__ == "__main__":
    main()
