"""Prepare xbeaker's supplied Thingiverse 4271138 weapons rack for local play.

Offline numpy/fast-simplification only; uses existing STL data/packing helpers.
"""
from pathlib import Path
import base64
import hashlib
import json
import shutil
import numpy as np
from import_stl import read_stl, bounds, shaded_mesh
import fast_simplification

ROOT = Path(__file__).resolve().parents[1]
source = ROOT/'references/stl-source/weapons-rack-4271138/Weapons_Rack.stl'
points, faces, encoding, original_count = read_stl(source)
original_bounds = bounds(points)
base = points[points[:,2] <= points[:,2].min()+np.ptp(points[:,2])*.035]
base_bounds = bounds(base)
centre = (base[:,:2].min(0)+base[:,:2].max(0))/2
# Tiny near-duplicate vertices/overlapping facets obstruct the quadric reducer.
# Weld within a 0.04mm grid first (far below board-scale detail), averaging the
# source samples and dropping collapsed/duplicate faces rather than losing blades.
cells,inverse,counts = np.unique(np.rint(points/.04).astype(np.int64),axis=0,return_inverse=True,return_counts=True)
points = np.column_stack([np.bincount(inverse,weights=points[:,axis])/counts for axis in range(3)])
faces = inverse[faces]
keep=(faces[:,0]!=faces[:,1])&(faces[:,1]!=faces[:,2])&(faces[:,0]!=faces[:,2]);faces=faces[keep]
_,unique=np.unique(np.sort(faces,axis=1),axis=0,return_index=True);faces=faces[np.sort(unique)]
print('Welded source:',len(points),'vertices;',len(faces),'faces.',flush=True)
points, faces = fast_simplification.simplify(points,faces,target_count=18000,agg=5)
if len(faces)>60000 or np.ptp(points[:,2])<original_bounds['size'][2]*.9:
    raise ValueError('Rack simplification needs further authoring; refusing an oversized or truncated derivative.')
points = points[:,[0,2,1]]*[1,1,-1]
points[:,0] -= centre[0];points[:,2] += centre[1];points[:,1] -= points[:,1].min()
points,normals,faces = shaded_mesh(points,faces)
minimum, extent = points.min(0), np.ptp(points,axis=0)
quant = np.rint((points-minimum)/extent*65535).astype('<u2')
indices = faces.astype('<u2' if len(points)<=65535 else '<u4')
asset = dict(id='weapons-rack',sourceFile='weapons-rack-4271138/Weapons_Rack.stl',
    sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),sourceTriangles=original_count,
    sourceBounds=original_bounds,sourceBaseBounds=base_bounds,creator='xbeaker',
    sourceUrl='https://www.thingiverse.com/thing:4271138',
    licence='Creative Commons Attribution - Non-Commercial - Share Alike (version not specified in supplied notice)',
    modifications='Near-duplicate vertices welded on .04mm grid and collapsed/duplicate facets removed; simplified to browser mesh; Z-up to Y-up; shallow base centred/grounded; uniformly fitted by runtime. Initial plain wood colour, detailed paint pending.',
    encoding=encoding,vertices=len(points),triangles=len(faces),minimum=minimum.tolist(),extent=extent.tolist(),indexBytes=indices.dtype.itemsize,
    positions=base64.b64encode(quant.tobytes()).decode(),normals=base64.b64encode(normals.tobytes()).decode(),
    indices=base64.b64encode(indices.tobytes()).decode(),geometrySha256=hashlib.sha256(quant.tobytes()+normals.tobytes()+indices.tobytes()).hexdigest())
out = ROOT/'assets/models/weapons-rack';out.mkdir(parents=True,exist_ok=True)
(out/'weapons-rack.js').write_text('// xbeaker, Thingiverse 4271138. CC BY-NC-SA; see README.md and LICENSE.txt.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets["weapons-rack"] = '+json.dumps(asset,separators=(',',':'))+';\n')
for name in ['LICENSE.txt','README.txt']:shutil.copy2(source.parent/name,out/name)
print('Prepared weapons rack:',len(faces),'triangles;',len(points),'vertices;',extent.round(3).tolist())
