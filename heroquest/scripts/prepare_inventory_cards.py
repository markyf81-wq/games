"""Prepare carried weapon and tool kit cards from the local equipment reference.

Offline artwork only. Rules remain sourced from the original North American
Armoury; drathe's equipment-card layout is not an original base-game deck.
"""
from pathlib import Path
import hashlib,json,subprocess,tempfile
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'references/fan-reference/drathe-system-equipment.pdf'
OUT=ROOT/'assets/ui/equipment'
# Normalized against the visually reviewed 1500px page renderings.
CARDS={1:{'dagger':(765,33,1101,556),'broadsword':(38,575,375,1098),
          'battle-axe':(38,33,375,556),'chain-mail':(401,33,738,556),
          'helmet':(765,575,1101,1098),'plate-mail':(1128,575,1465,1098),'longsword':(1128,33,1465,556),'crossbow':(401,575,738,1098)},
       2:{'shortsword':(38,575,375,1098),'tool-kit':(401,575,738,1098),'shield':(38,33,375,556),'staff':(401,33,738,556)}}

def prepare():
 OUT.mkdir(parents=True,exist_ok=True)
 manifest={'source':str(SOURCE.relative_to(ROOT)),'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
           'recipe':'scripts/prepare_inventory_cards.py','presentation':'Equipment cards created by drathe; artwork only, not rule authority.','cards':[]}
 with tempfile.TemporaryDirectory() as temp:
  for page,cards in CARDS.items():
   prefix=Path(temp)/str(page)
   subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','2400','-png','-singlefile',str(SOURCE),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
   sheet=Image.open(str(prefix)+'.png').convert('RGB')
   for name,box in cards.items():
    crop=tuple(round(value*sheet.width/1500) for value in box)
    card=sheet.crop(crop);card=card.resize((400,round(card.height*400/card.width)),Image.Resampling.LANCZOS)
    dest=OUT/(name+'.jpg');card.save(dest,quality=90,optimize=True)
    manifest['cards'].append({'id':name,'pdfPage':page,'crop':list(crop),'size':list(card.size),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
 (OUT/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':prepare()
