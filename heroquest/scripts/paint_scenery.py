"""Offline sculpt-aligned doors, cupboard and blocked-passage finishes.

Requires numpy; --preview also needs Pillow. Original imports/STLs stay intact.
Seam cuts interpolate source normals without moving the surface or fitting frame.
"""
from pathlib import Path
import argparse,base64,hashlib,heapq,json
from functools import lru_cache
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
  # Match the lower plinth to the arch's limestone instead of a display base.
  result=[(6,lambda p:15.05-p[:,1])]
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

def door_stone_tints(key,p,faces):
 # Separate the raised stone faces above the sculpt's recessed joints. Welding
 # positions here joins normal/UV duplicates without changing runtime geometry.
 points,welded=np.unique(np.round(p,4),axis=0,return_inverse=True)
 # The legs thicken toward the plinth. Follow that profile so the lower
 # stones do not merge into one seed island and receive one uniform colour.
 threshold=1.95+np.clip(35-points[:,1],0,20)*.035
 parent=np.arange(len(points));raised=(np.abs(points[:,2])>threshold)&(points[:,1]>15.05)
 if key=='closed-door':raised&=door_leaf(points)<0
 def root(i):
  while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
  return i
 for face in welded[faces]:
  for a,b in [(face[0],face[1]),(face[1],face[2]),(face[2],face[0])]:
   if raised[a] and raised[b] and points[a,2]*points[b,2]>0:parent[root(a)]=root(b)
 ids=np.array([root(i) for i in range(len(points))]);islands,counts=np.unique(ids[raised],return_counts=True)
 # Arches retain more whole-stone character than the near-uniform walls, while
 # staying within the same dark grey family rather than multicoloured bricks.
 palette=np.array([[.88,.91,.96],[1.08,1.04,.97],[.96,.98,.95],[.86,.85,.83],[1.13,1.11,1.06],[1.,1.,1.02]])
 srgb=np.array([126,121,110])/255
 base=np.where(srgb<=.04045,srgb/12.92,((srgb+.055)/1.055)**2.4)
 linear=np.tile(base,(len(points),1));tones={};owner=np.full(len(points),-1);distance=np.full(len(points),np.inf);queue=[]
 stones=[]
 for island,count in zip(islands,counts):
  if count>=18:
   mask=raised&(ids==island);centre=points[mask].mean(0);x,y,z=centre
   progress=y-15.05 if y<35.45 and x<0 else 20.4+np.pi*12+35.45-y if y<35.45 else 20.4+(np.pi-np.arctan2(y-35.45,x))*12
   stones.append((z>0,progress,int(island),mask,centre))
 for order,(_,_,island,mask,centre) in enumerate(sorted(stones,key=lambda stone:stone[:2])):
  seed=int(round((centre[0]+16)*137+(centre[1]+1)*311))
  hashed=(seed*2654435761)&0xffffffff
  tones[island]=base*palette[[4,0,2,3,1,5][order%len(palette)]]*(.96+((hashed>>8)%1000)/999*.08)
  for i in np.flatnonzero(mask):owner[i]=island;distance[i]=0;heapq.heappush(queue,(0,int(i)))
 # Colour the complete stone surface, rather than just the small raised tips.
 # Surface-distance propagation meets in recessed seams; it cannot jump across
 # the open doorway or through a wooden leaf to an unrelated stone.
 allowed=points[:,1]>15.05
 if key=='closed-door':allowed&=door_leaf(points)<0
 neighbors=[{} for _ in points]
 for face in welded[faces]:
  for a,b in [(face[0],face[1]),(face[1],face[2]),(face[2],face[0])]:
   if allowed[a] and allowed[b]:
    length=float(np.linalg.norm(points[a]-points[b]));neighbors[a][b]=length;neighbors[b][a]=length
 while queue:
  travelled,a=heapq.heappop(queue)
  if travelled!=distance[a]:continue
  for b,length in neighbors[a].items():
   candidate=travelled+length
   if candidate<distance[b]:distance[b]=candidate;owner[b]=owner[a];heapq.heappush(queue,(candidate,int(b)))
 for island,tone in tones.items():linear[owner==island]=tone
 linear=linear[welded]
 return np.rint(np.clip(1.055*np.power(linear,1/2.4)-.055,0,1)*255).astype(np.uint8)

def stone_tints(key,p,faces=None):
 if key=='open-door':return door_stone_tints(key,p,faces)
 if key=='closed-door':
  # Both derivatives contain the exact same arch/base surface. Reuse its
  # canonical vertex paint, rather than reseeding colours around a wooden leaf.
  shared=door_stone_colours()
  return np.array([shared.get(tuple(point),(126,121,110))for point in np.round(p,4)],np.uint8)
 # Smooth source-space tints avoid jagged material boundaries across a block.
 # Palette multipliers are linear-light values, packed as sRGB vertex colours.
 x,y,z=p.T
 phase=x*.49+np.sin(z*.48)*1.4
 weight=(np.sin(phase)+np.cos(z*.75-x*.22)*.5)/3.+.5
 warm=(np.sin(x*.24+z*.33+y*.12)+1)*.5
 grey=.76+.23*weight
 linear=np.stack([grey*(.98+.02*warm),grey*(.98+.02*(1-warm)),grey*(.94+.04*(1-warm))],axis=1)
 return np.rint((1.055*np.power(linear,1/2.4)-.055)*255).astype(np.uint8)

def painted_triangles(key):
 asset,tris=load(key);labels=np.full(len(tris),1 if key=='cupboard'else 4 if key.startswith('blocked')else 6,np.uint8)
 # Partition long, flat faces at box edges before the compound masks; a face
 # can cross a narrow paint region without any of its original corners in it.
 planes={0:[-26.,26.],1:[3.35,40.75],2:[9.25]}if key=='cupboard'else {0:[-10.4,10.4]if key=='blocked-1x1'else [-22.,22.],1:[2.72,3.04],2:[-10.37,10.37]}if key.startswith('blocked')else {}
 for axis,values in planes.items():
  for value in values:tris,labels=cut(tris,labels,int(labels[0]),lambda p,axis=axis,value=value:p[:,axis]-value)
 for material,field in fields(key):tris,labels=cut(tris,labels,material,field)
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-9
 tris,labels=tris[keep],labels[keep];labels[labels==6]=7
 return asset,tris,labels

@lru_cache(maxsize=1)
def door_stone_colours():
 _,tris,_=painted_triangles('open-door')
 points,inverse=np.unique(np.round(tris[:,:,:3].reshape(-1,3),7),axis=0,return_inverse=True)
 colours=door_stone_tints('open-door',points,inverse.reshape(-1,3))
 return {tuple(point):colour for point,colour in zip(np.round(points,4),colours)}

def build(key,art=False):
 asset,tris,labels=painted_triangles(key)
 if key=='closed-door':
  # Use one sculpt for the unchanged stonework in both door states. Retain the
  # closed sculpt's authored leaf/iron surfaces, with original imports intact.
  _,stone,stone_labels=painted_triangles('open-door')
  leaf=np.isin(labels,[0,2])
  tris=np.concatenate([stone,tris[leaf]])
  labels=np.concatenate([stone_labels,labels[leaf]])
 p=tris[:,:,:3];c=p.mean(1);side=np.argmax(np.abs(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])),axis=1)
 uv=p[:,:,[0,1]]*np.array([.12,.055]);use=side==0;uv[use]=p[use][:,:,[2,1]]*np.array([.12,.055]);use=side==1;uv[use]=p[use][:,:,[0,2]]*.08
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),7),axis=0,return_inverse=True)
 p,n=unique[:,:3],unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2'if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode();used=np.unique(labels);packed=np.searchsorted(used,labels).astype(np.uint8)
 data={k:v for k,v in asset.items()if k not in ['positions','normals','indices','minimum','extent','vertices','triangles','indexBytes','geometrySha256']}
 tints=stone_tints(key,p,faces)
 materials=[dict(MATERIALS[int(i)])for i in used]
 if key in ['closed-door','open-door']:
  for material in materials:
   if material.get('vertexColours'):material['colour']='#ffffff'
 data.update(sourceGeometrySha256=SOURCES[key],inputTriangles=asset['triangles'],vertices=len(p),triangles=len(faces),minimum=lo.tolist(),extent=extent.tolist(),indexBytes=faces.dtype.itemsize,positions=b64(q),normals=b64(normal),indices=b64(faces),uvs=b64(unique[:,6:].astype('<f4')),colours=b64(tints),materials=materials,faceMaterials=b64(packed),geometrySha256=hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest(),modifications='Authored paint seams and physical-axis UVs; original sculpt frame/surface retained. See SCENERY.md.')
 if key=='closed-door':
  data['sharedStoneGeometrySha256']=SOURCES['open-door']
  data['modifications']='Open-door arch/base with identical vertex paint and UVs, plus closed-door wooden leaf/iron fittings. Original imports intact. See SCENERY.md.'
 dest=ROOT/'assets/models/furniture'/f'{key}.js';dest.write_text('// Supplied sculpt; creator/licence unknown. See SCENERY.md. Paint: scripts/paint_scenery.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(data,separators=(',',':'))+';\n')
 print(key,len(faces),'triangles;',len(p),'vertices;',dest.stat().st_size,'bytes',flush=True)
 if art:
  workshop.MATERIALS=[dict(material)for material in MATERIALS]
  if key in ['closed-door','open-door']:workshop.MATERIALS[7]['colour']='#ffffff'
  workshop.preview(key,p,n,faces,labels,tints)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',nargs='+',choices=list(SOURCES),default=list(SOURCES));parser.add_argument('--preview',action='store_true');args=parser.parse_args()
 for key in args.only:build(key,args.preview)
