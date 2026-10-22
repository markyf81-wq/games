"""Assemble and colour the supplied bookcase components, offline (numpy only).

Four shelf inserts are laid out on the source print bed. Translate them into
frame rebates without rescaling/rotating the sculpts. Surface-connected paint
regions follow book spines; source geometry is never edited in place.
"""
from pathlib import Path
import argparse,base64,hashlib,heapq,json,math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCE_GEOMETRY={'bookcase-frame':'8a6221d865e685bced00d69afb20aba136add9bd9ff732922bf0e40150af36f5',
 'bookcase-shelves':'04fff8d8680df4a9d2d0bc4c4532ad2de2ba5d321d518f21c6ef0929f4d08797'}
PALETTE=[
 {'name':'Walnut frame','colour':'#623729','roughness':.8,'metalness':0,'finish':'wood'},
 {'name':'Recessed walnut','colour':'#38291f','roughness':.9,'metalness':0,'finish':'wood'},
 {'name':'Oxide red binding','colour':'#753a32','roughness':.77,'metalness':0},
 {'name':'Forest green binding','colour':'#344c3d','roughness':.8,'metalness':0},
 {'name':'Ochre binding','colour':'#927045','roughness':.8,'metalness':0},
 {'name':'Blue slate binding','colour':'#3b5057','roughness':.82,'metalness':0},
 {'name':'Umber binding','colour':'#514032','roughness':.75,'metalness':0},
 {'name':'Aubergine binding','colour':'#57404d','roughness':.8,'metalness':0},
 {'name':'Old parchment','colour':'#c7b58e','roughness':.96,'metalness':0},
 {'name':'Ivory bone','colour':'#cfc2a3','roughness':.87,'metalness':0},
]
PALETTE += [{**m,'name':m['name']+' spine','finish':'book-spine'} for m in PALETTE[2:8]]

def load(key):
 text=(ROOT/'assets/models/imported'/f'{key}.js').read_text()
 a=json.loads(text.split(f'window.HeroQuest.stlAssets["{key}"] = ',1)[1].rsplit(';',1)[0])
 a['geometrySha256']=hashlib.sha256(b''.join(base64.b64decode(a[k]) for k in ['positions','normals','indices'])).hexdigest()
 if a['geometrySha256']!=SOURCE_GEOMETRY[key]:raise ValueError('Source changed; review bookcase assembly/paint before regenerating: '+key)
 q=np.frombuffer(base64.b64decode(a['positions']),dtype='<u2').reshape(-1,3)
 p=q/65535*np.array(a['extent'])+a['minimum']
 n=np.frombuffer(base64.b64decode(a['normals']),dtype='<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(a['indices']),dtype='<u2' if a['indexBytes']==2 else '<u4').reshape(-1,3)
 return a,p,n,f

def split_height(tris,height):
 """Keep book/plank boundaries on the source surface, with shared cut edges."""
 result=[];above=[]
 for tri in tris:
  for positive in [False,True]:
   poly=[]
   for j in range(3):
    a,b=tri[j-1],tri[j];va=a[1]-height;vb=b[1]-height
    ia=va>0 if positive else va<=0;ib=vb>0 if positive else vb<=0
    if ia!=ib:poly.append(a+(b-a)*(va/(va-vb)))
    if ib:poly.append(b)
   for j in range(1,len(poly)-1):result.append([poly[0],poly[j],poly[j+1]]);above.append(positive)
 return np.array(result),np.array(above)

def content_regions(tris,part):
 p=tris[:,:,:3];centres=p.mean(1)
 cross=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]);area=np.linalg.norm(cross,axis=1)/2
 normals=cross/np.maximum(2*area[:,None],1e-12)
 # Shared shelf planks are not included in the graph. Weld position-only seams
 # for traversal, retaining the original crease normals in the exported mesh.
 _,inv=np.unique(np.round(p.reshape(-1,3),4),axis=0,return_inverse=True)
 faces=inv.reshape(-1,3);edges={};adj=[[] for _ in faces]
 for i,face in enumerate(faces):
  for j in range(3):
   edge=tuple(sorted((face[j-1],face[j])))
   for other in edges.get(edge,[]):adj[i].append(other);adj[other].append(i)
   edges.setdefault(edge,[]).append(i)
 bone=np.zeros(len(tris),bool)
 if part==0:bone=(centres[:,0]>-.4)&(centres[:,0]<11.1)&(centres[:,2]>.7)
 if part==2:bone=(centres[:,0]>-10.5)&(centres[:,0]<1.9)&(centres[:,2]>1.5)&(centres[:,1]<6)
 # Each front-facing spine is a seed. Curved side faces inherit its label by
 # shortest surface distance, with sharp creases resisting colour spread.
 candidates=(normals[:,2]>.8)&(abs(normals[:,1])<.4)&(centres[:,1]>1.7)&~bone
 unseen=set(np.flatnonzero(candidates));groups=[]
 while unseen:
  start=unseen.pop();stack=[start];group=[]
  while stack:
   i=stack.pop();group.append(i)
   for j in adj[i]:
    if j in unseen:unseen.remove(j);stack.append(j)
  if area[group].sum()>1.1:groups.append(group)
 groups.sort(key=lambda g:(round(np.average(centres[g,2],weights=area[g])/5),np.average(centres[g,0],weights=area[g])))
 costs=np.full(len(tris),np.inf);labels=np.full(len(tris),-1,dtype=int);queue=[]
 for label,group in enumerate(groups):
  for i in group:costs[i]=0;labels[i]=label;heapq.heappush(queue,(0,i))
 while queue:
  cost,i=heapq.heappop(queue)
  if cost>costs[i]:continue
  for j in adj[i]:
   if bone[j]:continue
   step=np.linalg.norm(centres[i]-centres[j])*(1+4*(1-np.clip(normals[i]@normals[j],-1,1)))
   distance=cost+step
   if distance<costs[j]:costs[j]=distance;labels[j]=labels[i];heapq.heappush(queue,(distance,j))
 # Hidden isolated caps inherit the nearest authored spine; this is offline.
 missing=np.flatnonzero((labels<0)&~bone)
 seed=np.array([np.average(centres[g],axis=0,weights=area[g]) for g in groups])
 if len(missing):labels[missing]=np.argmin(((centres[missing,None]-seed[None])**2).sum(2),axis=1)
 choices=[]
 for label in range(len(groups)):
  colour=(((label+1)*2654435761)^((part+1)*2246822519))%6
  if choices and colour==choices[-1]:colour=(colour+2)%6
  choices.append(colour)
 choices=np.array(choices);colours=2+choices[np.maximum(labels,0)]
 uvs=wood_uvs(tris)
 for label,group in enumerate(groups):
  region=labels==label
  # Pages on the top edge of upright books; lying books keep their covers.
  spine=p[group].reshape(-1,3);size=np.ptp(spine,axis=0)
  upright=size[1]>size[0]*1.15
  # Fit the UV frame to the spine's lean, rather than painting vertical bands
  # across the whole shelf. The covers retain their own untextured material.
  xaxis,yaxis=(0,1) if upright else (1,0)
  slope=np.cov(spine[:,xaxis],spine[:,yaxis])[0,1]/max(np.var(spine[:,yaxis],ddof=1),1e-8)
  across=spine[:,xaxis]-slope*spine[:,yaxis]
  width=max(np.ptp(across),.25);height=max(size[yaxis],.25)
  use=region&(normals[:,2]>.5)
  uvs[use,:,0]=(p[use,:,xaxis]-slope*p[use,:,yaxis]-across.min())/width
  uvs[use,:,1]=(p[use,:,yaxis]-spine[:,yaxis].min())/height
  colours[use]=10+choices[label]
  if upright:
   top=(normals[:,1]>.65)&region
   colours[top]=8
  else:
   colours[region&(abs(normals[:,0])>.8)]=8
 colours[bone]=9
 # Decimation leaves a few broad plank triangles slightly above 1.42 mm.
 # Their nearly horizontal faces are wood, including beneath the skulls.
 colours[(centres[:,1]<1.8)&(normals[:,1]>.97)]=0
 return colours.astype(np.uint8),uvs,len(groups)

def wood_uvs(tris):
 p=tris[:,:,:3];cross=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]);axis=np.argmax(abs(cross),axis=1)
 uv=p[:,:,[0,1]].copy()
 uv[axis==0]=p[axis==0][:,:,[2,1]]
 uv[axis==1]=p[axis==1][:,:,[0,2]]
 return uv*np.array([.075,.025])

def build():
 frame,p,n,f=load('bookcase-frame');shelves,s,sn,sf=load('bookcase-shelves')
 triangles=[np.concatenate([p,n],axis=1)[f]];labels=[np.zeros(len(f),np.uint8)];uvs=[wood_uvs(triangles[0])]
 for part,z in enumerate([-37.5,-12.5,12.5,37.5]):
  mask=abs(s[sf].mean(1)[:,2]-z)<10
  tri=np.concatenate([s,sn],axis=1)[sf[mask]].copy();tri[:,:,2]-=z
  # The quantized plank top is ~1.400 mm. Leave a 0.02 mm tolerance so its
  # upward faces cannot be mistaken for parchment between the books.
  tri,above=split_height(tri,1.42)
  paint=np.zeros(len(tri),np.uint8);uv=wood_uvs(tri);paint[above],uv[above],count=content_regions(tri[above],part)
  print('Shelf',part+1,':',count,'spine regions')
  # Source shelf support ledges are 9.1333 mm apart, their first top at 4.57.
  tri[:,:,1]+=3.1667+part*9.1333;tri[:,:,2]+=1.37
  triangles.append(tri);labels.append(paint);uvs.append(uv)
 tris=np.concatenate(triangles);colours=np.concatenate(labels);uv=np.concatenate(uvs)
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-9
 tris=tris[keep];colours=colours[keep];uv=uv[keep]
 # Deduplicate matching position+normal pairs; retain sharp creases.
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),6),axis=0,return_inverse=True)
 points=unique[:,:3];normals=unique[:,3:6];normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-12)
 minimum=points.min(0);extent=np.ptp(points,axis=0)
 quant=np.rint((points-minimum)/extent*65535).astype('<u2');packed_n=np.rint(np.clip(normals,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2' if len(points)<=65535 else '<u4')
 b64=lambda b:base64.b64encode(b.tobytes()).decode()
 data={'id':'bookcase','sourceFile':'Furniture/Bookcase_NoShelf_Full_Textured.stl + Bookcase_OnlyShelf.stl',
  'sources':[{'id':a['id'],'sourceSha256':a['sourceSha256'],'geometrySha256':a['geometrySha256']} for a in [frame,shelves]],
  'vertices':len(points),'triangles':len(faces),'minimum':minimum.tolist(),'extent':extent.tolist(),
  'indexBytes':faces.dtype.itemsize,'positions':b64(quant),'normals':b64(packed_n),'indices':b64(faces),
  'uvs':b64(unique[:,6:8].astype('<f4')),
  'geometrySha256':hashlib.sha256(quant.tobytes()+packed_n.tobytes()+faces.tobytes()).hexdigest(),
  'materials':PALETTE,'faceMaterials':b64(colours),
  'assembly':{'shelfPrintCentres':[-37.5,-12.5,12.5,37.5],'firstShelfY':3.1667,'shelfPitch':9.1333,'shelfZ':1.37}}
 out=ROOT/'assets/models/bookcase/bookcase.js';out.parent.mkdir(parents=True,exist_ok=True)
 out.write_text('// Assembled supplied STL + authored paint. Recipe: scripts/prepare_bookcase.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets["bookcase"] = '+json.dumps(data,separators=(',',':'))+';\n')
 print('Prepared',len(faces),'triangles;',out.stat().st_size,'bytes')
 if ARGS.preview:preview(points,faces,colours)

def preview(p,f,labels):
 from PIL import Image,ImageDraw
 im=Image.new('RGB',(1600,1100),(33,38,40));d=ImageDraw.Draw(im)
 colours=np.array([tuple(bytes.fromhex(m['colour'][1:])) for m in PALETTE]);tri=p[f]
 norm=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12)
 light=np.array([-.4,.65,.65]);light/=np.linalg.norm(light);lum=.4+.6*np.maximum(norm@light,0)
 for j,(yaw,el) in enumerate([(0,.12),(.8,.4),(math.pi,.2),(-1.4,.7)]):
  forward=np.array([math.sin(yaw)*math.cos(el),math.sin(el),math.cos(yaw)*math.cos(el)])
  right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(forward,right)
  uv=p@np.stack([right,up],axis=1);depth=p@forward;scale=min(740/np.ptp(uv,axis=0)[0],480/np.ptp(uv,axis=0)[1]);uv=(uv-(uv.max(0)+uv.min(0))/2)*[scale,-scale]+[(j%2)*800+400,(j//2)*550+275]
  for i in np.argsort(depth[f].mean(1)):d.polygon([tuple(v) for v in uv[f[i]]],fill=tuple((colours[labels[i]]*lum[i]).astype(int)))
 im.save(ROOT/'tmp/bookcase-painted-authoring.png')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');ARGS=parser.parse_args();build()
