"""Gera ícones e telas de abertura do Android/iOS a partir de resources/icon.png.

Uso: python3 scripts/gerar-icones-nativos.py   (requer Pillow)
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
icon = Image.open(ROOT / 'resources/icon.png').convert('RGBA')
fg = Image.open(ROOT / 'resources/icon-foreground.png').convert('RGBA')
SKY = (61, 155, 233, 255)

def rounded(img: Image.Image, radius: float) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1], int(img.size[0] * radius), fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out

def circle(img: Image.Image) -> Image.Image:
    mask = Image.new('L', img.size, 0)
    ImageDraw.Draw(mask).ellipse([0, 0, img.size[0] - 1, img.size[1] - 1], fill=255)
    out = img.copy()
    out.putalpha(mask)
    return out

# ---------------- Android
res = ROOT / 'android/app/src/main/res'
if res.exists():
    for d, s in {'mdpi': 48, 'hdpi': 72, 'xhdpi': 96, 'xxhdpi': 144, 'xxxhdpi': 192}.items():
        base = icon.resize((s, s), Image.LANCZOS)
        rounded(base, 0.18).save(res / f'mipmap-{d}/ic_launcher.png')
        circle(base).save(res / f'mipmap-{d}/ic_launcher_round.png')
        f = int(s * 108 / 48)
        fg.resize((f, f), Image.LANCZOS).save(res / f'mipmap-{d}/ic_launcher_foreground.png')
    bg_xml = res / 'values/ic_launcher_background.xml'
    bg_xml.write_text('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#3D9BE9</color>\n</resources>\n')

    for p in res.glob('drawable*/splash.png'):
        w, h = Image.open(p).size
        splash = Image.new('RGBA', (w, h), SKY)
        s = int(min(w, h) * 0.55)
        logo = rounded(icon.resize((s, s), Image.LANCZOS), 0.2)
        splash.alpha_composite(logo, ((w - s) // 2, (h - s) // 2))
        splash.convert('RGB').save(p)

# ---------------- iOS
ios = ROOT / 'ios/App/App/Assets.xcassets'
if ios.exists():
    for p in (ios / 'AppIcon.appiconset').glob('*.png'):
        w, _ = Image.open(p).size
        icon.convert('RGB').resize((w, w), Image.LANCZOS).save(p)
    for p in (ios / 'Splash.imageset').glob('*.png'):
        w, h = Image.open(p).size
        splash = Image.new('RGBA', (w, h), SKY)
        s = int(min(w, h) * 0.45)
        splash.alpha_composite(rounded(icon.resize((s, s), Image.LANCZOS), 0.2), ((w - s) // 2, (h - s) // 2))
        splash.convert('RGB').save(p)
print('ícones e splash gerados')
