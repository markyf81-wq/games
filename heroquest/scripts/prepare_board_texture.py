"""Fit Mark's supplied board image to the existing 26x19 texture atlas.

Offline Pillow only; no board rules or topology are inferred from the artwork.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import shutil
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('source', type=Path)
args = parser.parse_args()
image = Image.open(args.source).convert('RGB')
if image.size != (2048,1536):
    raise ValueError('This crop recipe expects the supplied 2048x1536 board image.')
crop = (74,74,1972,1461)  # 26 x 19 cells at 73 pixels; exclude outer black border.
board = image.crop(crop)
output = ROOT/'assets/textures/board'
output.mkdir(parents=True,exist_ok=True)
retained = ROOT/'references/visual/user-board-scan.jpg'
shutil.copy2(args.source,retained)
board.save(output/'board.webp',quality=93,method=6)
binary = (output/'board.webp').read_bytes()
asset = dict(id='board',sourceId='visual-user-board-image',sourceFile=args.source.name,
    sourceImageSize=list(image.size),sourceSha256=hashlib.sha256(args.source.read_bytes()).hexdigest(),
    cropPixels=list(crop),width=board.width,height=board.height,columns=26,rows=19,
    imageSha256=hashlib.sha256(binary).hexdigest(),
    modifications='Outer black border cropped; encoded as WebP quality 93. No redraw, AI artwork, rotation, recolouring or change to quest/grid data.',
    image='data:image/webp;base64,'+base64.b64encode(binary).decode())
(output/'board.js').write_text('// User-supplied board artwork; see README.md for provenance and crop.\nwindow.HeroQuest.componentArtwork = window.HeroQuest.componentArtwork || {};\nwindow.HeroQuest.componentArtwork.board = '+json.dumps(asset,separators=(',',':'))+';\n')
print('Prepared board atlas:',board.size,len(binary),'WebP bytes; 73 pixels per square.')
