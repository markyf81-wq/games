"""Extract authentic component artwork from the locally retained original scan.

Offline only: pypdf and Pillow. Crops are source-image pixels, not redrawn art.
The JS data URI keeps WebGL image loading local and safe under file:// too.
"""
from pathlib import Path
import base64
import hashlib
import io
import json
from PIL import Image
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
source = ROOT/'references/original-na/system-tiles.pdf'
embedded = PdfReader(source).pages[0].images[0]
sheet = Image.open(io.BytesIO(embedded.data)).convert('RGB')
if sheet.size != (1582,1190):
    raise ValueError('This crop recipe expects the retained 1582x1190 embedded tile sheet.')
# First of the two identical 2x2 stairway faces, page 1 lower-right. Exclude
# the white cutting gutters; keep the printed black background and step art.
crop = (1198,598,1463,863)
image = sheet.crop(crop)
output = ROOT/'assets/textures/tiles'
output.mkdir(parents=True, exist_ok=True)
image.save(output/'stairway.png', optimize=True)
binary = (output/'stairway.png').read_bytes()
asset = dict(id='stairs',sourceId='system-tiles',sourcePdfPage=1,
    sourceImage=embedded.name,sourceImageSize=list(sheet.size),cropPixels=list(crop),
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
    imageSha256=hashlib.sha256(binary).hexdigest(),width=image.width,height=image.height,
    modifications='Original stairway tile cropped from embedded scan; white cutting gutters removed. No redraw, recolouring or AI artwork.',
    image='data:image/png;base64,'+base64.b64encode(binary).decode())
(output/'stairway.js').write_text('// Original HeroQuest stair tile; see README.md for source/provenance.\nwindow.HeroQuest.componentArtwork = window.HeroQuest.componentArtwork || {};\nwindow.HeroQuest.componentArtwork.stairs = '+json.dumps(asset,separators=(',',':'))+';\n')
print('Prepared original stairway tile:', image.size, len(binary), 'PNG bytes; source', embedded.name, sheet.size)

# Original sprung trap tiles, first row. Keep the printed art intact.
traps = []
for name, rectangle in [('pit-trap',(449,0,581,132)),('falling-block',(299,0,431,132))]:
    tile = sheet.crop(rectangle)
    target = output/(name+'.png')
    tile.save(target,optimize=True)
    data = target.read_bytes()
    record = dict(id=name,sourceId='system-tiles',sourcePdfPage=1,
        sourceImage=embedded.name,sourceImageSize=list(sheet.size),cropPixels=list(rectangle),
        sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
        imageSha256=hashlib.sha256(data).hexdigest(),width=tile.width,height=tile.height,
        modifications='Original printed trap tile cropped from embedded scan; no redraw or recolouring.',
        image='data:image/png;base64,'+base64.b64encode(data).decode())
    traps.append('window.HeroQuest.componentArtwork['+json.dumps(name)+']='+json.dumps(record,separators=(',',':'))+';')
(output/'traps.js').write_text('// Original HeroQuest trap tiles; see README.md for provenance.\nwindow.HeroQuest.componentArtwork=window.HeroQuest.componentArtwork||{};\n'+'\n'.join(traps)+'\n')
print('Prepared original pit and falling-block tile artwork.')
