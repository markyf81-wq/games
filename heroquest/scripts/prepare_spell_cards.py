"""Crop original NA spell card faces from the local PDF scans. Offline only.
Requires Poppler and Pillow; outputs ordinary local JPEGs for file:// support.
"""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
CARDS={
 'air':['genie','tempest','swift-wind'],
 'earth':['heal-body','rock-skin','pass-through-rock'],
 'fire':['ball-of-flame','fire-of-wrath','courage'],
 'water':['sleep','water-of-healing','veil-of-mist'],
}
# Face borders on the common 1800 x 1355 scan sheet, PDF page 1.
BOXES=[(44,30,450,668),(480,30,885,668),(44,691,450,1320)]
out=ROOT/'assets/ui/spells';out.mkdir(parents=True,exist_ok=True)
manifest={'edition':'original North American Game System','page':1,'recipe':'scripts/prepare_spell_cards.py','sources':[]}
with tempfile.TemporaryDirectory() as work:
 for group,names in CARDS.items():
  source=ROOT/f'references/original-na/system-{group}-spells.pdf'
  prefix=Path(work)/group
  subprocess.run(['pdftoppm','-f','1','-l','1','-scale-to','1800','-png','-singlefile',str(source),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  sheet=Image.open(str(prefix)+'.png').convert('RGB')
  record={'source':str(source.relative_to(ROOT)),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'cards':[]}
  for name,box in zip(names,BOXES):
   crop=tuple(round(v*(sheet.width/1800 if i%2==0 else sheet.height/1355)) for i,v in enumerate(box))
   image=sheet.crop(crop);image=image.resize((480,round(image.height*480/image.width)),Image.Resampling.LANCZOS)
   dest=out/(name+'.jpg');image.save(dest,quality=90,optimize=True)
   record['cards'].append({'id':name,'file':dest.name,'crop':list(crop),'size':list(image.size),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
  manifest['sources'].append(record)
(out/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
