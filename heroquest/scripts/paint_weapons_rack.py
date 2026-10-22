"""Paint xbeaker's prepared weapons rack without moving its source surface.

Offline numpy; optional four-angle artwork previews need Pillow. Original STL,
prepared rack and supplied attribution/licence notices remain unchanged.
"""
from pathlib import Path
import argparse,base64,hashlib,json,math
import numpy as np
from paint_furniture import cut
ROOT=Path(__file__).resolve().parents[1]
SOURCE='3bf808e0a26a2a14308a01e9a519e0fe0228a33564379eff5838b1e36568675b'
MATERIALS=[
 {'name':'Walnut rack frame','colour':'#704530','roughness':.83,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Dark walnut feet','colour':'#4f3024','roughness':.88,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Forged iron fittings','colour':'#343b3d','roughness':.58,'metalness':.7},
 {'name':'Honed steel blades','colour':'#a5b0b4','roughness':.32,'metalness':.82},
 {'name':'Worn brass guards and shield edging','colour':'#b28a47','roughness':.39,'metalness':.76},
 {'name':'Dark leather grips','colour':'#493025','roughness':.92,'metalness':0},
 {'name':'Oxblood shield face','colour':'#782b32','roughness':.86,'metalness':0},
 {'name':'Ash pole and shield boards','colour':'#96704b','roughness':.84,'metalness':0,'finish':'wood','grainStrength':.4},
]

def polygon(p,vertices):
 """Signed interior distance for a counter-clockwise convex front outline."""
 area=sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(vertices,vertices[1:]+vertices[:1]))
 if area<0:vertices=vertices[::-1]
 q=p[:,:2];values=[]
 for a,b in zip(vertices,vertices[1:]+vertices[:1]):
  edge=np.array(b)-a;values.append((edge[0]*(q[:,1]-a[1])-edge[1]*(q[:,0]-a[0]))/np.linalg.norm(edge))
 return np.minimum.reduce(values)

def box(p,x0,x1,y0,y1):
 x,y,z=p.T
 return np.minimum.reduce([x-x0,x1-x,y-y0,y1-y])

def weapon_front(p):
 # At the horizontal/diagonal rack boards, retain their original carved wood
 # and put metal only onto surfaces raised in front of the rail's z=2.34 face.
 x,y,z=p.T
 rail=np.maximum.reduce([np.minimum(y-21.25,25.00-y),np.minimum(y-16.55,19.95-y),1.65-np.abs(y-(8.36+.252*x))])
 posts=np.maximum(np.minimum(x+31.05,-23.14-x),np.minimum(x-23.13,30.81-x))
 return np.maximum(-np.maximum(rail,posts),z-2.37)

def regions():
 def front(field):return lambda p:np.minimum(field(p),weapon_front(p))
 def spear(p):
  x,y,z=p.T;axis=-1.5-.168*(y-1.1)
  return np.minimum.reduce([1.05-np.abs(x-axis),y-.6,46.8-y])
 def spearhead(p):
  return box(p,-10.7,-5.9,35.95,47.0)
 def shield(p):
  # Actual heater silhouette: broad shoulders, straight sides, tapered point.
  return np.minimum(polygon(p,[(-35.42,29.9),(-27.8,31.65),(-20.25,29.9),(-20.55,21.3),(-27.2,14.1),(-34.65,21.15)]),p[:,2]-2.38)
 def shield_inner(p):
  return np.minimum(polygon(p,[(-34.6,29.25),(-27.8,30.85),(-21.05,29.25),(-21.35,21.6),(-27.2,15.25),(-33.9,21.6)]),p[:,2]-2.38)
 def shield_cross(p):
  x,y,z=p.T
  # Follow the sculpt's converging vertical and shallow curved cross strokes.
  vertical=.48-np.abs(x-(-27.50+.018*(y-24)))
  horizontal=.43-np.abs(y-(26.90-.012*(x+27.5)**2))
  return np.minimum(shield_inner(p),np.maximum(vertical,horizontal))
 def roundshield(p):
  x,y,z=p.T
  return np.minimum(7.43-np.hypot(x-28.85,y-23.76),z-2.39)
 def round_rim(p):
  x,y,z=p.T
  return np.minimum(roundshield(p),np.hypot(x-28.85,y-23.76)-6.82)
 def round_iron(p):
  x,y,z=p.T
  boss=1.45-np.hypot(x-28.85,y-23.76)
  bands=np.maximum(.27-np.abs(x-28.85),.27-np.abs(y-23.76))
  return np.minimum(roundshield(p),np.maximum(boss,bands))
 def club(p):
  x,y,z=p.T
  axis=8.05+.52*(y-10.)
  return np.minimum.reduce([1.35-np.abs(x-axis),y-9.2,30.8-y])
 def club_wrap(p):
  x,y,z=p.T
  rings=np.max(np.array([.28-np.abs(y-y0) for y0 in [10.65,12.2,13.8,15.35,16.85]]),axis=0)
  return np.minimum(club(p),rings)
 def mace(p):
  handle=polygon(p,[(17.15,31.3),(19.45,31.3),(20.3,27.0),(21.1,17.0),(20.6,13.7),(18.0,13.7),(16.85,27.0)])
  head=box(p,14.5,23.3,8.4,16.15)
  return np.maximum(handle,head)
 def macegrip(p):return np.minimum(mace(p),p[:,1]-20.8)
 # Projected weapon outlines are supplemented by the front-depth mask so paint
 # cannot bleed through onto the carved frame where the meshes were fused.
 return [
  (1,lambda p:1.7-p[:,1]),
  (3,front(lambda p:box(p,-19.4,-15.4,4.6,21.5))),
  (5,front(lambda p:box(p,-18.45,-16.0,22.3,30.7))),
  (4,front(lambda p:box(p,-19.55,-15.35,21.1,22.45))),
  (2,front(lambda p:box(p,-18.5,-16.,29.55,30.9))),
  (7,front(lambda p:box(p,-11.65,-10.0,8.8,30.5))),
  (5,front(lambda p:box(p,-11.7,-9.95,25.6,29.8))),
  (3,front(lambda p:polygon(p,[(-14.5,13.45),(-12.3,11.9),(-6.6,12.9),(-5.75,13.5),(-7.1,9.45),(-11.2,7.25),(-14.8,5.5)]))),
  (7,front(spear)),(3,front(spearhead)),
  (4,front(lambda p:np.minimum(spear(p),np.maximum(.36-np.abs(p[:,1]-35.35),1.7-p[:,1])))),
  (3,front(lambda p:box(p,-1.45,2.8,9.0,30.95))),
  (5,front(lambda p:box(p,-.55,1.15,10.0,24.9))),
  (3,front(lambda p:box(p,4.0,7.7,3.7,25.3))),
  (5,front(lambda p:box(p,5.45,6.35,25.4,30.55))),
  (4,front(lambda p:box(p,4.35,7.4,24.65,25.5))),
  (7,front(club)),(2,front(club_wrap)),
  (2,front(mace)),(5,front(macegrip)),
  (4,front(shield)),(6,front(shield_inner)),(4,front(shield_cross)),
  (7,roundshield),(2,round_rim),(2,round_iron),
 ]

def load():
 path=ROOT/'assets/models/weapons-rack/weapons-rack.js'
 a=json.loads(path.read_text().split('window.HeroQuest.stlAssets["weapons-rack"] = ',1)[1].rsplit(';',1)[0])
 fingerprint=hashlib.sha256(b''.join(base64.b64decode(a[k]) for k in ['positions','normals','indices'])).hexdigest()
 if fingerprint!=SOURCE:raise ValueError('Weapons rack source changed; review the authored paint seams first.')
 p=np.frombuffer(base64.b64decode(a['positions']),'<u2').reshape(-1,3)/65535*np.array(a['extent'])+a['minimum']
 n=np.frombuffer(base64.b64decode(a['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(a['indices']),'<u2' if a['indexBytes']==2 else '<u4').reshape(-1,3)
 return a,np.concatenate([p,n],axis=1)[f]

def build(preview=False):
 asset,tris=load()
 # Split only oversized source facets before cutting nonlinear region fields.
 # This gives narrow relief/cross strokes sample points without moving the skin.
 for _ in range(8):
  lengths=np.linalg.norm(tris[:,:,:3]-np.roll(tris[:,:,:3],1,axis=1),axis=2)
  large=lengths.max(1)>5.0
  if not large.any():break
  t=tris[large];a=(t[:,0]+t[:,1])/2;b=(t[:,1]+t[:,2])/2;c=(t[:,2]+t[:,0])/2
  tris=np.concatenate([tris[~large],np.stack([t[:,0],a,c],1),np.stack([a,t[:,1],b],1),np.stack([c,b,t[:,2]],1),np.stack([a,b,c],1)])
 # The embossed shield cross is narrower than the long source facets.
 for _ in range(8):
  xyz=tris[:,:,:3];lengths=np.linalg.norm(xyz-np.roll(xyz,1,axis=1),axis=2)
  shield=(xyz[:,:,0].min(1)<-20)&(xyz[:,:,1].max(1)>14)&(xyz[:,:,2].max(1)>2.35)
  large=shield&(lengths.max(1)>.9)
  if not large.any():break
  t=tris[large];a=(t[:,0]+t[:,1])/2;b=(t[:,1]+t[:,2])/2;c=(t[:,2]+t[:,0])/2
  tris=np.concatenate([tris[~large],np.stack([t[:,0],a,c],1),np.stack([a,t[:,1],b],1),np.stack([c,b,t[:,2]],1),np.stack([a,b,c],1)])
 labels=np.zeros(len(tris),np.uint8)
 for material,field in regions():tris,labels=cut(tris,labels,material,field)
 centre=tris[:,:,:3].mean(1);x,y,z=centre.T
 # The source fuses weapons into the rails. Their rear-facing rail skin remains
 # wood, while visible free blade backs retain steel. Shield backs are wooden.
 rear=tris[:,:,5].mean(1)<-.05
 rails=np.maximum.reduce([np.minimum(y-21.2,25.05-y),np.minimum(y-16.5,20-y),1.7-np.abs(y-(8.36+.252*x))])>=0
 labels[rear&rails&(z<2.4)]=0
 labels[rear&(x<-20)&np.isin(labels,[4,6])]=0
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-9
 tris,labels=tris[keep],labels[keep];p=tris[:,:,:3];centre=p.mean(1)
 side=np.argmax(np.abs(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])),axis=1)
 uv=p[:,:,[0,1]]*np.array([.11,.055]);use=side==0;uv[use]=p[use][:,:,[2,1]]*np.array([.11,.055])
 use=side==1;uv[use]=p[use][:,:,[0,2]]*np.array([.11,.055])
 # Frame rails and pole use grain along the long sculpted member.
 rails=(labels==0)&(centre[:,1]>2)&(np.abs(centre[:,0])<23)
 uv[rails]=p[rails][:,:,[1,0]]*np.array([.11,.055])
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),6),axis=0,return_inverse=True)
 p,n=unique[:,:3],unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2' if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode()
 data={k:v for k,v in asset.items() if k not in ['positions','normals','indices','minimum','extent','vertices','triangles','indexBytes','geometrySha256']}
 data.update(sourceGeometrySha256=SOURCE,inputTriangles=asset['triangles'],vertices=len(p),triangles=len(faces),minimum=lo.tolist(),extent=extent.tolist(),indexBytes=faces.dtype.itemsize,
  positions=b64(q),normals=b64(normal),indices=b64(faces),uvs=b64(unique[:,6:].astype('<f4')),materials=MATERIALS,faceMaterials=b64(labels),geometrySha256=hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest())
 data['modifications']=asset['modifications'].replace('Initial plain wood colour, detailed paint pending.','')+' Authored seam cuts, interpolated normals, eight material regions and directional UVs; original sculpt positions and footprint preserved.'
 dest=ROOT/'assets/models/furniture/weapons-rack.js'
 dest.write_text('// xbeaker, Thingiverse 4271138; CC BY-NC-SA. See ../weapons-rack/LICENSE.txt and ../weapons-rack/README.txt. Paint recipe: scripts/paint_weapons_rack.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets["weapons-rack"] = '+json.dumps(data,separators=(',',':'))+';\n')
 print('weapons-rack:',len(faces),'triangles;',len(p),'vertices;',dest.stat().st_size,'bytes')
 if preview:
  from PIL import Image
  im=Image.new('RGB',(1800,1400),(33,38,40))
  colours=np.array([tuple(bytes.fromhex(m['colour'][1:])) for m in MATERIALS]);light=np.array([-.4,.65,.65]);light/=np.linalg.norm(light)
  for j,(yaw,el) in enumerate([(.40,.28),(-.7,.4),(math.pi-.4,.3),(0,1.10)]):
   forward=np.array([math.sin(yaw)*math.cos(el),math.sin(el),math.cos(yaw)*math.cos(el)]);right=np.array([math.cos(yaw),0,-math.sin(yaw)]);up=np.cross(forward,right)
   uv=p@np.stack([right,up],axis=1);depth=p@forward;scale=min(825/np.ptp(uv,axis=0)[0],615/np.ptp(uv,axis=0)[1]);uv=(uv-(uv.max(0)+uv.min(0))/2)*[scale,-scale]+[(j%2)*900+450,(j//2)*700+350]
   # A true software depth buffer avoids mean-depth sorting artefacts where
   # the fused source weapons cross the rack's long wooden rail triangles.
   pixels=np.full((700,900,3),(33,38,40),dtype=np.uint8);zbuffer=np.full((700,900),-np.inf)
   local=uv-[j%2*900,j//2*700]
   for i,face in enumerate(faces):
    v=local[face];lo=np.maximum(np.floor(v.min(0)).astype(int),0);hi=np.minimum(np.ceil(v.max(0)).astype(int),[899,699])
    if np.any(hi<lo):continue
    a,b,c=v;den=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    if abs(den)<1e-9:continue
    xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
    u=((xx-a[0])*(c[1]-a[1])-(yy-a[1])*(c[0]-a[0]))/den
    vv=((b[0]-a[0])*(yy-a[1])-(b[1]-a[1])*(xx-a[0]))/den;w=1-u-vv
    z=w*depth[face[0]]+u*depth[face[1]]+vv*depth[face[2]];old=zbuffer[lo[1]:hi[1]+1,lo[0]:hi[0]+1]
    visible=(u>=0)&(vv>=0)&(w>=0)&(z>old)
    if not visible.any():continue
    old[visible]=z[visible]
    normal=w[:,:,None]*n[face[0]]+u[:,:,None]*n[face[1]]+vv[:,:,None]*n[face[2]]
    normal/=np.maximum(np.linalg.norm(normal,axis=2)[:,:,None],1e-12);shade=.46+.54*np.maximum(normal@light,0)
    block=pixels[lo[1]:hi[1]+1,lo[0]:hi[0]+1];block[visible]=(colours[labels[i]]*shade[:,:,None])[visible].astype(np.uint8)
   im.paste(Image.fromarray(pixels),((j%2)*900,(j//2)*700))
  out=ROOT/'assets/previews/weapons-rack-painted.png';im.save(out);print('Offline artwork:',out)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args();build(args.preview)
