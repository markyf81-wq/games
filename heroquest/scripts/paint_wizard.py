"""Prepare the Wizard from Mark's source-fingerprinted model-painter export.

Offline only: fill unmarked gaps over surface adjacency, soften coarse brush
boundaries, and pack batched materials without moving the supplied sculpt.
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
FINISHES={'Skin':'#d1a381','Hair':'#a18050','Cloak':'#4e344f',
 'Tunic':'#d3c9ae','Trousers':'#365766','Leather':'#574234',
 'Metal':'#bda16a','Wood':'#67462f','Base':'#35383b',
 'White':'#d3c9b4','Black':'#29231f'}


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
 roughness={'Skin':.68,'Hair':.82,'Cloak':.94,'Tunic':.91,'Trousers':.91,'Leather':.8,'Metal':.36,'Wood':.8,'Base':.9,'White':.7,'Black':.7}
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
 anchors its marked region. Tiny eye details and their immediate ring retain
 their original face markings instead of shrinking under majority voting.
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


def build(preview=False):
 asset,p,n,f=load();marked,materials=markings(asset);labels,weld=fill_gaps(p,f,marked)
 protected=[i for i,m in enumerate(materials)if m['name']in ('White','Black')]
 triangles,labels=refine(p,n,f,labels,weld,len(materials),protected)
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
 data.update(pack(p,n,f));data.update(sourceGeometrySha256=SOURCE,inputTriangles=asset['triangles'],materials=materials,faceMaterials=base64.b64encode(labels.tobytes()).decode(),paintRegionsSha256=hashlib.sha256(REGIONS.read_bytes()).hexdigest(),modifications='Mark’s model-painter regions; surface-only gap fill and offline seam refinement. See README.md.')
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
if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args();build(args.preview)
