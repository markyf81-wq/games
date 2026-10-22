"""Offline sculpt-aligned doors, cupboard and blocked-passage finishes.

Requires numpy; --preview also needs Pillow. Original imports/STLs stay intact.
Seam cuts interpolate source normals without moving the surface or fitting frame.
"""
from pathlib import Path
import argparse,base64,hashlib,json
import numpy as np
from paint_furniture import cut
import paint_workshop as workshop
ROOT=Path(__file__).resolve().parents[1]
SOURCES={
 'closed-door':'d0e9dbd4d7d3738988093ca2446858282b5d7fbc795d8508ca6f3f56b5c9f3b4',
 'open-door':'4cdab3920f0690b145f4c186d9c18066d3f2232faac6b6147252fb8abb1115bf',
 'cupboard':'ff07fb91881c51162c394731395a704fa18a711ed071b638eb656ad6b863b9b8',
 'blocked-1x1':'24c597ef538c13f02773add89c939c5b0a48603d2262dfa95bbc46e1b5589d76',
 'blocked-2x1':'28366b6a20a14c24a9ec1cda6e86e5993b70bb6ca0ac0a5b3d3f364d736773b4'}
MATERIALS=[
 {'name':'Warm walnut panels','colour':'#784633','roughness':.84,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Dark walnut frame','colour':'#4f3024','roughness':.88,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Forged iron fittings','colour':'#30383a','roughness':.54,'metalness':.72},
 {'name':'Old ivory skull','colour':'#d1c4a3','roughness':.88,'metalness':0},
 {'name':'Charcoal display base','colour':'#35383b','roughness':.94,'metalness':0},
 {'name':'Dark stone joints','colour':'#57584f','roughness':.99,'metalness':0,'finish':'stone'},
 {'name':'Warm grey limestone','colour':'#97917d','roughness':.94,'metalness':0,'finish':'stone'},
 {'name':'Varied limestone','colour':'#aaa38e','roughness':.95,'metalness':0,'finish':'stone','vertexColours':True},
 {'name':'Darker limestone','colour':'#817e70','roughness':.96,'metalness':0,'finish':'stone'},
 {'name':'Muted sandstone','colour':'#9b8b72','roughness':.95,'metalness':0,'finish':'stone'}]

def load(key):
 a=json.loads((ROOT/'assets/models/imported'/f'{key}.js').read_text().split('window.HeroQuest.stlAssets["'+key+'"] = ',1)[1].rsplit(';',1)[0])
 digest=hashlib.sha256(b''.join(base64.b64decode(a[k])for k in ['positions','normals','indices'])).hexdigest()
 if digest!=SOURCES[key]:raise ValueError('Source changed; review paint seams before regenerating '+key)
 p=np.frombuffer(base64.b64decode(a['positions']),'<u2').reshape(-1,3)/65535*np.array(a['extent'])+a['minimum']
 n=np.frombuffer(base64.b64decode(a['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(a['indices']),'<u2'if a['indexBytes']==2 else '<u4').reshape(-1,3)
 return a,np.concatenate([p,n],axis=1)[f]

def door_leaf(p):
 x,y,z=p.T
 # The inset leaf follows the arch, rather than a rectangular paint patch.
 cap=np.maximum(35.45-y,1-(x/8.92)**2-((y-35.45)/9.0)**2)
 return np.minimum.reduce([8.92-np.abs(x),y-5.7,cap])

def fields(key):
 if key in ['closed-door','open-door']:
  result=[(4,lambda p:15.05-p[:,1])]
  if key=='closed-door':
   def hardware(p):
    x,y,z=p.T
    strap=np.minimum(8.5-np.abs(x),np.maximum(.69-np.abs(y-15.9),.69-np.abs(y-31.35)))
    curls=np.minimum.reduce([np.maximum(1.85-np.abs(x+6.2),1.85-np.abs(x-2.2)),np.maximum(2.35-np.abs(y-15.9),2.35-np.abs(y-31.35))])
    ring=1.65-np.hypot(x-6.65,y-22.6)
    depth=np.where(z>=0,z-1.69,-z-1.92)
    return np.minimum.reduce([door_leaf(p),np.maximum.reduce([strap,curls,ring]),depth])
   result.extend([(0,door_leaf),(2,hardware)])
  return result
 if key=='cupboard':
  def panels(p):
   x,y,z=p.T
   return z-9.25
  def fittings(p):
   x,y,z=p.T
   hinge=np.minimum.reduce([27.25-np.abs(x),np.maximum(1.74-np.abs(y-10.66),1.74-np.abs(y-25.65))])
   ring=np.maximum.reduce([2.25-np.hypot(x-c,y-17.15)for c in [-17.1,-10.9,10.9,17.1]])
   mount=np.minimum.reduce([np.maximum.reduce([.8-np.abs(x-c)for c in [-17.1,-10.9,10.9,17.1]]),y-17.,20.-y])
   return np.minimum(np.maximum.reduce([hinge,ring,mount]),z-10.04)
  def skull(p):
   x,y,z=p.T
   # Follow the dome, cheekbones and narrow jaw of the raised central carving.
   head=1-(x/2.02)**2-((y-35.1)/2.87)**2
   jaw=np.minimum.reduce([1.16-np.abs(x),y-31.8,35.-y])
   return np.minimum(np.maximum(head,jaw),z-10.04)
  return [(0,panels),(1,lambda p:3.35-p[:,1]),(1,lambda p:p[:,1]-40.75),
          (1,lambda p:np.abs(p[:,0])-26.),(2,fittings),(3,skull)]
 # Keep the moulded rim charcoal; only the raised rubble is stone.
 return [(5,lambda p:np.minimum.reduce([10.37-np.abs(p[:,2]),(22.0 if key=='blocked-2x1'else 10.4)-np.abs(p[:,0]),p[:,1]-2.72])),
         (6,lambda p:np.minimum.reduce([10.35-np.abs(p[:,2]),(21.8 if key=='blocked-2x1'else 10.35)-np.abs(p[:,0]),p[:,1]-3.04]))]

def stone_tints(key,p):
 # Smooth source-space tints avoid jagged material boundaries across a block.
 # Palette multipliers are linear-light values, packed as sRGB vertex colours.
 x,y,z=p.T
 if key in ['closed-door','open-door']:
  phase=y*.66+np.sin(x*.22)*1.9
  weight=(np.sin(phase)+np.sin(x*.47-y*.13)*.45)/2.9+.5
 else:
  phase=x*.49+np.sin(z*.48)*1.4
  weight=(np.sin(phase)+np.cos(z*.75-x*.22)*.5)/3.+.5
 warm=(np.sin(x*.24+z*.33+y*.12)+1)*.5
 grey=.76+.23*weight
 linear=np.stack([grey*(.98+.02*warm),grey*(.98+.02*(1-warm)),grey*(.94+.04*(1-warm))],axis=1)
 return np.rint((1.055*np.power(linear,1/2.4)-.055)*255).astype(np.uint8)

def build(key,art=False):
 asset,tris=load(key);labels=np.full(len(tris),1 if key=='cupboard'else 4 if key.startswith('blocked')else 6,np.uint8)
 # Partition long, flat faces at box edges before the compound masks; a face
 # can cross a narrow paint region without any of its original corners in it.
 planes={0:[-26.,26.],1:[3.35,40.75],2:[9.25]}if key=='cupboard'else {0:[-10.4,10.4]if key=='blocked-1x1'else [-22.,22.],1:[2.72,3.04],2:[-10.37,10.37]}if key.startswith('blocked')else {}
 for axis,values in planes.items():
  for value in values:tris,labels=cut(tris,labels,int(labels[0]),lambda p,axis=axis,value=value:p[:,axis]-value)
 for material,field in fields(key):tris,labels=cut(tris,labels,material,field)
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-9
 tris,labels=tris[keep],labels[keep];labels[labels==6]=7
 p=tris[:,:,:3];c=p.mean(1);side=np.argmax(np.abs(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])),axis=1)
 uv=p[:,:,[0,1]]*np.array([.12,.055]);use=side==0;uv[use]=p[use][:,:,[2,1]]*np.array([.12,.055]);use=side==1;uv[use]=p[use][:,:,[0,2]]*.08
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),7),axis=0,return_inverse=True)
 p,n=unique[:,:3],unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2'if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode();used=np.unique(labels);packed=np.searchsorted(used,labels).astype(np.uint8)
 data={k:v for k,v in asset.items()if k not in ['positions','normals','indices','minimum','extent','vertices','triangles','indexBytes','geometrySha256']}
 data.update(sourceGeometrySha256=SOURCES[key],inputTriangles=asset['triangles'],vertices=len(p),triangles=len(faces),minimum=lo.tolist(),extent=extent.tolist(),indexBytes=faces.dtype.itemsize,positions=b64(q),normals=b64(normal),indices=b64(faces),uvs=b64(unique[:,6:].astype('<f4')),colours=b64(stone_tints(key,p)),materials=[MATERIALS[int(i)]for i in used],faceMaterials=b64(packed),geometrySha256=hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest(),modifications='Authored paint seams and physical-axis UVs; original sculpt frame/surface retained. See SCENERY.md.')
 dest=ROOT/'assets/models/furniture'/f'{key}.js';dest.write_text('// Supplied sculpt; creator/licence unknown. See SCENERY.md. Paint: scripts/paint_scenery.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(data,separators=(',',':'))+';\n')
 print(key,len(faces),'triangles;',len(p),'vertices;',dest.stat().st_size,'bytes',flush=True)
 if art:
  workshop.MATERIALS=MATERIALS
  workshop.preview(key,p,n,faces,labels,stone_tints(key,p))

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',nargs='+',choices=list(SOURCES),default=list(SOURCES));parser.add_argument('--preview',action='store_true');args=parser.parse_args()
 for key in args.only:build(key,args.preview)
