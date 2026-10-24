"""Prepare the Wizard from Mark's source-fingerprinted model-painter export.

Offline only: fill unmarked gaps over surface adjacency, soften coarse brush
boundaries, locally lift the low lip relief, and pack batched materials.
Requires numpy; --preview additionally uses Pillow.
"""
from pathlib import Path
import argparse,base64,hashlib,heapq,json
import numpy as np
from paint_furniture import cut
from paint_barbarian import pack
ROOT=Path(__file__).resolve().parents[1]
REGIONS=ROOT/'scripts/paint-regions/wizard.json'
SOURCE='323d3c8b1886db866a09d99d55c3d3a13b9a955e4147e585caf44173ea0ec77f'
# Mark used export colours only to identify regions; finishes are authored here.
FINISHES={'Skin':'#d1a381','Hair':'#967b50','Cloak':'#513858',
 'Tunic':'#dbd1b9','Trousers':'#3f5d69','Leather':'#49372d',
 'Metal':'#b79855','Wood':'#64432f','Base':'#35383b',
 'White':'#ded8c7','Red':'#8c263c','Black':'#3977a6'}


def load():
 text=(ROOT/'assets/models/imported/wizard.js').read_text()
 asset=json.loads(text.split('window.HeroQuest.stlAssets["wizard"] = ',1)[1].rsplit(';',1)[0])
 digest=hashlib.sha256(b''.join(base64.b64decode(asset[k])for k in ['positions','normals','indices'])).hexdigest()
 if digest!=SOURCE:raise ValueError('Wizard source changed; repaint against the matching sculpt.')
 p=np.frombuffer(base64.b64decode(asset['positions']),'<u2').reshape(-1,3)/65535*np.array(asset['extent'])+asset['minimum']
 n=np.frombuffer(base64.b64decode(asset['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(asset['indices']),'<u2'if asset['indexBytes']==2 else '<u4').reshape(-1,3)
 return asset,p[:,[2,1,0]]*[1,1,-1],n[:,[2,1,0]]*[1,1,-1],f


def markings(asset):
 data=json.loads(REGIONS.read_text())
 if (data.get('kind'),data.get('version'),data.get('model'))!=('heroquest-model-paint-regions',1,'wizard'):
  raise ValueError('Expected a Wizard model-painter version 1 export.')
 if (data.get('geometrySha256'),data.get('vertices'),data.get('triangles'))!=(SOURCE,asset['vertices'],asset['triangles']):
  raise ValueError('Paint export does not match the original Wizard geometry.')
 palette=data.get('palette');labels=data.get('faceRegions')
 if not isinstance(palette,list)or not 1<len(palette)<=64:raise ValueError('Invalid paint palette.')
 for entry in palette:
  colour=entry.get('colour','')
  if not isinstance(entry.get('name'),str)or len(colour)!=7 or not colour.startswith('#'):raise ValueError('Invalid paint material.')
  int(colour[1:],16)
 if not isinstance(labels,list)or len(labels)!=asset['triangles']or any(type(v)is not int or not 0<=v<len(palette)for v in labels):
  raise ValueError('Incomplete paint region map.')
 roughness={'Skin':.68,'Hair':.82,'Cloak':.94,'Tunic':.91,'Trousers':.91,'Leather':.8,'Metal':.36,'Wood':.8,'Base':.9,'White':.55,'Black':.38,'Red':.3}
 materials=[{'name':m['name'],'colour':FINISHES.get(m['name'],m['colour']),'roughness':roughness.get(m['name'],.88),'metalness':.75 if m['name']=='Metal'else 0}for m in palette]
 return np.array(labels,np.uint8),materials


def fill_gaps(p,f,labels):
 """Nearest marked face over shared surface edges, never through the figure."""
 _,weld=np.unique(np.round(p,5),axis=0,return_inverse=True);wf=weld[f]
 edges={};neighbours=[set()for _ in f]
 for face,vertices in enumerate(wf):
  for a,b in zip(vertices,np.roll(vertices,1)):
   edge=tuple(sorted((int(a),int(b))))
   for other in edges.get(edge,[]):neighbours[face].add(other);neighbours[other].add(face)
   edges.setdefault(edge,[]).append(face)
 centres=p[f].mean(1);distance=np.where(labels>0,0.,np.inf);result=labels.copy()
 queue=[(0.,int(i))for i in np.flatnonzero(labels)];heapq.heapify(queue)
 while queue:
  d,i=heapq.heappop(queue)
  if d!=distance[i]:continue
  for j in neighbours[i]:
   candidate=d+float(np.linalg.norm(centres[i]-centres[j]))
   if candidate<distance[j]:distance[j]=candidate;result[j]=result[i];heapq.heappush(queue,(candidate,j))
 if np.any(result==0):raise ValueError('An isolated unmarked surface needs marking before it can be painted.')
 return result,weld


def refine(p,n,f,labels,weld,count,protected):
 """Cut boundary triangles at interpolated region votes; keep source normals.

 Shared corner-angle votes soften brush stair-steps. Each source face centre
 anchors its marked region. Protected small fittings retain their original
 face markings instead of shrinking under majority voting; eyes are cut later.
 """
 scores=np.zeros((weld.max()+1,count));tri=p[f]
 for corner in range(3):
  a=tri[:,(corner+1)%3]-tri[:,corner];b=tri[:,(corner+2)%3]-tri[:,corner]
  cosine=np.einsum('ij,ij->i',a,b)/np.maximum(np.linalg.norm(a,axis=1)*np.linalg.norm(b,axis=1),1e-12)
  angle=np.arccos(np.clip(cosine,-1,1));np.add.at(scores,(weld[f[:,corner]],labels),angle)
 scores/=np.maximum(scores.sum(1,keepdims=True),1e-12)
 # Stable infinitesimal ordering avoids coincident paint polygons at exact ties.
 scores+=np.arange(count)*1e-10
 vertex_scores=scores[weld];protected_vertices=np.unique(weld[f[np.isin(labels,protected)]])
 output=[];colours=[]
 for face,label in zip(f,labels):
  values=vertex_scores[face]
  if np.all(values.argmax(1)==label)or np.isin(weld[face],protected_vertices).any():
   output.append(np.concatenate([p[face],n[face]],1));colours.append(label);continue
  # A face-centre anchor retains deliberate narrow painted details.
  corners=np.concatenate([p[face],n[face],values],1);centre=corners.mean(0)
  centre[6:]*=.25;centre[6+label]+=.75
  for corner in range(3):
   triangle=np.array([corners[corner],corners[(corner+1)%3],centre]);candidates=np.flatnonzero(triangle[:,6:].max(0)>1e-7)
   for material in candidates:
    poly=list(triangle)
    for other in candidates:
     if other==material:continue
     clipped=[]
     for a,b in zip(poly,poly[1:]+poly[:1]):
      da=a[6+material]-a[6+other];db=b[6+material]-b[6+other]
      ia=da>=0;ib=db>=0
      if ia:clipped.append(a)
      if ia!=ib:clipped.append(a+(b-a)*(da/(da-db)))
     poly=clipped
     if len(poly)<3:break
    for j in range(1,len(poly)-1):output.append(np.array([poly[0][:6],poly[j][:6],poly[j+1][:6]]));colours.append(material)
 return np.array(output),np.array(colours,np.uint8)


def eye_centres(p,f,marked,materials):
 """Use Mark's two eye patches as landmarks, then level their iris centres."""
 eye=next(i for i,m in enumerate(materials)if m['name']=='Black')
 tri=p[f[marked==eye]];centres=tri.mean(1)
 areas=np.linalg.norm(np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]),axis=1)
 midpoint=(centres[:,0].min()+centres[:,0].max())/2
 eyes=[np.average(centres[side],axis=0,weights=areas[side])for side in [centres[:,0]<midpoint,centres[:,0]>=midpoint]]
 level=np.mean([eye[1]for eye in eyes])
 return [(eye[0],level)for eye in eyes]


def face_patches(tris,labels,centres,rx,ry,zmin,zmax,passes=3):
 """Subdivide small surface patches, retaining positions/interpolated normals."""
 for _ in range(passes):
  near=np.zeros(len(tris),bool);lo=tris[:,:,:3].min(1);hi=tris[:,:,:3].max(1)
  for x,y in centres:
   near|=(lo[:,0]<x+rx)&(hi[:,0]>x-rx)&(lo[:,1]<y+ry)&(hi[:,1]>y-ry)&(hi[:,2]>zmin)&(lo[:,2]<zmax)
  a,b,c=tris[near].transpose(1,0,2);ab=(a+b)/2;bc=(b+c)/2;ca=(c+a)/2
  pieces=np.concatenate([np.stack(v,axis=1)for v in [(a,ab,ca),(ab,b,bc),(ca,bc,c),(ab,bc,ca)]])
  tris=np.concatenate([tris[~near],pieces]);labels=np.concatenate([labels[~near],np.tile(labels[near],4)])
 return tris,labels


def mouth_lift(q):
 """Compact smooth displacement around the lips; leave nose/eyes/jaw intact."""
 def ramp(value):
  t=np.clip(value,0,1)
  return t*t*(3-2*t)
 x,y,z=q.T
 return .45*ramp((1.45-np.abs(x-1.55))/.8)*ramp((y-24.4)/.55)*ramp((26.2-y)/.85)*ramp((z-.5)/.5)*ramp((2.5-z)/.7)


def raise_mouth(p,n):
 """Lift the source lip relief, transforming its normals with the same warp.

 The immutable source/export still identify all regions. Only the derivative's
 small lower-face patch moves. Finite differences give the displacement gradient;
 its inverse-transpose preserves the authored smooth normals after deformation.
 """
 step=1e-4;gradient=[]
 for axis in np.eye(3)*step:
  gradient.append((mouth_lift(p+axis)-mouth_lift(p-axis))/(2*step))
 dx,dy,dz=gradient;ny=n[:,1]/(1+dy)
 result=n.copy();result[:,0]-=ny*dx;result[:,1]=ny;result[:,2]-=ny*dz
 result/=np.maximum(np.linalg.norm(result,axis=1)[:,None],1e-12)
 lifted=p.copy();lifted[:,1]+=mouth_lift(p)
 return lifted,result


def rounded_eyes(tris,labels,materials,centres):
 """Larger irises sit under relaxed upper lids, avoiding a wide-eyed stare."""
 white=next(i for i,m in enumerate(materials)if m['name']=='White')
 iris=next(i for i,m in enumerate(materials)if m['name']=='Black')
 pupil=len(materials);materials.append({'name':'Eye pupils','colour':'#192b3b','roughness':.4,'metalness':0})
 lid=len(materials);materials.append({'name':'Upper eyelids','colour':'#b28b70','roughness':.7,'metalness':0})
 tris,labels=face_patches(tris,labels,centres,.5,.35,-.35,.55)
 for x,y in centres:
  def ellipse(q,cx,cy,rx,ry):
   return np.minimum.reduce([1-((q[:,0]-cx)/rx)**2-((q[:,1]-cy)/ry)**2,q[:,2]+.35,.55-q[:,2]])
  def opening(q):
   return np.minimum(ellipse(q,x,y,.32,.145),y+.105-.11*((q[:,0]-x)/.32)**2-q[:,1])
  tris,labels=cut(tris,labels,white,opening)
  for material,cx,cy,rx,ry in [(iris,x,y+.015,.205,.205),(pupil,x,y+.015,.07,.07),(white,x-.05,y+.055,.02,.02)]:
   tris,labels=cut(tris,labels,material,lambda q,cx=cx,cy=cy,rx=rx,ry=ry:np.minimum(ellipse(q,cx,cy,rx,ry),opening(q)))
  tris,labels=cut(tris,labels,lid,lambda q:np.minimum.reduce([.3-np.abs(q[:,0]-x),.016-np.abs(q[:,1]-(y+.105-.11*((q[:,0]-x)/.32)**2)),q[:,2]+.35,.55-q[:,2]]))
 return tris,labels


def mouth(tris,labels,materials):
 """Trace the lifted source lip crease, without an oval painted-on mouth."""
 x,y=1.55,25.63
 seam=len(materials);materials.append({'name':'Mouth crease','colour':'#a07861','roughness':.8,'metalness':0})
 tris,labels=face_patches(tris,labels,[(x,y)],.6,.3,.6,2.1)
 def crease(q):
  u=(q[:,0]-x)/.43;line=y+.12*u
  return np.minimum.reduce([1-np.abs(u),.017*np.sqrt(np.maximum(0,1-u*u))-np.abs(q[:,1]-line),q[:,2]-.6,2.1-q[:,2]])
 tris,labels=cut(tris,labels,seam,crease)
 return tris,labels


def build(preview=False):
 asset,p,n,f=load();marked,materials=markings(asset);labels,weld=fill_gaps(p,f,marked)
 centres=eye_centres(p,f,marked,materials)
 p,n=raise_mouth(p,n)
 skin=next(i for i,m in enumerate(materials)if m['name']=='Skin')
 # Replace the angular brush patches with matching small rounded eyes below.
 labels[np.isin(labels,[i for i,m in enumerate(materials)if m['name']in ('White','Black')])]=skin
 protected=[i for i,m in enumerate(materials)if m['name']=='Red']
 triangles,labels=refine(p,n,f,labels,weld,len(materials),protected)
 triangles,labels=rounded_eyes(triangles,labels,materials,centres)
 triangles,labels=mouth(triangles,labels,materials)
 # The raised staff-end fitting is a bronze ferrule, separate from its shaft.
 metal=next(i for i,m in enumerate(materials)if m['name']=='Metal')
 triangles,labels=cut(triangles,labels,metal,lambda q:np.minimum.reduce([q[:,1]-27.65,29.9-q[:,1],q[:,0]-10,2-q[:,2]]))
 base=next(i for i,m in enumerate(materials)if m['name']=='Base')
 triangles,labels=cut(triangles,labels,base,lambda q:2.025-q[:,1])
 area=np.linalg.norm(np.cross(triangles[:,1,:3]-triangles[:,0,:3],triangles[:,2,:3]-triangles[:,0,:3]),axis=1)
 triangles,labels=triangles[area>1e-10],labels[area>1e-10]
 vertices,indices=np.unique(np.round(triangles.reshape(-1,6),7),axis=0,return_inverse=True)
 p,n=vertices[:,:3],vertices[:,3:];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12);f=indices.reshape(-1,3)
 data={k:v for k,v in asset.items()if k not in ['positions','normals','indices','vertices','triangles','minimum','extent','indexBytes']}
 data.update(pack(p,n,f));data.update(sourceGeometrySha256=SOURCE,inputTriangles=asset['triangles'],materials=materials,faceMaterials=base64.b64encode(labels.tobytes()).decode(),paintRegionsSha256=hashlib.sha256(REGIONS.read_bytes()).hexdigest(),modifications='Mark’s updated model-painter regions; surface-only seam refinement, relaxed blue eyes, locally raised lip relief and a fine mouth crease. See README.md.')
 dest=ROOT/'assets/models/heroes/wizard.js';dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text('// Supplied sculpt, creator/licence unverified; see README.md. Paint: scripts/paint_wizard.py.\nwindow.HeroQuest.stlAssets["wizard"] = '+json.dumps(data,separators=(',',':'))+';\n')
 print('Wizard:',int(np.sum(marked==0)),'gaps filled;',len(f),'triangles;',dest.stat().st_size,'bytes',flush=True)
 if preview:
  import math
  from paint_preview import render
  from PIL import Image,ImageDraw
  (ROOT/'tmp').mkdir(exist_ok=True)
  np.savez(ROOT/'tmp/wizard-painted.npz',p=p,n=n,f=f,labels=labels)
  image=Image.new('RGB',(1600,1600),(221,221,221))
  for i,(name,yaw)in enumerate([('Front',0),('Three-quarter',math.pi/4),('Back',math.pi),('Left',math.pi*1.5)]):
   panel,_,_=render(p,n,f,labels,yaw,.12,(0,18.5,0),41,800,materials=materials)
   image.paste(panel,((i%2)*800,(i//2)*800));ImageDraw.Draw(image).text(((i%2)*800+15,(i//2)*800+15),name,fill='black')
  image.save(ROOT/'assets/previews/wizard-painted.png')
  face=Image.new('RGB',(1800,600),(221,221,221));tri=p[f];head=(tri[:,:,1].min(1)>23)&(tri[:,:,1].max(1)<31)
  for i,yaw in enumerate([-.35,0,.35]):
   panel,_,_=render(p,n,f[head],labels[head],yaw,.02,(1.55,27.05,.1),6.8,600,materials=materials)
   face.paste(panel,(i*600,0))
  face.save(ROOT/'assets/previews/wizard-face-painted.png')
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args();build(args.preview)
