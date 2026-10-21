"""Project the supplied combat die's ink into UI icons. Requires numpy/Pillow.

Uses the guarded paint data; does not redraw or replace the sculpt's symbols.
"""
from pathlib import Path
import base64
import json
import numpy as np
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = (root / 'assets/models/imported/combat-die.js').read_text()
asset = json.loads(source.split('window.HeroQuest.stlAssets["combat-die"] = ', 1)[1].rsplit(';', 1)[0])
paint = json.loads((root / 'assets/models/combat-die-paint.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
assert asset['geometrySha256'] == paint['geometrySha256']
points = np.frombuffer(base64.b64decode(asset['positions']), dtype='<u2').reshape(-1, 3) / 65535 * asset['extent'] + asset['minimum']
points -= (points.min(0) + points.max(0)) / 2
faces = np.frombuffer(base64.b64decode(asset['indices']), dtype='<u2' if asset['indexBytes'] == 2 else '<u4').reshape(-1, 3)
centres = points[faces].mean(1)
ink = np.frombuffer(base64.b64decode(paint['faceMaterials']), dtype=np.uint8).astype(bool)
target = root / 'assets/ui/dice'
target.mkdir(parents=True, exist_ok=True)
seen = set()
for face in paint['faces']:
    kind = face['result']
    if kind in seen:
        continue
    seen.add(kind)
    normal, up = np.array(face['normal']), np.array(face['up'])
    # Present the helmet above the skull in the flat black-shield icon. The 3D
    # landing mapping remains independent (the whole die may face either way).
    if kind == 'black-shield':
        up = -up
    right = np.cross(up, normal)
    axis = np.argmax(abs(normal))
    # Exclude neighbouring symbols and rounded-corner recesses.
    mask = ink & (centres @ normal > np.ptp(points[:, axis]) / 2 - .85)
    mask &= ((centres @ right) ** 2 + (centres @ up) ** 2 < 5.6 ** 2)
    uv = points @ np.stack([right, up], axis=1)
    selected = uv[faces[mask]]
    low, high = selected.reshape(-1, 2).min(0), selected.reshape(-1, 2).max(0)
    uv = (uv - (low + high) / 2) * [900 / max(high - low), -900 / max(high - low)] + 512
    image = Image.new('RGBA', (1024, 1024))
    draw = ImageDraw.Draw(image)
    for triangle in faces[mask]:
        draw.polygon([tuple(p) for p in uv[triangle]], fill=(32, 32, 28, 255))
    image.resize((256, 256), Image.Resampling.LANCZOS).save(target / (kind + '.png'))
