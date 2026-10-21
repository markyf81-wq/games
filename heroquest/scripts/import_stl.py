"""Prepare user-supplied STL geometry for offline browser use.

Input is treated as mesh data only. No scripts from archives are executed.
Requires numpy and fast-simplification==0.2.0 for asset preparation, not play.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]
# A local tool-only install avoids adding packages to the shared Python runtime.
if (ROOT/'tmp/model-libs').is_dir():
    sys.path.insert(0, str(ROOT/'tmp/model-libs'))
import numpy as np

SOURCE = ROOT/'references/stl-source'
OUTPUT = ROOT/'assets/models/imported'


def read_stl(path):
    data = path.read_bytes()
    if len(data) >= 84 and 84 + struct.unpack_from('<I',data,80)[0]*50 == len(data):
        count = struct.unpack_from('<I',data,80)[0]
        dtype = np.dtype([('normal','<f4',(3,)),('vertices','<f4',(3,3)),('attribute','<u2')])
        triangles = np.frombuffer(data,dtype=dtype,count=count,offset=84)['vertices'].astype(np.float64)
        encoding = 'binary'
    else:
        # Standard ASCII STL: each facet contributes exactly three vertex lines.
        rows = [line.split()[1:] for line in data.decode('ascii').splitlines() if line.lstrip().startswith('vertex ')]
        if not rows or len(rows)%3 or any(len(row)!=3 for row in rows):
            raise ValueError('Invalid ASCII STL: '+str(path))
        triangles = np.array(rows,dtype=np.float64).reshape(-1,3,3)
        encoding = 'ascii'
    if not np.isfinite(triangles).all(): raise ValueError('Non-finite vertex: '+str(path))
    points, inverse = np.unique(np.round(triangles.reshape(-1,3),6),axis=0,return_inverse=True)
    faces = inverse.reshape(-1,3)
    edge1 = points[faces[:,1]]-points[faces[:,0]]
    edge2 = points[faces[:,2]]-points[faces[:,0]]
    keep = np.linalg.norm(np.cross(edge1,edge2),axis=1)>1e-10
    faces = faces[keep]
    _, unique = np.unique(np.sort(faces,axis=1),axis=0,return_index=True)
    return points, faces[np.sort(unique)], encoding, len(triangles)


def model_id(path):
    # Explicit stable keys; filenames/printed names are kept intact in provenance.
    names = {
        'BarbarianNewBase':'barbarian','ElfNewBase':'elf','DwarfNewBase':'dwarf','WizardNewBase':'wizard',
        'OrcCleaverNewBase':'orc-cleaver','OrcMaceNewBase':'orc-mace','OrcSwordNewBase':'orc-sword',
        'GoblinSwordNewBase':'goblin-sword','GoblinAxeNewBase':'goblin-axe','GoblinDaggerNewBase':'goblin-dagger',
        'MummyNewBase':'mummy','ChaosMageNewBase':'chaos-warlock','ZombieNewBase':'zombie',
        'ChaosWarriorNewbase':'chaos-warrior','GargoyleWings':'gargoyle-wings','GargoyleNewBase':'gargoyle',
        'FimirNewBase':'fimir','SkeletonNewBase':'skeleton','HQdice':'combat-die',
        'Just_Table':'table','HeroQuest_closed-door':'closed-door','HeroQuest_open-door':'open-door',
        'Bookcase_NoShelf_Full_Textured':'bookcase-frame','Bookcase_OnlyShelf':'bookcase-shelves',
        'Throne_HeroQuest':'throne','SorcererTable_FDM':'sorcerers-table','Chest_forFDM':'chest',
        'Buffet_ForFDM':'cupboard','Fireplace_forFDM':'fireplace','Tomb_Bottom':'tomb-bottom',
        'Tomb_Top':'tomb-top','Spiral_Stair':'spiral-stair','AlchemyTable':'alchemists-bench',
        'TotureRack_full':'torture-rack','TrapDoorTile_solid':'trapdoor-tile','WeakFloorTile':'weak-floor-tile',
        'PitTrap2':'pit-trap','SpikePitTrap2':'spike-pit-trap','1x2WallTile_Solid':'blocked-2x1',
        '1x1WallTile_Solid':'blocked-1x1'
    }
    return names[path.stem]


def budget(key, category):
    if key in ('barbarian','elf','dwarf','wizard'):return 24000
    if key=='gargoyle':return 28000
    if category=='Minis':return 18000
    if key=='table':return 8000
    if category=='Furniture':return 14000
    return 10000


def bounds(points):
    return {'min':points.min(axis=0).round(6).tolist(),'max':points.max(axis=0).round(6).tolist(),
            'size':np.ptp(points,axis=0).round(6).tolist()}


def shaded_mesh(points, faces, angle=48):
    """Split only hard normal creases, retaining smooth curves and sharp bases."""
    face_normals = np.cross(points[faces[:,1]]-points[faces[:,0]],points[faces[:,2]]-points[faces[:,0]])
    lengths = np.linalg.norm(face_normals,axis=1)
    faces = faces[lengths>1e-12];face_normals = face_normals[lengths>1e-12]
    face_normals /= np.linalg.norm(face_normals,axis=1)[:,None]
    adjacent = [[] for _ in points]
    for i,face in enumerate(faces):
        for v in face:adjacent[v].append(i)
    adjacent = [np.array(a,dtype=np.int32) for a in adjacent]
    threshold = np.cos(np.radians(angle))
    lookup={};out_points=[];out_normals=[];out_indices=[]
    for i,face in enumerate(faces):
        for v in face:
            neighbors = face_normals[adjacent[v]]
            normal = neighbors[neighbors@face_normals[i]>=threshold].sum(axis=0)
            normal /= max(np.linalg.norm(normal),1e-12)
            packed = tuple(np.rint(normal*32767).astype(int))
            key = (int(v),packed)
            if key not in lookup:
                lookup[key]=len(out_points);out_points.append(points[v]);out_normals.append(packed)
            out_indices.append(lookup[key])
    return np.array(out_points),np.array(out_normals,dtype='<i2'),np.array(out_indices).reshape(-1,3)


def convert(path):
    import fast_simplification
    key = model_id(path)
    points,faces,encoding,original = read_stl(path)
    original_bounds = bounds(points)
    base_band = points[points[:,2] <= points[:,2].min()+max(np.ptp(points[:,2])*.035,1e-5)]
    base_bounds = bounds(base_band)
    base_centre = (base_band[:,:2].max(axis=0)+base_band[:,:2].min(axis=0))/2
    if len(faces)>budget(key,path.parent.name):
        points,faces = fast_simplification.simplify(points,faces,target_count=budget(key,path.parent.name),agg=5.0)
    # STL print coordinates use Z up. Keep dimensions in original units; model
    # placement scales footprints separately from authoritative board occupancy.
    points = points[:,[0,2,1]] * [1,1,-1]
    points[:,0]-=base_centre[0]
    points[:,2]+=base_centre[1]
    points[:,1]-=points[:,1].min()
    points,normals,faces = shaded_mesh(points,faces)
    # Quantized indexed data is compact and browser decoding needs no STL loader.
    extent = np.ptp(points,axis=0)
    minimum = points.min(axis=0)
    quant = np.rint((points-minimum)/np.where(extent>0,extent,1)*65535).astype('<u2')
    index_type = '<u2' if len(points)<=65535 else '<u4'
    metadata = {'id':key,'sourceFile':path.relative_to(SOURCE).as_posix(),'encoding':encoding,
        'sourceSha256':hashlib.sha256(path.read_bytes()).hexdigest(),'sourceTriangles':original,
        'triangles':len(faces),'vertices':len(points),'sourceBounds':original_bounds,'sourceBaseBounds':base_bounds,
        'targetTriangles':budget(key,path.parent.name),
        'placementStatus':'Reviewed source orientation' if key in ('barbarian','orc-cleaver','table','closed-door') else 'Unassembled source component; orientation/scale not yet reviewed',
        'minimum':minimum.tolist(),'extent':extent.tolist(),'indexBytes':np.dtype(index_type).itemsize,
        'positions':base64.b64encode(quant.tobytes()).decode(),
        'normals':base64.b64encode(normals.tobytes()).decode(),
        'indices':base64.b64encode(faces.astype(index_type).tobytes()).decode(),
        'geometrySha256':hashlib.sha256(quant.tobytes()+normals.tobytes()+faces.astype(index_type).tobytes()).hexdigest()}
    OUTPUT.mkdir(parents=True,exist_ok=True)
    dest=OUTPUT/(key+'.js')
    dest.write_text('// User-supplied STL derivative. Provenance: catalog.json and ../README.md.\n'
        +'window.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\n'
        +'window.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(metadata,separators=(',',':'))+';\n')
    record={k:v for k,v in metadata.items() if k not in ('positions','normals','indices')}
    record['asset']=dest.relative_to(ROOT).as_posix();record['bytes']=dest.stat().st_size
    print(f'{key}: {original:,} → {len(faces):,} triangles; {dest.stat().st_size:,} bytes',flush=True)
    return record


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory',action='store_true',help='Read source counts/bounds only')
    parser.add_argument('--only',nargs='+',help='Convert specified stable asset IDs')
    args=parser.parse_args()
    sources=sorted(SOURCE.glob('*/*'))
    sources=[p for p in sources if p.suffix.lower()=='.stl']
    if not sources:raise SystemExit('No source STLs under '+str(SOURCE))
    if args.inventory:
        for p in sources:
            points,faces,encoding,original=read_stl(p)
            print(model_id(p),encoding,original,'triangles',json.dumps(bounds(points)),flush=True)
        return
    records=[]
    if (OUTPUT/'catalog.json').exists():records=json.loads((OUTPUT/'catalog.json').read_text())['models']
    for path in sources:
        key=model_id(path)
        if args.only and key not in args.only:continue
        record=convert(path);records=[r for r in records if r['id']!=key];records.append(record)
    (OUTPUT/'catalog.json').write_text(json.dumps({'suppliedOn':'2026-10-21',
        'licenceStatus':'Mark supplied from a shared personal drive and states open licence. Creator and exact licence are unknown; archives include no licence text.',
        'sourceUpAxis':'Z','runtimeUpAxis':'Y','simplifier':'fast-simplification 0.2.0; agg=5',
        'models':sorted(records,key=lambda r:r['id'])},indent=2)+'\n')


if __name__=='__main__':main()
