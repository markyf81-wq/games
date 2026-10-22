"""Prepare sculpt-aligned furniture finishes (numpy; Pillow for --preview).

Original imported meshes remain unchanged. Region seams are cut on their source
triangles with interpolated normals; no geometry is moved or generated at play.
"""
from pathlib import Path
import argparse,base64,hashlib,json,math
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
SOURCES={'table':'7f577b758940d998476b0b8b0c88da1c20fc9a95493bef51c6a2dc4945e768fc',
 'chest':'980c903279dda02a442d113177bb8371360a528b1ec9fc8451a0488932b5a4d1',
 'throne':'948edacad1ddca6017491cc682dc4f4a35780942b25840afc68d48e2e5c1b001',
 'fireplace':'5e0b80a1e2342a14be4dcd5c1dc4333ad570cf5bc29a1c92af44d792f796a68e'}
MATERIALS=[
 {'name':'Walnut boards','colour':'#704530','roughness':.82,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Dark walnut rails','colour':'#4f3024','roughness':.86,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Warm walnut lid','colour':'#794b32','roughness':.79,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Forged iron','colour':'#343b3d','roughness':.58,'metalness':.7},
 {'name':'Antique brass clasp','colour':'#b28a47','roughness':.36,'metalness':.78},
 {'name':'Keyhole recess','colour':'#201e1a','roughness':.97,'metalness':0},
 {'name':'Wine-red upholstery','colour':'#862f38','roughness':.94,'metalness':0,'finish':'cloth'},
 {'name':'Warm limestone','colour':'#a28d69','roughness':.94,'metalness':0,'finish':'stone'},
 {'name':'Grey hearth stone','colour':'#67665b','roughness':.97,'metalness':0,'finish':'stone'},
 {'name':'Soot-dark firebox','colour':'#2b2a27','roughness':.99,'metalness':0,'finish':'stone'},
 {'name':'Stone joint recess','colour':'#686353','roughness':.99,'metalness':0},
]

def load(key):
 text=(ROOT/'assets/models/imported'/f'{key}.js').read_text()
 asset=json.loads(text.split(f'window.HeroQuest.stlAssets["{key}"] = ',1)[1].rsplit(';',1)[0])
 fingerprint=hashlib.sha256(b''.join(base64.b64decode(asset[k]) for k in ['positions','normals','indices'])).hexdigest()
 if fingerprint!=SOURCES[key]:raise ValueError('Source changed: review paint seams before regenerating '+key)
 p=np.frombuffer(base64.b64decode(asset['positions']),'<u2').reshape(-1,3)/65535*np.array(asset['extent'])+asset['minimum']
 n=np.frombuffer(base64.b64decode(asset['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(asset['indices']),'<u2' if asset['indexBytes']==2 else '<u4').reshape(-1,3)
 return asset,np.concatenate([p,n],axis=1)[f]

def cut(tris,labels,material,field):
 values=field(tris[:,:,:3].reshape(-1,3)).reshape(-1,3)
 inside=values>=0;whole=inside.all(1);outside=(~inside).all(1)
 # Subdivide a triangle when it encloses a small fitting without a corner in it.
 middle=field(tris[:,:,:3].mean(1))>=0
 enclosed=(whole&~middle)|(outside&middle)
 if enclosed.any():
  centre=tris[enclosed].mean(1)
  pieces=np.concatenate([np.stack([tris[enclosed,i],tris[enclosed,(i+1)%3],centre],axis=1) for i in range(3)])
  tris=np.concatenate([tris[~enclosed],pieces]);labels=np.concatenate([labels[~enclosed],np.tile(labels[enclosed],3)])
  values=field(tris[:,:,:3].reshape(-1,3)).reshape(-1,3);inside=values>=0;whole=inside.all(1);outside=(~inside).all(1)
 keep=whole|outside;kept=labels[keep].copy();kept[whole[keep]]=material
 output=[tris[keep]];colours=[kept]
 for tri,values,old in zip(tris[~keep],values[~keep],labels[~keep]):
  for positive,label in [(True,material),(False,int(old))]:
   poly=[]
   for j in range(3):
    a,b=tri[j-1],tri[j];va,vb=values[j-1],values[j]
    ia=va>=0 if positive else va<0;ib=vb>=0 if positive else vb<0
    if ia!=ib:poly.append(a+(b-a)*(va/(va-vb)))
    if ib:poly.append(b)
   for j in range(1,len(poly)-1):output.append(np.array([[poly[0],poly[j],poly[j+1]]]));colours.append(np.array([label],np.uint8))
 return np.concatenate(output),np.concatenate(colours)

def fields(key):
 if key=='table':
  return [(1,lambda p:12.9-p[:,1]),(1,lambda p:np.abs(p[:,2])-18.35)]
 if key=='throne':
  def back(p):
   x,y,z=p.T
   return np.minimum.reduce([5.05+.045*(y-9)-np.abs(x),y-9.15,25.65-y,z+6.15+.075*(y-9)])
  def seat(p):
   x,y,z=p.T
   return np.minimum.reduce([5.55-np.abs(x),y-7.65,8.55-y,z+5.5,6.25-z])
  def apron(p):
   x,y,z=p.T
   return np.minimum.reduce([4.9+.15*(y-3.35)-np.abs(x),y-3.35,7.15-y,z-7.23])
  def collars(p):
   x,y,z=p.T
   return np.minimum(np.abs(x)-6.1,.16-np.abs(y-26.45))
  return [(1,lambda p:np.maximum(np.abs(p[:,0])-6.2,3-p[:,1])),(6,back),(6,seat),(4,apron),(4,collars)]
 if key=='fireplace':
  def joints(p):
   x,y,z=p.T
   return np.minimum.reduce([z+8,-7.36-z,y-6.5])
  def frame(p):
   x,y,z=p.T
   uprights=np.minimum.reduce([np.abs(x)-11.55,17.35-np.abs(x),y-6.4,35.2-y])
   lintel=np.minimum.reduce([17.8-np.abs(x),y-34.9,40.9-y])
   return np.minimum(np.maximum(uprights,lintel),z+.6)
  def recess(p):
   x,y,z=p.T
   return np.minimum.reduce([11.55-np.abs(x),y-6.4,34.9-y,z+8.05])
  def relief(p):
   x,y,z=p.T
   # The bowed upright plates recede near mid-height; relief sits in front of
   # that curved surface on both sides, rather than a slanted flat threshold.
   columns=np.minimum.reduce([np.abs(x)-12.2,16.9-np.abs(x),y-7.5,33.55-y,z-(.7+.003*(y-20)**2+.17)])
   scroll=np.minimum.reduce([17.65-np.abs(x),y-35.2,40.45-y,z-(1.65+.25*(y-35)+.14)])
   edges=np.minimum.reduce([17.8-np.abs(x),np.maximum(.18-np.abs(y-35),.2-np.abs(y-40.65)),z-1.3])
   return np.maximum.reduce([columns,scroll,edges])
  return [(10,joints),(8,lambda p:6.4-p[:,1]),(3,frame),(9,recess),(4,relief)]
 def straps(p):
  x,y,z=p.T
  arch=np.hypot(y-11.4,z+.35)-7.4
  # Follow both end bands around the curved lid; leave their wooden end panels.
  edge=np.maximum.reduce([np.abs(z+.35)-6.35,1.8-y,arch])
  return np.maximum(np.minimum(np.abs(x)-10.35,edge),np.abs(x)-12.04)
 def handles(p):
  x,y,z=p.T
  handle=np.minimum.reduce([np.abs(x)-11.45,4.15-np.abs(z+.3),y-2.8,8.75-y])
  mounts=np.minimum(np.abs(x)-11.32,1.0-np.hypot(y-7.65,np.abs(z)-4.05))
  return np.maximum(handle,mounts)
 def hinges(p):
  x,y,z=p.T
  # The plain rear rail reaches z=-8.17; only the raised hinge protrudes
  # beyond -8.21. Keep paint off the carved wooden rail behind it.
  return np.minimum.reduce([2.0-np.abs(np.abs(x)-7.65),y-10.05,12.45-y,-8.21-z])
 def clasp(p):
  x,y,z=p.T
  # Bevelled plate outline, traced from the raised front fitting.
  return np.minimum.reduce([1.82-np.abs(x),y-6.02,9.40-y,z-7.05,2.25-np.abs(x)-np.abs(y-7.71)*.4])
 def keyhole(p):
  x,y,z=p.T
  head=.20-np.hypot(x,y-7.80)
  stem=np.minimum(.105-np.abs(x),np.minimum(y-6.92,7.82-y))
  return np.minimum(np.maximum(head,stem),z-7.25)
 return [(2,lambda p:p[:,1]-11.92),(1,lambda p:np.maximum(1.4-p[:,1],np.minimum(11.92-p[:,1],p[:,1]-9.65))),
         (3,straps),(3,handles),(3,hinges),(4,clasp),(5,keyhole)]

def uvs(key,tris):
 p=tris[:,:,:3];c=p.mean(1)
 if key=='table':
  uv=p[:,:,[0,2]]*np.array([.12,.035])
  end=np.abs(c[:,2])>18.35;legs=(c[:,1]<12.9)&~end
  uv[end]=p[end][:,:,[2,0]]*np.array([.12,.055])
  cross=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]);side=np.argmax(abs(cross),axis=1)
  uv[legs]=p[legs][:,:,[0,1]]*np.array([.12,.045])
  use=legs&(side==0);uv[use]=p[use][:,:,[2,1]]*np.array([.12,.045])
 elif key=='chest':
  # Unwrap the barrel's curved front/top/back with grain along its long X axis.
  angle=np.arctan2(p[:,:,1]-11.4,p[:,:,2]+.35)
  uv=np.stack([angle*.7,p[:,:,0]*.06],axis=2)
  body=c[:,1]<11.92;uv[body]=p[body][:,:,[1,0]]*np.array([.1,.06])
  side=np.abs(c[:,0])>11.5;uv[side]=p[side][:,:,[2,1]]*np.array([.12,.055])
 else:
  # Upright wood/fabric and stone faces use their sculpt's physical axes.
  cross=np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0]);side=np.argmax(abs(cross),axis=1)
  uv=p[:,:,[0,1]]*np.array([.13,.065])
  use=side==0;uv[use]=p[use][:,:,[2,1]]*np.array([.13,.065])
  use=side==1;uv[use]=p[use][:,:,[0,2]]*np.array([.13,.065])
 return uv

def build(key,preview=False):
 asset,tris=load(key);labels=np.full(len(tris),7 if key=='fireplace' else 0,np.uint8)
 for material,field in fields(key):tris,labels=cut(tris,labels,material,field)
 if key=='throne':
  # Keep the rear board wooden even where the thin back leans into the mask.
  rear=(labels==6)&(tris[:,:,:3].mean(1)[:,1]>9)&(tris[:,:,5].mean(1)<-.15)
  labels[rear]=0
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-9
 tris=tris[keep];labels=labels[keep];uv=uvs(key,tris)
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),6),axis=0,return_inverse=True)
 p=unique[:,:3];n=unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2' if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode()
 used=np.unique(labels);packed_labels=np.searchsorted(used,labels).astype(np.uint8)
 data={'id':key,'sourceFile':asset['sourceFile'],'sourceSha256':asset['sourceSha256'],'sourceGeometrySha256':SOURCES[key],
  'sourceTriangles':asset['sourceTriangles'],'inputTriangles':asset['triangles'],'vertices':len(p),'triangles':len(faces),'minimum':lo.tolist(),'extent':extent.tolist(),
  'indexBytes':faces.dtype.itemsize,'positions':b64(q),'normals':b64(normal),'indices':b64(faces),'uvs':b64(unique[:,6:].astype('<f4')),
  'geometrySha256':hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest(),
  'materials':[MATERIALS[int(i)] for i in used],'faceMaterials':b64(packed_labels)}
 dest=ROOT/'assets/models/furniture'/f'{key}.js';dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text('// Supplied sculpt + authored paint seams/UVs. Recipe: scripts/paint_furniture.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(data,separators=(',',':'))+';\n')
 print(key,len(faces),'triangles;',dest.stat().st_size,'bytes')
 if preview:draw_preview(key,p,faces,labels)

def draw_preview(key,p,f,labels):
 from PIL import Image,ImageDraw
 im=Image.new('RGB',(1500,1050),(33,38,40));draw=ImageDraw.Draw(im)
 colours=np.array([tuple(bytes.fromhex(m['colour'][1:])) for m in MATERIALS]);t=p[f]
 norm=np.cross(t[:,1]-t[:,0],t[:,2]-t[:,0]);norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12)
 light=np.array([-.4,.65,.65]);light/=np.linalg.norm(light);lum=.4+.6*np.maximum(norm@light,0)
 for j,(yaw,el) in enumerate([(.7,.5),(math.pi/2,.3),(math.pi,.45),(0,1.3)]):
  forward=np.array([math.sin(yaw)*math.cos(el),math.sin(el),math.cos(yaw)*math.cos(el)]);right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(forward,right)
  uv=p@np.stack([right,up],axis=1);depth=p@forward;scale=min(690/np.ptp(uv,axis=0)[0],465/np.ptp(uv,axis=0)[1]);uv=(uv-(uv.max(0)+uv.min(0))/2)*[scale,-scale]+[(j%2)*750+375,(j//2)*525+265]
  for i in np.argsort(depth[f].mean(1)):draw.polygon([tuple(v) for v in uv[f[i]]],fill=tuple((colours[labels[i]]*lum[i]).astype(int)))
 im.save(ROOT/'tmp'/f'{key}-paint-authoring.png')

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',nargs='+',choices=list(SOURCES),default=list(SOURCES));parser.add_argument('--preview',action='store_true');args=parser.parse_args()
 for key in args.only:build(key,args.preview)
