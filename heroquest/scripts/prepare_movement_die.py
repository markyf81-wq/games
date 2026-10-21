"""Make a blank rounded die from the supplied combat die's outer convex hull.

Offline only: numpy and the existing local Three.js npm archive/Node runtime.
The outer hull preserves the sculpt's rounded silhouette and fills its symbols.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import subprocess
from import_stl import shaded_mesh
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--node', default='node')
args = parser.parse_args()

# Three's MIT-licensed QuickHull helper comes from the same archived version as
# the bundled renderer. It is used only during authoring, never shipped/executed
# as part of gameplay. Do not execute any user-supplied model/archive code.
program = r"""
const fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process'),path=require('node:path');
const root=process.argv[1],ctx={};ctx.window=ctx;ctx.HeroQuest={};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'vendor/three-0.186.1.js'),'utf8'),ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/models/imported/combat-die.js'),'utf8'),ctx);
const helper=cp.execFileSync('tar',['-xOf',path.join(root,'tmp/three-0.186.1.tgz'),'package/examples/jsm/math/ConvexHull.js'],{encoding:'utf8'});
vm.runInContext(helper.replace(/import[\s\S]*?from 'three';/,'const {Line3,Plane,Triangle,Vector3}=HQThree;').replace(/export \{[^}]+\};/,'window.ConvexHull=ConvexHull;'),ctx);
const a=ctx.HeroQuest.stlAssets['combat-die'],bytes=Buffer.from(a.positions,'base64'),T=ctx.HQThree,points=[];
const centre=a.minimum.map((v,i)=>v+a.extent[i]/2),scale=1.5/Math.max(...a.extent);
for(let i=0;i<a.vertices;i++)points.push(new T.Vector3(...[0,1,2].map(axis=>(bytes.readUInt16LE((i*3+axis)*2)/65535*a.extent[axis]+a.minimum[axis]-centre[axis])*scale)));
const hull=new ctx.ConvexHull().setFromPoints(points),lookup=new Map(),vertices=[],faces=[];
for(const face of hull.faces){let edge=face.edge;const indices=[];do{const p=edge.head().point,key=p.toArray().join(',');if(!lookup.has(key)){lookup.set(key,vertices.length);vertices.push(p.toArray());}indices.push(lookup.get(key));edge=edge.next;}while(edge!==face.edge);faces.push(indices);}
process.stdout.write(JSON.stringify({points:vertices,faces,sourceGeometrySha256:a.geometrySha256,sourceFile:a.sourceFile,sourceSha256:a.sourceSha256}));
"""
data = json.loads(subprocess.run([args.node, '-e', program, str(ROOT)], check=True, capture_output=True, text=True).stdout)
points, normals, faces = shaded_mesh(np.array(data['points']), np.array(data['faces']))
minimum, extent = points.min(0), np.ptp(points, axis=0)
quant = np.rint((points-minimum)/extent*65535).astype('<u2')
indices = faces.astype('<u2' if len(points) <= 65535 else '<u4')
asset = {
    'id':'movement-die-body','sourceFile':data['sourceFile'],
    'sourceSha256':data['sourceSha256'],'sourceGeometrySha256':data['sourceGeometrySha256'],
    'modifications':'Convex outer hull fills combat symbols; centred and uniformly fitted to 1.5 units. Red material/white pips supplied by runtime factory.',
    'triangles':len(faces),'vertices':len(points),'minimum':minimum.tolist(),'extent':extent.tolist(),
    'indexBytes':indices.dtype.itemsize,
    'positions':base64.b64encode(quant.tobytes()).decode(),
    'normals':base64.b64encode(normals.tobytes()).decode(),
    'indices':base64.b64encode(indices.tobytes()).decode(),
    'geometrySha256':hashlib.sha256(quant.tobytes()+normals.tobytes()+indices.tobytes()).hexdigest()
}
output = ROOT/'assets/models/movement-die-body.js'
output.write_text('// Blank outer hull of the user-supplied combat die. Recipe: scripts/prepare_movement_die.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets["movement-die-body"] = '+json.dumps(asset,separators=(',',':'))+';\n')
print('Prepared movement die:',len(faces),'triangles;',len(points),'vertices; rounded combat-die hull.')
