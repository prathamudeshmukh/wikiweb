"""Converts the app's TTF faces to WOFF2 for the web build (SPEC.md §15.9): same glyphs, about half the bytes.

Lossless: no subsetting, so the OFL licences' reserved names are untouched. Rerun when `src/theme/fonts.ts` changes:

    python3 -m venv .venv-fonts && .venv-fonts/bin/pip install fonttools==4.60.1 brotli==1.1.0
    .venv-fonts/bin/python scripts/build-web-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "fonts"

# package, style folder, face — the faces FONT_SOURCES loads.
FACES = [
    ("fraunces", "600SemiBold", "Fraunces_600SemiBold"),
    ("fraunces", "600SemiBold_Italic", "Fraunces_600SemiBold_Italic"),
    ("fraunces", "700Bold", "Fraunces_700Bold"),
    ("literata", "400Regular", "Literata_400Regular"),
    ("literata", "600SemiBold", "Literata_600SemiBold"),
    ("ibm-plex-mono", "400Regular", "IBMPlexMono_400Regular"),
    ("ibm-plex-mono", "500Medium", "IBMPlexMono_500Medium"),
]


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for package, style, face in FACES:
        source = ROOT / "node_modules" / "@expo-google-fonts" / package / style / f"{face}.ttf"
        font = TTFont(source)
        font.flavor = "woff2"
        target = OUT / f"{face}.woff2"
        font.save(target)
        print(f"{face}: {source.stat().st_size // 1024} KB -> {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
