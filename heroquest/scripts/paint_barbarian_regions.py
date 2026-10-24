"""Prepare Mark's Barbarian paint, refined eyes and a straightened sword blade.

Original geometry/export stay immutable. Requires numpy; --preview uses Pillow.
"""
from pathlib import Path
import argparse,base64,hashlib,json
import numpy as np
from paint_barbarian import load,pack,MATERIALS
from paint_wizard import fill_gaps,refine,face_patches
from paint_furniture import cut

ROOT=Path(__file__).resolve().parents[1]
REGIONS=ROOT/'scripts/paint-regions/barbarian.json'
SOURCE='cb53f56b4763856057578024a19ae5bb07ceeb8cb92d29d75e00a50ac6cf650e'


def markings(asset):
    data=json.loads(REGIONS.read_text())
    digest=hashlib.sha256(b''.join(base64.b64decode(asset[key])for key in ['positions','normals','indices'])).hexdigest()
    if (data.get('kind'),data.get('version'),data.get('model'))!=('heroquest-model-paint-regions',1,'barbarian'):
        raise ValueError('Expected a Barbarian model-painter version 1 export.')
    if digest!=SOURCE or (data.get('geometrySha256'),data.get('vertices'),data.get('triangles'))!=(SOURCE,asset['vertices'],asset['triangles']):
        raise ValueError('Paint regions do not match the original Barbarian geometry.')
    palette=data.get('palette');labels=data.get('faceRegions')
    if not isinstance(palette,list)or not 1<len(palette)<=64:raise ValueError('Invalid paint palette.')
    finishes={m['name']:m for m in MATERIALS};materials=[]
    for entry in palette:
        name=entry.get('name');colour=entry.get('colour','')
        if not isinstance(name,str)or not name.strip()or len(name)>50 or len(colour)!=7 or not colour.startswith('#'):raise ValueError('Invalid paint material.')
        int(colour[1:],16);finish=finishes.get(name.lower(),{})
        materials.append({'name':name,'colour':colour,'roughness':finish.get('roughness',.8),'metalness':finish.get('metalness',0)})
    if not isinstance(labels,list)or len(labels)!=asset['triangles']or any(type(value)is not int or not 0<=value<len(palette)for value in labels):
        raise ValueError('Incomplete paint region map.')
    return np.array(labels,np.uint8),materials


def eye_centres(p,f,marked,eye):
    tri=p[f[marked==eye]]
    if len(tri)<2:raise ValueError('Mark both eyes before refining the Barbarian.')
    centres=tri.mean(1);areas=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)
    midpoint=(centres[:,0].min()+centres[:,0].max())/2
    sides=[centres[:,0]<midpoint,centres[:,0]>=midpoint]
    if any(not side.any()for side in sides):raise ValueError('Two separate eye landmarks are required.')
    eyes=[np.average(centres[side],axis=0,weights=areas[side])for side in sides]
    level=np.mean([point[1]for point in eyes])
    return [(point[0],level)for point in eyes]


def soften_face(p,n,f,weld):
    # Blend shading normals only, preserving every vertex and facial feature.
    tri=p[f];face=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);summed=np.zeros((weld.max()+1,3))
    for corner in range(3):np.add.at(summed,weld[f[:,corner]],face)
    average=summed[weld];average/=np.maximum(np.linalg.norm(average,axis=1)[:,None],1e-12)
    x,y,z=p.T
    weight=.35*np.clip((y-25.9)/.6,0,1)*np.clip((30.2-y)/.7,0,1)*np.clip((z-1.3)/.6,0,1)*np.clip((2.4-np.abs(x+.2))/.5,0,1)
    result=n*(1-weight[:,None])+average*weight[:,None]
    return result/np.maximum(np.linalg.norm(result,axis=1)[:,None],1e-12)


def clean_eyes(triangles,labels,materials,centres,eye,white):
    materials[eye].update(colour='#426d86',roughness=.48)
    materials[white].update(colour='#e6dfcf',roughness=.58)
    pupil=len(materials);materials.append({'name':'Eye pupils','colour':'#182a32','roughness':.48,'metalness':0})
    lid=len(materials);materials.append({'name':'Upper eyelids','colour':'#b88564','roughness':.72,'metalness':0})
    triangles,labels=face_patches(triangles,labels,centres,.65,.4,1.5,3.1)
    triangles,labels=face_patches(triangles,labels,centres,.25,.23,1.5,3.1,passes=1)
    for x,y in centres:
        def ellipse(q,cx,cy,rx,ry):
            return np.minimum.reduce([1-((q[:,0]-cx)/rx)**2-((q[:,1]-cy)/ry)**2,q[:,2]-1.5,3.1-q[:,2]])
        def opening(q):
            return np.minimum(ellipse(q,x,y,.46,.17),y+.105-.09*((q[:,0]-x)/.46)**2-q[:,1])
        triangles,labels=cut(triangles,labels,white,opening)
        for material,cx,cy,rx,ry in [(eye,x,y+.005,.17,.17),(pupil,x,y+.005,.065,.065),(white,x-.045,y+.05,.018,.018)]:
            triangles,labels=cut(triangles,labels,material,lambda q,cx=cx,cy=cy,rx=rx,ry=ry:np.minimum(ellipse(q,cx,cy,rx,ry),opening(q)))
        triangles,labels=cut(triangles,labels,lid,lambda q:np.minimum.reduce([.44-np.abs(q[:,0]-x),.015-np.abs(q[:,1]-(y+.105-.09*((q[:,0]-x)/.46)**2)),q[:,2]-1.5,3.1-q[:,2]]))
    return triangles,labels


def straighten_blade(p,n,f,labels,steel):
    # Cross-sections locate the scanned blade's curved centre in both axes.
    # Remove only the nonlinear bend above the guard; keep its root tangent,
    # cross-section detail, grip and the rest of the miniature unchanged.
    start,end=31.5,47.5;levels=np.linspace(start,end,33);centres=[]
    tri=p[f[labels==steel]]
    for y in levels:
        crossings=[]
        for a,b in [(0,1),(1,2),(2,0)]:
            va,vb=tri[:,a],tri[:,b]
            hit=((va[:,1]<y)&(vb[:,1]>=y))|((vb[:,1]<y)&(va[:,1]>=y))
            t=(y-va[hit,1])/(vb[hit,1]-va[hit,1])
            crossings.extend(va[hit]+t[:,None]*(vb[hit]-va[hit]))
        section=np.asarray(crossings)
        if not len(section):raise ValueError('Sword blade cross-section is missing.')
        centres.append((section.min(0)+section.max(0))/2)
    curve=np.polynomial.polynomial.polyfit((levels-start)/(end-start),np.asarray(centres)[:,[0,2]],3)
    blade=np.zeros(len(p),bool);blade[np.unique(f[labels==steel])]=True;blade&=p[:,1]>start
    t=(p[blade,1]-start)/(end-start)
    shift=-(t[:,None]**2*curve[2]+t[:,None]**3*curve[3])
    slope=-(2*t[:,None]*curve[2]+3*t[:,None]**2*curve[3])/(end-start)
    p=p.copy();n=n.copy();p[np.ix_(blade,[0,2])]+=shift
    # Inverse transpose of x'=x+dx(y), z'=z+dz(y).
    n[blade,1]-=np.sum(n[np.ix_(blade,[0,2])]*slope,axis=1)
    n[blade]/=np.maximum(np.linalg.norm(n[blade],axis=1)[:,None],1e-12)
    return p,n


def build(preview=False):
    asset,p,n,f=load();marked,materials=markings(asset)
    ids={m['name'].lower():i for i,m in enumerate(materials)}
    skin,eye,white=ids['skin'],ids['eye'],ids['white']
    centres=eye_centres(p,f,marked,eye);labels,weld=fill_gaps(p,f,marked)
    n=soften_face(p,n,f,weld);labels[np.isin(labels,[eye,white])]=skin
    triangles,labels=refine(p,n,f,labels,weld,len(materials),[ids['bronze']])
    triangles,labels=clean_eyes(triangles,labels,materials,centres,eye,white)
    area=np.linalg.norm(np.cross(triangles[:,1,:3]-triangles[:,0,:3],triangles[:,2,:3]-triangles[:,0,:3]),axis=1)
    triangles,labels=triangles[area>1e-10],labels[area>1e-10]
    vertices,indices=np.unique(np.round(triangles.reshape(-1,6),7),axis=0,return_inverse=True)
    p,n=vertices[:,:3],vertices[:,3:];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12);f=indices.reshape(-1,3)
    p,n=straighten_blade(p,n,f,labels,ids['steel'])
    data={'id':'barbarian','geometrySha256':asset['geometrySha256'],'vertices':asset['vertices'],'triangles':asset['triangles'],
        'materials':materials,'geometry':pack(p,n,f),'faceMaterials':base64.b64encode(labels.tobytes()).decode(),
        'paintRegionsSha256':hashlib.sha256(REGIONS.read_bytes()).hexdigest(),
        'modifications':'Mark’s painter regions; refined seams, balanced relaxed blue eyes, softened facial normals and a locally straightened sword blade with corrected normals. Grip, guard and body pose retained. See heroes/README.md.'}
    destination=ROOT/'assets/models/barbarian-paint.js'
    destination.write_text('// Authored from scripts/paint-regions/barbarian.json by scripts/paint_barbarian_regions.py. Original sculpt: imported/barbarian.js.\nwindow.HeroQuest.barbarianPaint = '+json.dumps(data,separators=(',',':'))+';\n')
    print('Barbarian:',len(f),'triangles;',len(p),'vertices;',len(materials),'materials;',destination.stat().st_size,'bytes',flush=True)
    if preview:
        import math
        from PIL import Image
        from paint_preview import render
        face=Image.new('RGB',(1800,600),(221,221,221));tri=p[f];head=(tri[:,:,1].min(1)>24)&(tri[:,:,1].max(1)<33)
        for i,yaw in enumerate([-.35,0,.35]):
            panel,_,_=render(p,n,f[head],labels[head],yaw,.05,(-.2,28.6,0),7,600,materials=materials);face.paste(panel,(i*600,0))
        face.save(ROOT/'assets/previews/barbarian-face-painted.png')
        whole=Image.new('RGB',(1600,1600),(221,221,221))
        for i,yaw in enumerate([0,math.pi/4,math.pi,math.pi*1.5]):
            panel,_,_=render(p,n,f,labels,yaw,.12,(0,24.5,0),52,800,materials=materials);whole.paste(panel,((i%2)*800,(i//2)*800))
        whole.save(ROOT/'assets/previews/barbarian-painted.png')


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args();build(args.preview)
