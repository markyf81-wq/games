"""Extract the central figure from the supplied original NA game-screen scan.
Offline Poppler/Pillow recipe; no generated replacement artwork or runtime fetch.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'references/original-na/system-game-screen.pdf'
destination = ROOT / 'assets/ui/zargon.jpg'
destination.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as work:
    prefix = Path(work) / 'screen'
    subprocess.run(['pdftoppm', '-f', '1', '-singlefile', '-scale-to', '1400',
                    '-png', str(source), str(prefix)], check=True)
    sheet = Image.open(str(prefix) + '.png').convert('RGB')
    box = (500, 38, 931, 383)
    sheet.crop(box).resize((640, 512), Image.Resampling.LANCZOS).save(
        destination, quality=92, optimize=True)
record = {
    'source': str(source.relative_to(ROOT)), 'pdfPage': 1,
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'renderWidth': 1400, 'crop': list(box), 'size': [640, 512],
    'output': str(destination.relative_to(ROOT)),
    'outputSha256': hashlib.sha256(destination.read_bytes()).hexdigest(),
    'review': 'central game-screen artwork visually reviewed 2026-10-22',
    'recipe': 'scripts/prepare_zargon_portrait.py',
    'rights': 'Original game artwork; no open licence asserted. Source PDF retained.'
}
(destination.parent / 'zargon-source.json').write_text(json.dumps(record, indent=2) + '\n')
