"""Depth-correct offline sculpt previews; numpy/Pillow authoring only."""
import math
import numpy as np
from PIL import Image


def render(p,n,f,labels,yaw,elevation,centre,span,size,neutral=False,materials=None):
 right=np.array([math.cos(yaw),0,-math.sin(yaw)])
 forward=np.array([math.sin(yaw)*math.cos(elevation),math.sin(elevation),math.cos(yaw)*math.cos(elevation)])
 up=np.cross(forward,right);scale=size/span;c=np.array(centre)
 uv=np.column_stack([(p-c)@right*scale+size/2,size/2-(p-c)@up*scale]);depth=(p-c)@forward
 pixels=np.full((size,size,3),221,dtype=np.uint8);depthbuf=np.full((size,size),-np.inf);world=np.full((size,size,3),np.nan);facebuf=np.full((size,size),-1,dtype=np.int32)
 colours=np.array([[int(m['colour'][i:i+2],16) for i in (1,3,5)] for m in materials])/255
 # sRGB approximation for neutral authoring lighting, not a runtime screenshot.
 colours=colours**2.2
 light=right*-.5+up*.65+forward*.8;light/=np.linalg.norm(light)
 for i,face in enumerate(f):
  t=uv[face];lo=np.maximum(np.floor(t.min(0)).astype(int),0);hi=np.minimum(np.ceil(t.max(0)).astype(int),size-1)
  if (hi<lo).any():continue
  xx,yy=np.meshgrid(np.arange(lo[0],hi[0]+1)+.5,np.arange(lo[1],hi[1]+1)+.5)
  a,b,d=t;den=(b[1]-d[1])*(a[0]-d[0])+(d[0]-b[0])*(a[1]-d[1])
  if abs(den)<1e-10:continue
  w0=((b[1]-d[1])*(xx-d[0])+(d[0]-b[0])*(yy-d[1]))/den
  w1=((d[1]-a[1])*(xx-d[0])+(a[0]-d[0])*(yy-d[1]))/den;w2=1-w0-w1
  zz=w0*depth[face[0]]+w1*depth[face[1]]+w2*depth[face[2]]
  ys=slice(lo[1],hi[1]+1);xs=slice(lo[0],hi[0]+1)
  hit=(w0>=-1e-8)&(w1>=-1e-8)&(w2>=-1e-8)&(zz>depthbuf[ys,xs])
  if not hit.any():continue
  weights=np.stack([w0[hit],w1[hit],w2[hit]],axis=1)
  normals=weights@n[face];normals/=np.maximum(np.linalg.norm(normals,axis=1)[:,None],1e-9)
  shade=.30+.70*np.maximum(normals@light,0)
  colour=np.full(3,.46) if neutral else colours[labels[i]]
  pixels[ys,xs][hit]=np.clip((colour[None,:]*shade[:,None])**(1/2.2)*255,0,255).astype('u1')
  depthbuf[ys,xs][hit]=zz[hit];world[ys,xs][hit]=weights@p[face];facebuf[ys,xs][hit]=i
 return Image.fromarray(pixels),world,facebuf

