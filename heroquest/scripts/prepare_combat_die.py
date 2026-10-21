"""Assign ink to the supplied die's recessed symbols without altering its mesh.

Face symbols/orientation were read from six orthographic authoring views. Requires
numpy; rerun after importing a new die mesh. This is asset preparation, not RNG.
"""
from pathlib import Path
import base64
import hashlib
import json
import numpy as np

root=Path(__file__).resolve().parents[1]
text=(root/'assets/models/imported/combat-die.js').read_text()
asset=json.loads(text.split('window.HeroQuest.stlAssets["combat-die"] = ',1)[1].rsplit(';',1)[0])
if 'geometrySha256' not in asset:
    # Older imports predate the colour guard. Fingerprint their existing packed
    # geometry in place; never reconvert or change their positions/normals.
    raw=b''.join(base64.b64decode(asset[name]) for name in ('positions','normals','indices'))
    asset['geometrySha256']=hashlib.sha256(raw+json.dumps([asset['minimum'],asset['extent']]).encode()).hexdigest()
    (root/'assets/models/imported/combat-die.js').write_text('// User-supplied STL derivative. Provenance: catalog.json and ../README.md.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets["combat-die"] = '+json.dumps(asset,separators=(',',':'))+';\n')
points=np.frombuffer(base64.b64decode(asset['positions']),dtype='<u2').reshape(-1,3)/65535*np.array(asset['extent'])+asset['minimum']
points-=(points.min(0)+points.max(0))/2
faces=np.frombuffer(base64.b64decode(asset['indices']),dtype='<u2' if asset['indexBytes']==2 else '<u4').reshape(-1,3)
centres=points[faces].mean(1)
axis=np.argmax(np.abs(centres),axis=1)
depth=np.abs(centres[np.arange(len(faces)),axis])
half=np.ptp(points,axis=0)/2
radius_squared=(centres*centres).sum(1)-depth*depth
ink=(depth<half[axis]-.075)&(depth>half[axis]-.85)&(radius_squared<5.6**2)
data={
    'id':'combat-die','geometrySha256':asset['geometrySha256'],
    'triangles':asset['triangles'],'vertices':asset['vertices'],
    'materials':[{'name':'ivory','colour':'#f0e7d2','roughness':.4,'metalness':0},
                 {'name':'ink','colour':'#20201c','roughness':.7,'metalness':0}],
    'faceMaterials':base64.b64encode(ink.astype(np.uint8).tobytes()).decode(),
    'faces':[
        {'normal':[1,0,0],'up':[0,1,0],'result':'skull'},
        {'normal':[-1,0,0],'up':[0,1,0],'result':'white-shield'},
        {'normal':[0,1,0],'up':[0,0,-1],'result':'skull'},
        {'normal':[0,-1,0],'up':[0,0,1],'result':'white-shield'},
        {'normal':[0,0,1],'up':[0,1,0],'result':'skull'},
        {'normal':[0,0,-1],'up':[0,-1,0],'result':'black-shield'}
    ]
}
(root/'assets/models/combat-die-paint.js').write_text('// Authored from Dice/HQdice.STL; recipe: scripts/prepare_combat_die.py.\nwindow.HeroQuest.combatDiePaint = '+json.dumps(data,separators=(',',':'))+';\n')
catalog_path=root/'assets/models/imported/catalog.json'
catalog=json.loads(catalog_path.read_text())
for record in catalog['models']:
    if record['id']=='combat-die':
        record['geometrySha256']=asset['geometrySha256']
        record['placementStatus']='Six face symbols/orientations reviewed in authoring views; used in the dice tray'
        record['bytes']=(root/'assets/models/imported/combat-die.js').stat().st_size
catalog_path.write_text(json.dumps(catalog,indent=2)+'\n')
print('Prepared combat die:',len(faces),'triangles;',int(ink.sum()),'ink faces; geometry unchanged.')
