"""Prepare the supplied two-piece tomb with sculpt-aligned stone finishes.

Offline numpy; Pillow only for --preview. Original components stay untouched;
output IDs, assembly source bounds, facing, origin and uniform fitting stay intact.
"""
from pathlib import Path
import argparse,base64,hashlib,json,math
import numpy as np
from paint_furniture import cut
ROOT=Path(__file__).resolve().parents[1]
SOURCES={'tomb-bottom':'966c76b1506a979966b7097e7f2476099c281b355ac420651844ab0108568efd',
 'tomb-top':'72bf13cd596d27de91cbb6b0659df1529fdda5b2afb69190aab62487f4b99900'}
# Keep the full, identical palette in both assets: the compound model shares the
# lower component's cached material array when constructing its upper component.
MATERIALS=[
 {'name':'Weathered limestone','colour':'#989783','roughness':.94,'metalness':0,'finish':'stone'},
 {'name':'Dark carved plinth','colour':'#62685f','roughness':.97,'metalness':0,'finish':'stone'},
 {'name':'Warm bevelled stone','colour':'#aca58e','roughness':.94,'metalness':0,'finish':'stone'},
 {'name':'Recessed green-grey stone','colour':'#4b574f','roughness':.99,'metalness':0,'finish':'stone'},
 {'name':'Pale carved effigy','colour':'#b5b5a2','roughness':.92,'metalness':0,'finish':'stone'},
]

def load(key):
 a=json.loads((ROOT/'assets/models/imported'/f'{key}.js').read_text().split('window.HeroQuest.stlAssets["'+key+'"] = ',1)[1].rsplit(';',1)[0])
 fingerprint=hashlib.sha256(b''.join(base64.b64decode(a[k])for k in ['positions','normals','indices'])).hexdigest()
 if fingerprint!=SOURCES[key]:raise ValueError('Tomb source changed; review paint seams before regenerating '+key)
 p=np.frombuffer(base64.b64decode(a['positions']),'<u2').reshape(-1,3)/65535*np.array(a['extent'])+a['minimum']
 n=np.frombuffer(base64.b64decode(a['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(a['indices']),'<u2' if a['indexBytes']==2 else '<u4').reshape(-1,3)
 return a,np.concatenate([p,n],axis=1)[f]

def regions(key):
 if key=='tomb-bottom':
  def panels(p):
   x,y,z=p.T
   return np.minimum.reduce([y-2.25,13.2-y,np.maximum(12.8-np.abs(x),22.45-np.abs(z))])
  def carvings(p):
   x,y,z=p.T
   sides=np.minimum(np.abs(x)-13.12,19.8-np.abs(z))
   skull=1-(x/2.7)**2-((y-7.85)/2.65)**2
   wings=np.minimum(9.05-np.abs(x),.62-np.abs(y-(10.15-.12*np.abs(x))))
   ends=np.minimum(np.abs(z)-23.98,np.maximum(skull,wings))
   return np.minimum.reduce([np.maximum(sides,ends),y-4.,11.8-y])
  return [(1,lambda p:2.15-p[:,1]),(3,panels),(2,lambda p:p[:,1]-12.5),(0,carvings)]
 def recess(p):
  x,y,z=p.T
  return np.minimum(10.65-np.abs(x),21.15-np.abs(z))
 def effigy(p):
  x,y,z=p.T
  # Trace the complete raised effigy, including armour sides, elbows, leg
  # bevels and toe slopes. Do not use a horizontal height cutoff: that painted
  # lower sides of the same carved figure green in the earlier derivative.
  zs=np.array([-20.45,-19.8,-18.9,-15.2,-13.1,-12.5,-11.5,-10.7,-9.0,-7.0,-5.0,-3.0,-1.0,2.,5.,10.,15.,17.5,20.2,20.8])
  widths=np.array([.25,2.6,3.45,3.6,2.7,4.6,7.2,8.35,8.65,7.6,7.35,7.4,6.15,5.5,5.7,5.6,5.25,5.15,4.95,3.0])
  outline=np.interp(z,zs,widths,left=0,right=0)-np.abs(x)
  return np.minimum.reduce([outline,z+20.45,20.8-z])
 return [(2,lambda p:p[:,1]-.9),(3,recess),(4,effigy)]

def build(key):
 asset,tris=load(key)
 if key=='tomb-top':
  for _ in range(7):
   xyz=tris[:,:,:3];lengths=np.linalg.norm(xyz-np.roll(xyz,1,axis=1),axis=2)
   large=(lengths.max(1)>2.2)&(xyz[:,:,0].min(1)<11)&(xyz[:,:,0].max(1)>-11)
   if not large.any():break
   t=tris[large];a=(t[:,0]+t[:,1])/2;b=(t[:,1]+t[:,2])/2;c=(t[:,2]+t[:,0])/2
   tris=np.concatenate([tris[~large],np.stack([t[:,0],a,c],1),np.stack([a,t[:,1],b],1),np.stack([c,b,t[:,2]],1),np.stack([a,b,c],1)])
 if key=='tomb-bottom':
  # Partition the long side-wall facets at every planar architectural seam
  # before applying their union masks; this keeps frame borders straight.
  for axis,values in [(0,[-13.12,-12.8,-9.7,9.7,12.8,13.12]),(1,[2.15,2.25,4.,11.8,12.5,13.2]),(2,[-23.98,-22.45,-19.8,19.8,22.45,23.98])]:
   for value in values:tris,_=cut(tris,np.zeros(len(tris),np.uint8),0,lambda p,axis=axis,value=value:p[:,axis]-value)
 labels=np.zeros(len(tris),np.uint8)
 for material,field in regions(key):tris,labels=cut(tris,labels,material,field)
 p=tris[:,:,:3];side=np.argmax(np.abs(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])),axis=1)
 uv=p[:,:,[0,2]]*.07;use=side==0;uv[use]=p[use][:,:,[2,1]]*.07
 use=side==2;uv[use]=p[use][:,:,[0,1]]*.07
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),6),axis=0,return_inverse=True)
 p,n=unique[:,:3],unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2'if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode()
 data={k:v for k,v in asset.items()if k not in ['positions','normals','indices','minimum','extent','vertices','triangles','indexBytes','geometrySha256']}
 data.update(sourceGeometrySha256=SOURCES[key],inputTriangles=asset['triangles'],vertices=len(p),triangles=len(faces),minimum=lo.tolist(),extent=extent.tolist(),indexBytes=faces.dtype.itemsize,
  positions=b64(q),normals=b64(normal),indices=b64(faces),uvs=b64(unique[:,6:].astype('<f4')),materials=MATERIALS,faceMaterials=b64(labels),geometrySha256=hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest(),
  placementStatus='Original two-component assembly frame retained; uniformly fitted by existing tomb factory.',modifications='Original prepared surface retained with authored stone paint seam cuts, interpolated normals and physical-axis UVs; no sculpt deformation or assembly movement.')
 dest=ROOT/'assets/models/furniture'/f'{key}.js';dest.write_text('// Supplied sculpt; original creator/licence unknown. See TOMB.md. Paint: scripts/paint_tomb.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(data,separators=(',',':'))+';\n')
 print(key,len(faces),'triangles;',len(p),'vertices;',dest.stat().st_size,'bytes')
 return asset,p,n,faces,labels

def preview(parts):
 from PIL import Image
 chunks=[];lower=parts[0][0]
 centre=lambda a:np.array([(a['sourceBaseBounds']['min'][0]+a['sourceBaseBounds']['max'][0])/2,(a['sourceBaseBounds']['min'][1]+a['sourceBaseBounds']['max'][1])/2])
 a=centre(lower)
 for asset,p,n,faces,labels in parts:
  b=centre(asset);offset=np.array([b[0]-a[0],asset['sourceBounds']['min'][2]-lower['sourceBounds']['min'][2],a[1]-b[1]])
  chunks.append((p+offset,n,faces,labels))
 offset=0;pp=[];nn=[];ff=[];ll=[]
 for p,n,f,l in chunks:pp.append(p);nn.append(n);ff.append(f+offset);ll.append(l);offset+=len(p)
 p,n,faces,labels=np.concatenate(pp),np.concatenate(nn),np.concatenate(ff),np.concatenate(ll)
 im=Image.new('RGB',(1800,1400),(33,38,40));colours=np.array([tuple(bytes.fromhex(m['colour'][1:]))for m in MATERIALS]);light=np.array([-.4,.65,.65]);light/=np.linalg.norm(light)
 for j,(yaw,el)in enumerate([(.75,.58),(-.7,.9),(math.pi-.6,.58),(0,1.52)]):
  forward=np.array([math.sin(yaw)*math.cos(el),math.sin(el),math.cos(yaw)*math.cos(el)]);right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(forward,right)
  uv=p@np.stack([right,up],1);depth=p@forward;scale=min(820/np.ptp(uv,axis=0)[0],615/np.ptp(uv,axis=0)[1]);uv=(uv-(uv.max(0)+uv.min(0))/2)*[scale,-scale]+[450,350]
  pixels=np.full((700,900,3),(33,38,40),np.uint8);zbuffer=np.full((700,900),-np.inf)
  for i,face in enumerate(faces):
   v=uv[face];lo=np.maximum(np.floor(v.min(0)).astype(int),0);hi=np.minimum(np.ceil(v.max(0)).astype(int),[899,699])
   if np.any(hi<lo):continue
   a,b,c=v;den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
   if abs(den)<1e-9:continue
   xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
   u=((xx-a[0])*(c[1]-a[1])-(yy-a[1])*(c[0]-a[0]))/den;vv=((b[0]-a[0])*(yy-a[1])-(b[1]-a[1])*(xx-a[0]))/den;w=1-u-vv
   z=w*depth[face[0]]+u*depth[face[1]]+vv*depth[face[2]];old=zbuffer[lo[1]:hi[1]+1,lo[0]:hi[0]+1];visible=(u>=0)&(vv>=0)&(w>=0)&(z>old)
   if not visible.any():continue
   old[visible]=z[visible];normal=w[:,:,None]*n[face[0]]+u[:,:,None]*n[face[1]]+vv[:,:,None]*n[face[2]]
   normal/=np.maximum(np.linalg.norm(normal,axis=2)[:,:,None],1e-12);shade=.38+.62*np.maximum(normal@light,0)
   block=pixels[lo[1]:hi[1]+1,lo[0]:hi[0]+1];block[visible]=(colours[labels[i]]*shade[:,:,None])[visible].astype(np.uint8)
  im.paste(Image.fromarray(pixels),((j%2)*900,(j//2)*700))
 dest=ROOT/'assets/previews/tomb-painted.png';im.save(dest);print('Offline assembled artwork:',dest)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args();parts=[build(key)for key in SOURCES]
 if args.preview:preview(parts)
