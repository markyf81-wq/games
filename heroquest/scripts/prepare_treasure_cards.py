"""Extract original NA Treasure faces/back from the local scan. Offline only."""
from pathlib import Path
import hashlib
import json
import subprocess
import tempfile
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'references/original-na/system-treasure.pdf'
OUT=ROOT/'assets/ui/treasure'; OUT.mkdir(parents=True,exist_ok=True)
# One representative for each distinct face; physical copies live in data/treasure.js.
FACES={1:{(0,0):'gem',(1,0):'gold-15',(2,0):'gold-25',(3,0):'hazard-arrow'},
       2:{(0,0):'hazard-pit',(1,0):'heroic-brew',(2,0):'jewels',(3,0):'potion-of-healing',(2,1):'potion-of-defense'},
       3:{(0,1):'potion-of-strength',(1,0):'wandering-monster'}}
manifest={'source':str(SOURCE.relative_to(ROOT)),'sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'recipe':'scripts/prepare_treasure_cards.py','cards':[]}
with tempfile.TemporaryDirectory() as temp:
 for page in range(1,5):
  prefix=Path(temp)/str(page)
  subprocess.run(['pdftoppm','-f',str(page),'-l',str(page),'-scale-to','1800','-png','-singlefile',str(SOURCE),str(prefix)],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
  sheet=Image.open(str(prefix)+'.png').convert('RGB')
  boxes=FACES.get(page,{(0,0):'back'})
  for (col,row),name in boxes.items():
   if page==4:
    # Back-sheet crop marks, measured on the reviewed 1000 x 753 rendering.
    box=(33/1000,30/753,242/1000,363/753)
   else:
    # Common face-sheet borders, measured on the reviewed 1700 x 1279 rendering.
    box=((42+411.3*col)/1700,(35+615*row)/1279,(425+411.3*col)/1700,(629+615*row)/1279)
   crop=tuple(round(v*(sheet.width if i%2==0 else sheet.height)) for i,v in enumerate(box))
   card=sheet.crop(crop);card=card.resize((400,round(card.height*400/card.width)),Image.Resampling.LANCZOS)
   dest=OUT/(name+'.jpg');card.save(dest,quality=90,optimize=True)
   manifest['cards'].append({'id':name,'pdfPage':page,'crop':list(crop),'size':list(card.size),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
(OUT/'sources.json').write_text(json.dumps(manifest,indent=2)+'\n')
