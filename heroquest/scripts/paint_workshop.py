"""Sculpt-aligned paint for the supplied alchemy, sorcery and torture furniture.

Offline numpy; Pillow for optional source-normal/depth-buffer artwork previews.
Never used at runtime. Originals, assembly origins, footprints and facing stay.
"""
from pathlib import Path
import argparse,base64,hashlib,json,math
import numpy as np
from paint_furniture import cut
ROOT=Path(__file__).resolve().parents[1]
SOURCES={'alchemists-bench':'95022db4a70d7fee5ef0582a6188da9b067bcbb6a4616749997bc5f7bc553b24',
 'sorcerers-table':'ae5347371e084f472aac4b61b00ee25b62d8384a1a6f4505e0010aa7fd51d09e',
 'torture-rack':'35ca82471f17253f12b65c97bdf0dbd0718cb0bac89ec56ff4d8dad652b700b5'}
MATERIALS=[
 {'name':'Walnut boards','colour':'#704530','roughness':.82,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Dark walnut frame','colour':'#4f3024','roughness':.87,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Forged iron','colour':'#343b3d','roughness':.58,'metalness':.7},
 {'name':'Aged brass','colour':'#b28a47','roughness':.38,'metalness':.78},
 {'name':'Warm copper','colour':'#a9623c','roughness':.42,'metalness':.74},
 {'name':'Jade-green vessel','colour':'#285e4c','roughness':.22,'metalness':.04},
 {'name':'Cobalt-blue vessel','colour':'#355f7a','roughness':.22,'metalness':.04},
 {'name':'Amber vessel','colour':'#8d592a','roughness':.25,'metalness':.04},
 {'name':'Cream ceramic','colour':'#c2b89a','roughness':.43,'metalness':0},
 {'name':'Parchment pages','colour':'#d5c69e','roughness':.96,'metalness':0},
 {'name':'Oxblood leather','colour':'#71333d','roughness':.88,'metalness':0},
 {'name':'Old ivory bone','colour':'#d1c4a3','roughness':.88,'metalness':0},
 {'name':'Ivory candle wax','colour':'#e3d2a4','roughness':.79,'metalness':0},
 {'name':'Dark ink and recesses','colour':'#302c24','roughness':.98,'metalness':0},
 {'name':'Muted plum cloth','colour':'#4c344f','roughness':.96,'metalness':0,'finish':'cloth'},
 {'name':'Warm walnut tabletop','colour':'#885b3c','roughness':.82,'metalness':0,'finish':'wood','grainStrength':.4},
 {'name':'Hemp rope','colour':'#b39a6a','roughness':.98,'metalness':0},
 {'name':'Steel fittings','colour':'#a5b0b4','roughness':.38,'metalness':.8},
 {'name':'Candle flame','colour':'#ec9b32','roughness':.6,'metalness':0},
]

def box(p,lo,hi):return np.minimum(p-np.array(lo),np.array(hi)-p).min(1)

def load(key):
 a=json.loads((ROOT/'assets/models/imported'/f'{key}.js').read_text().split('window.HeroQuest.stlAssets["'+key+'"] = ',1)[1].rsplit(';',1)[0])
 fingerprint=hashlib.sha256(b''.join(base64.b64decode(a[k])for k in ['positions','normals','indices'])).hexdigest()
 if fingerprint!=SOURCES[key]:raise ValueError('Source changed; review paint seams before regenerating '+key)
 p=np.frombuffer(base64.b64decode(a['positions']),'<u2').reshape(-1,3)/65535*np.array(a['extent'])+a['minimum']
 n=np.frombuffer(base64.b64decode(a['normals']),'<i2').reshape(-1,3)/32767
 f=np.frombuffer(base64.b64decode(a['indices']),'<u2'if a['indexBytes']==2 else '<u4').reshape(-1,3)
 if key=='alchemists-bench':
  # The tiny STL units made the earlier unnormalised reduction collapse round
  # bottles and the skull into spikes. Reprepare only this derivative at a
  # stable numeric scale, then restore the exact source units and origin.
  from import_stl import read_stl,shaded_mesh
  import fast_simplification
  source=ROOT/'references/stl-source'/a['sourceFile']
  if hashlib.sha256(source.read_bytes()).hexdigest()!=a['sourceSha256']:raise ValueError('Original alchemy STL changed.')
  raw,faces,_,_=read_stl(source);base=raw[raw[:,2]<=raw[:,2].min()+np.ptp(raw[:,2])*.035];centre=(base[:,:2].min(0)+base[:,:2].max(0))/2
  p,f=fast_simplification.simplify(raw*100,faces,target_count=28000,agg=5.0);p/=100
  p=p[:,[0,2,1]]*[1,1,-1];p[:,0]-=centre[0];p[:,2]+=centre[1];p[:,1]-=p[:,1].min()
  p,n,f=shaded_mesh(p,f);n=n.astype(float)/32767
  a['previousPreparedGeometrySha256']=SOURCES[key]
  a['repreparedGeometrySha256']=hashlib.sha256(p.astype('<f8').tobytes()+n.astype('<f8').tobytes()+f.astype('<u4').tobytes()).hexdigest()
  a['geometryPreparation']='Original STL reduced in source coordinates scaled x100, returned to source units, axis-converted and shallow-base centred/grounded; 28000 target, agg 5, source normals prepared offline.'
  a['repreparedTriangles']=len(f)
 return a,np.concatenate([p,n],axis=1)[f]

def regions(key):
 if key=='alchemists-bench':
  def vessel(p,x,z,r):
   return box(p,[x-r-.025,2.268,z-r-.025],[x+r+.025,4.1,z+r+.025])
  result=[(1,lambda p:1.73-p[:,1]),(15,lambda p:p[:,1]-1.73)]
  # Back shelf/walls stay walnut. Only the raised apparatus gets metal/glaze.
  result.extend([(0,lambda p:np.minimum(p[:,1]-2.04,-.405-p[:,2])),
   (3,lambda p:box(p,[-2.23,2.35,-1.34],[-.69,4.,-.58]))])
  for x,z,r,colour,top in [(-.18,-1.06,.345,5,3.542),(.60,-1.10,.345,6,3.447),(1.25,-1.16,.225,7,3.631),(2.21,-1.20,.225,5,3.545)]:
   result.append((colour,lambda p,x=x,z=z,r=r:vessel(p,x,z,r)))
   result.append((3,lambda p,x=x,z=z,r=r,top=top:np.minimum(vessel(p,x,z,r),p[:,1]-(top-.10))))
  for x,z,r,colour in [(.22,-.64,.205,8),(1.02,-.64,.205,8),(1.80,-.84,.315,7)]:
   result.append((colour,lambda p,x=x,z=z,r=r:np.minimum.reduce([r+.035-np.hypot(p[:,0]-x,p[:,2]-z),p[:,1]-2.268,2.96-p[:,1]])))
   result.append((4,lambda p,x=x,z=z,r=r:np.minimum.reduce([r+.035-np.hypot(p[:,0]-x,p[:,2]-z),p[:,1]-2.857,2.96-p[:,1]])))
  # The low skull sits directly on the front work surface; use its full raised
  # footprint rather than a horizontal band through the forehead or jaw.
  result.extend([(9,lambda p:box(p,[-2.40,1.907,-.25],[2.40,2.09,1.39])),(11,lambda p:box(p,[-2.43,1.907,-.35],[-1.45,2.28,.50])),
   (8,lambda p:np.minimum(.245-np.hypot(p[:,0]+2.,p[:,2]-1.0),p[:,1]-1.907)),
   (13,lambda p:np.minimum.reduce([.115-np.hypot(p[:,0]+2.,p[:,2]-1.0),p[:,1]-2.13])),
   (0,lambda p:box(p,[.33,1.907,-.38],[1.94,2.09,.22])),
   (9,lambda p:box(p,[.42,1.907,-.29],[1.85,2.11,.13])),
   (11,lambda p:np.minimum.reduce([p[:,0]+1.8,-.76-p[:,0],.055-np.abs(p[:,2]-(.27-.65*(p[:,0]+.76))),p[:,1]-1.912])),
   (3,lambda p:np.minimum.reduce([.09-np.abs(np.abs(p[:,0])-1.025),.072-np.abs(p[:,1]-1.008),p[:,2]-1.409])),
   (3,lambda p:np.minimum.reduce([.10-np.abs(np.abs(p[:,0])-1.17),.05-np.abs(p[:,1]-2.08),p[:,2]+.405]))])
  return result
 if key=='sorcerers-table':
  def book(p):return box(p,[-9.55,24.0,-7.75],[9.75,29.2,7.85])
  def pages(p):return box(p,[-8.75,24.10,-7.05],[8.95,29.3,7.10])
  def holders(p):
   x,y,z=p.T
   return np.minimum.reduce([4.05-np.hypot(np.abs(x)-15.0,z+5.55),y-25.9])
  def wax(p):
   x,y,z=p.T
   return np.minimum.reduce([1.08-np.abs(np.abs(x)-15.0),1.10-np.abs(z+5.55),y-39.95])
  return [(1,lambda p:19.55-p[:,1]),(14,lambda p:p[:,1]-19.55),(10,book),(9,pages),
   (3,holders),(12,wax),(13,lambda p:np.minimum(wax(p),p[:,1]-45.65)),
   (18,lambda p:np.minimum(wax(p),p[:,1]-46.05))]
 if key=='torture-rack':
  def wheels(p):
   x,y,z=p.T
   return np.minimum.reduce([np.abs(z)-15.10,15.3-np.hypot(x-23.48,y-21.65)])
  def wheel_iron(p):
   x,y,z=p.T;r=np.hypot(x-23.48,y-21.65)
   return np.minimum(wheels(p),2.05-r)
  def axle(p):
   x,y,z=p.T
   return np.minimum.reduce([2.45-np.hypot(x-23.48,y-21.65),y-19.2])
  def rope(p):
   x,y,z=p.T
   bounds=np.minimum.reduce([x-6.5,27.3-x,np.abs(z)-4.7,10.6-np.abs(z),y-20.95])
   roller=np.hypot(x-23.48,y-21.65)-2.2
   return np.minimum(bounds,np.maximum(19.0-x,roller))
  def cuffs(p):
   x,y,z=p.T
   return np.minimum.reduce([4.05-np.hypot(x-4.4,np.abs(z)-9.2),y-21.05])
  def skull(p):
   x,y,z=p.T
   return 1-((x+8.1)/4.8)**2-(z/4.4)**2-((y-24.4)/4.55)**2
  return [(1,lambda p:19.7-p[:,1]),(15,lambda p:p[:,1]-19.7),
   (1,wheels),(2,wheel_iron),(2,axle),
   (2,lambda p:box(p,[-25.6,20.95,-13.25],[-22.35,27.0,13.25])),
   (16,rope),(2,cuffs),(11,skull)]
 return []

def build(key,art=False):
 asset,tris=load(key)
 if key=='sorcerers-table':
  centre=tris[:,:,:3].mean(1)
  book=(np.abs(centre[:,0])<11)&(np.abs(centre[:,2])<9)&(centre[:,1]>23)
  pieces=tris[book]
  # Long page facets cross several box edges. Partition each plane first so
  # the complete page surface is parchment, with a narrow clean leather rim.
  for axis,values in [(0,[-9.55,-8.75,8.95,9.75]),(1,[24.,24.1]),(2,[-7.75,-7.05,7.10,7.85])]:
   for value in values:pieces,_=cut(pieces,np.zeros(len(pieces),np.uint8),0,lambda p,axis=axis,value=value:p[:,axis]-value)
  tris=np.concatenate([tris[~book],pieces])
 labels=np.zeros(len(tris),np.uint8)
 for material,field in regions(key):tris,labels=cut(tris,labels,material,field)
 keep=np.linalg.norm(np.cross(tris[:,1,:3]-tris[:,0,:3],tris[:,2,:3]-tris[:,0,:3]),axis=1)>1e-12
 tris,labels=tris[keep],labels[keep];p=tris[:,:,:3];c=p.mean(1)
 side=np.argmax(np.abs(np.cross(p[:,1]-p[:,0],p[:,2]-p[:,0])),axis=1);unit=1 if key=='alchemists-bench'else .07
 uv=p[:,:,[0,2]]*unit;use=side==0;uv[use]=p[use][:,:,[2,1]]*unit
 use=side==2;uv[use]=p[use][:,:,[0,1]]*unit
 if key=='torture-rack':
  horizontal=(labels==15)&(side==1);uv[horizontal]=p[horizontal][:,:,[2,0]]*unit
 # On the upright frame, grain follows the legs rather than crossing them.
 vertical=(labels==1)&(c[:,1]<(1.75 if key=='alchemists-bench'else 20))
 uv[vertical]=p[vertical][:,:,[0,1]]*unit
 unique,inv=np.unique(np.round(np.concatenate([tris,uv],axis=2).reshape(-1,8),7),axis=0,return_inverse=True)
 p,n=unique[:,:3],unique[:,3:6];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 lo=p.min(0);extent=np.ptp(p,axis=0);q=np.rint((p-lo)/extent*65535).astype('<u2');normal=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
 faces=inv.reshape(-1,3).astype('<u2'if len(p)<=65535 else '<u4');b64=lambda a:base64.b64encode(a.tobytes()).decode();used=np.unique(labels);packed=np.searchsorted(used,labels).astype(np.uint8)
 data={k:v for k,v in asset.items()if k not in ['positions','normals','indices','minimum','extent','vertices','triangles','indexBytes','geometrySha256']}
 data.update(sourceGeometrySha256=asset.get('repreparedGeometrySha256',SOURCES[key]),inputTriangles=asset.get('repreparedTriangles',asset['triangles']),vertices=len(p),triangles=len(faces),minimum=lo.tolist(),extent=extent.tolist(),indexBytes=faces.dtype.itemsize,
  positions=b64(q),normals=b64(normal),indices=b64(faces),uvs=b64(unique[:,6:].astype('<f4')),materials=[MATERIALS[int(i)]for i in used],faceMaterials=b64(packed),geometrySha256=hashlib.sha256(q.tobytes()+normal.tobytes()+faces.tobytes()).hexdigest(),
  placementStatus='Original sculpt frame retained; uniformly fitted by existing furniture factory.',modifications='Authored paint seams/physical-axis UVs; interpolated normals; source surface, pose and fitting unchanged.')
 dest=ROOT/'assets/models/furniture'/f'{key}.js';dest.write_text('// Supplied sculpt; creator/licence unknown. See WORKSHOP.md. Paint: scripts/paint_workshop.py.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(data,separators=(',',':'))+';\n')
 print(key,len(faces),'triangles;',len(p),'vertices;',dest.stat().st_size,'bytes',flush=True)
 if art:preview(key,p,n,faces,labels)

def preview(key,p,n,faces,labels,vertex_colours=None):
 from PIL import Image
 im=Image.new('RGB',(1800,1400),(33,38,40));colours=np.array([tuple(bytes.fromhex(m['colour'][1:]))for m in MATERIALS]);light=np.array([-.4,.65,.65]);light/=np.linalg.norm(light)
 for j,(yaw,el)in enumerate([(.65,.52),(-.65,.67),(math.pi-.55,.5),(0,1.38)]):
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
   normal/=np.maximum(np.linalg.norm(normal,axis=2)[:,:,None],1e-12);shade=.4+.6*np.maximum(normal@light,0)
   colour=colours[labels[i]]
   if vertex_colours is not None and MATERIALS[int(labels[i])].get('vertexColours'):
    tint=w[:,:,None]*vertex_colours[face[0]]+u[:,:,None]*vertex_colours[face[1]]+vv[:,:,None]*vertex_colours[face[2]]
    colour=colour*tint/255
   block=pixels[lo[1]:hi[1]+1,lo[0]:hi[0]+1];block[visible]=(colour*shade[:,:,None])[visible].astype(np.uint8)
  im.paste(Image.fromarray(pixels),((j%2)*900,(j//2)*700))
 dest=ROOT/'assets/previews'/f'{key}-painted.png';im.save(dest);print('Offline artwork:',dest,flush=True)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--only',nargs='+',choices=list(SOURCES),default=['alchemists-bench']);parser.add_argument('--preview',action='store_true');args=parser.parse_args()
 for key in args.only:build(key,args.preview)
