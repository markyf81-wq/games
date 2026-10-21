"""Author sculpt-aligned material regions on the supplied barbarian.

Boundary triangles are cut offline, preserving their surface and interpolated
normals. The original imported sculpt is untouched; the paint asset contains the
prepared surface and is guarded by the original geometry fingerprint.
Requires numpy. --preview additionally uses Pillow for authoring views.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import math
import numpy as np

ROOT=Path(__file__).resolve().parents[1]
MATERIALS=[
    {'name':'skin','colour':'#d5a078','roughness':.62,'metalness':0},
    {'name':'hair','colour':'#39271f','roughness':.78,'metalness':0},
    {'name':'leather','colour':'#654331','roughness':.72,'metalness':0},
    {'name':'cloth','colour':'#943b32','roughness':.9,'metalness':0},
    {'name':'fur','colour':'#d7c7ac','roughness':.95,'metalness':0},
    {'name':'steel','colour':'#c6d0d6','roughness':.27,'metalness':.86},
    {'name':'bronze','colour':'#c49a4f','roughness':.32,'metalness':.78},
    {'name':'base','colour':'#35383b','roughness':.88,'metalness':0},
]
ID={m['name']:i for i,m in enumerate(MATERIALS)}
SEAMS=json.loads((ROOT/'scripts/barbarian-paint-seams.json').read_text())
for contour in (SEAMS['hair']['points'],SEAMS['hair']['normals'],SEAMS['garmentProfiles']['front'],SEAMS['garmentProfiles']['back']):
    if not np.isfinite(np.asarray(contour)).all():raise ValueError('Paint contours must contain finite coordinates.')


def surface_seam(points,contour):
    """Signed local surface distance from a traced, oriented 3D paint seam.

    Unlike a height band this follows curls around the shoulder and the actual
    ends of the locks. Normals keep nearby, overlapping body surfaces distinct.
    """
    knots=np.asarray(contour['points']);normals=np.asarray(contour['normals'])
    nearest=np.full(len(points),np.inf);signed=np.zeros(len(points))
    for i,a in enumerate(knots):
        b=knots[(i+1)%len(knots)];tangent=b-a;length=np.dot(tangent,tangent)
        if length<1e-12:continue
        t=np.clip((points-a)@tangent/length,0,1)
        delta=points-(a+t[:,None]*tangent);distance=np.einsum('ij,ij->i',delta,delta)
        normal=normals[i]+t[:,None]*(normals[(i+1)%len(knots)]-normals[i])
        across=np.cross(tangent,normal);across/=np.maximum(np.linalg.norm(across,axis=1)[:,None],1e-12)
        use=distance<nearest;nearest[use]=distance[use]
        signed[use]=np.einsum('ij,ij->i',delta[use],across[use])
    return signed


def polygon(a,b,points):
    """Signed distance to an authored contour; positive inside."""
    inside=np.zeros(a.shape,dtype=bool);distance=np.full(a.shape,np.inf)
    previous=points[-1]
    for current in points:
        x1,y1=previous;x2,y2=current;dx=x2-x1;dy=y2-y1
        t=np.clip(((a-x1)*dx+(b-y1)*dy)/max(dx*dx+dy*dy,1e-12),0,1)
        distance=np.minimum(distance,(a-x1-t*dx)**2+(b-y1-t*dy)**2)
        if abs(dy)>1e-12:inside^=((y1>b)!=(y2>b))&(a<dx*(b-y1)/dy+x1)
        previous=current
    return np.sqrt(distance)*np.where(inside,1,-1)


def load():
    text=(ROOT/'assets/models/imported/barbarian.js').read_text()
    asset=json.loads(text.split('window.HeroQuest.stlAssets["barbarian"] = ',1)[1].rsplit(';',1)[0])
    if SEAMS['sourceGeometrySha256']!=asset['geometrySha256']:
        raise ValueError('Barbarian sculpt changed: retrace the paint seams before regenerating.')
    raw=np.frombuffer(base64.b64decode(asset['positions']),dtype='<u2').reshape(-1,3)
    p=raw/65535*np.array(asset['extent'])+np.array(asset['minimum'])
    normals=np.frombuffer(base64.b64decode(asset['normals']),dtype='<i2').reshape(-1,3)/32767
    faces=np.frombuffer(base64.b64decode(asset['indices']),dtype='<u2' if asset['indexBytes']==2 else '<u4').reshape(-1,3)
    return asset,p[:,[2,1,0]]*[1,1,-1],normals[:,[2,1,0]]*[1,1,-1],faces


def regions():
    def cuff(p):
        x,y,z=p.T
        # Rolled cuffs slope around the ankles, rather than flat height bands.
        upper=8.12-.04*z
        lower=5.90+.045*z
        return np.minimum(upper-y,y-lower)
    def loin(p):
        x,y,z=p.T
        profiles=SEAMS['garmentProfiles']
        silhouette=np.where(z>=0,polygon(x,y,profiles['front']),polygon(x,y,profiles['back']))
        left=np.interp(z,[-4,-3,-2.5,-2,-1.5,-1,0,1,2,2.5,3,4],
            [12,13.2,14.2,15.3,16.3,16.55,16.8,16.55,15.9,15.3,14.1,12])
        right=np.interp(z,[-4,-3,-2.5,-2,-1.5,-1,0,1,2,2.5,3,4],
            [12,13.2,14.2,15.1,15.7,16.15,16.3,16.05,15.5,15,14,12])
        opening=np.where(x<0,left,right)-np.maximum(0,2-np.abs(x))*2.5
        hand_clearance=np.maximum(4.6-x,-.7-z)
        return np.minimum.reduce([silhouette+.16,y-opening,17.9-y,hand_clearance])
    def belt(p):
        x,y,z=p.T
        bottom=17.6+.035*x
        top=19.65-.025*x
        return np.minimum.reduce([y-bottom,top-y,5.15-np.abs(x),4.05-np.abs(z)])
    def hair(p):
        x,y,z=p.T
        right=np.interp(y,[22,23,24,25,26,28,30,32,33],[2,4.2,5.2,4.8,4.2,3.5,3.1,2.4,1])
        left=np.interp(y,[22,23,24,25,26,28,30,32,33],[-3,-4.3,-5.3,-5.4,-4.8,-3.8,-3.1,-2.0,-1])
        hand_clearance=np.maximum(3.45-x,-1.8-z)
        chest_clearance=np.maximum.reduce([1.2-x,-2.2-z,y-25.7])
        return np.minimum.reduce([surface_seam(p,SEAMS['hair']),y-22.3,32.7-y,x-left,right-x,hand_clearance,chest_clearance])
    def guard(p):
        x,y,z=p.T
        outline=polygon(x,y,[(2.15,29.85),(2.8,30.85),(4.1,31.4),(6.8,31.4),
            (8.05,30.65),(8.65,29.65),(8.45,28.75),(7.5,28.15),
            (6.25,28.0),(4.65,28.15),(3.15,28.55)])
        return outline
    def pommel(p):
        x,y,z=p.T
        # Only the lower sword end, beneath the fist; no broad wristband.
        return np.minimum.reduce([y-18.75,19.7-y,x-5.5,8.45-x,z-.35,3.7-z])
    def blade(p):
        x,y,z=p.T
        outline=polygon(x,y,[(4.12,29.55),(6.65,29.55),(6.55,32.0),(5.1,41.8),
            (2.55,48.9),(.4,48.9),(.5,46.5),(3.7,32.0)])
        return np.maximum.reduce([outline,y-32.1,np.minimum(y-31.3,x-3.0)])
    def rivets(p):
        # Centres are sampled on the five actual raised belt studs, rather
        # than a large oval that painted the neighbouring strap like a buckle.
        patches=[]
        for cx,cy,cz,rx,ry in [(-2.713,18.70,3.027,.53,.53),(.007,18.567,3.733,.55,.52),
            (2.34,18.767,3.473,.54,.50),(.593,18.793,-3.778,.53,.53),(-2.287,18.753,-2.993,.53,.53)]:
            radial=1-((p[:,0]-cx)/rx)**2-((p[:,1]-cy)/ry)**2
            depth=(p[:,2]-(cz-.55)) if cz>0 else ((cz+.55)-p[:,2])
            patches.append(np.minimum(radial,depth))
        return np.minimum(belt(p),np.maximum.reduce(patches))
    return [
        ('leather',lambda p:np.minimum(p[:,1]-1.9,6.65-p[:,1])),
        ('fur',cuff),('cloth',loin),
        ('leather',belt),
        ('bronze',rivets),
        ('hair',hair),('bronze',pommel),('bronze',guard),('steel',blade),
        ('base',lambda p:2.025-p[:,1]),
    ]


def cut_region(triangles,labels,name,field,attribute=None):
    """Cut crossing triangles on a material seam, not along original face edges."""
    def sample(tris):
        return field(tris[:,:,:3].reshape(-1,3)).reshape(-1,3) if attribute is None else tris[:,:,attribute]
    values=sample(triangles)
    inside=values>=0;whole=inside.all(axis=1);outside=(~inside).all(axis=1)
    # Catch an enclosed small patch which has no inside corner (e.g. buckle).
    middle=(field(triangles[:,:,:3].mean(axis=1)) if attribute is None else values.mean(axis=1))>=0
    enclosed=(whole&~middle)|(outside&middle)
    if enclosed.any():
        rest=~enclosed;centre=triangles[enclosed].mean(axis=1)
        pieces=np.concatenate([np.stack([triangles[enclosed,i],triangles[enclosed,(i+1)%3],centre],axis=1) for i in range(3)])
        triangles=np.concatenate([triangles[rest],pieces]);labels=np.concatenate([labels[rest],np.tile(labels[enclosed],3)])
        values=sample(triangles)
        inside=values>=0;whole=inside.all(axis=1);outside=(~inside).all(axis=1)
    output=[triangles[whole|outside]];kept=labels[whole|outside].copy();kept[whole[whole|outside]]=ID[name];colours=[kept]
    for tri,v,old in zip(triangles[~(whole|outside)],values[~(whole|outside)],labels[~(whole|outside)]):
        for keep_positive,label in [(True,ID[name]),(False,int(old))]:
            poly=[]
            for j in range(3):
                a,b=tri[j-1],tri[j];va,vb=v[j-1],v[j]
                ia=va>=0 if keep_positive else va<0;ib=vb>=0 if keep_positive else vb<0
                if ia!=ib:
                    # Linear interpolation gives identical seam vertices for
                    # both material polygons, including shared surface normals.
                    t=va/(va-vb);poly.append(a+(b-a)*t)
                if ib:poly.append(b)
            for j in range(1,len(poly)-1):
                output.append(np.array([[poly[0],poly[j],poly[j+1]]]))
                colours.append(np.array([label],dtype=np.uint8))
    return np.concatenate(output),np.concatenate(colours)


def connected_material_field(points,faces,field,low,high,keep_count=1):
    """Keep the main surface components and fill isolated pinholes.

    A 3D brush must not jump across an air gap onto nearby skin.
    Weld shading duplicates for adjacency, without altering runtime geometry.
    """
    unique,inverse=np.unique(np.round(points,5),axis=0,return_inverse=True)
    values=np.zeros(len(unique));np.add.at(values,inverse,field);values/=np.bincount(inverse)
    welded= inverse[faces]
    edges=np.unique(np.sort(np.concatenate([welded[:,[0,1]],welded[:,[1,2]],welded[:,[2,0]]]),axis=1),axis=0)
    parent=np.arange(len(unique))
    def root(i):
        while parent[i]!=i:parent[i]=parent[parent[i]];i=parent[i]
        return i
    for a,b in edges:
        if (values[a]>=0)==(values[b]>=0):
            ra,rb=root(a),root(b)
            if ra!=rb:parent[ra]=rb
    components=np.array([root(i) for i in range(len(unique))]);positive=values>=0
    ids,counts=np.unique(components[positive],return_counts=True)
    primary=ids[np.argsort(counts)[-keep_count:]];keep=np.isin(components,primary)
    for component in np.unique(components[~positive]):
        mask=components==component
        if mask.sum()<=12 and unique[mask,1].min()>low and unique[mask,1].max()<high:keep[mask]=True
    return (np.maximum(np.abs(values),.015)*np.where(keep,1,-1))[inverse]


def paint_surface(points,normals,faces):
    fields=regions();lookup=dict(fields)
    hair=connected_material_field(points,faces,lookup['hair'](points),22.3,32.7)
    cloth=connected_material_field(points,faces,lookup['cloth'](points),12.0,17.9)
    triangles=np.concatenate([points[faces],normals[faces],hair[faces,None],cloth[faces,None]],axis=2)
    labels=np.full(len(faces),ID['skin'],dtype=np.uint8)
    for name,field in fields:triangles,labels=cut_region(triangles,labels,name,field,{'hair':6,'cloth':7}.get(name))
    area=np.linalg.norm(np.cross(triangles[:,1,:3]-triangles[:,0,:3],triangles[:,2,:3]-triangles[:,0,:3]),axis=1)
    triangles=triangles[area>1e-10];labels=labels[area>1e-10]
    # Deduplicate coincident position+normal pairs, retaining existing creases.
    vertices,inverse=np.unique(np.round(triangles[:,:,:6].reshape(-1,6),7),axis=0,return_inverse=True)
    p=vertices[:,:3];n=vertices[:,3:];n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
    return p,n,inverse.reshape(-1,3),labels


def pack(points,normals,faces):
    p=points[:,[2,1,0]]*[-1,1,1];n=normals[:,[2,1,0]]*[-1,1,1]
    minimum=p.min(axis=0);extent=np.ptp(p,axis=0)
    positions=np.rint((p-minimum)/np.where(extent>0,extent,1)*65535).astype('<u2')
    normal_data=np.rint(np.clip(n,-1,1)*32767).astype('<i2')
    indices=faces.astype('<u2' if len(p)<=65535 else '<u4')
    return {'vertices':len(p),'triangles':len(faces),'minimum':minimum.tolist(),'extent':extent.tolist(),
        'indexBytes':indices.dtype.itemsize,'positions':base64.b64encode(positions.tobytes()).decode(),
        'normals':base64.b64encode(normal_data.tobytes()).decode(),'indices':base64.b64encode(indices.tobytes()).decode(),
        'geometrySha256':hashlib.sha256(positions.tobytes()+normal_data.tobytes()+indices.tobytes()).hexdigest()}


def preview(points,normals,faces,labels):
    from PIL import Image,ImageDraw
    image=Image.new('RGB',(2000,1100),(226,224,216));draw=ImageDraw.Draw(image)
    colours=np.array([[int(m['colour'][i:i+2],16) for i in (1,3,5)] for m in MATERIALS])
    for panel,(name,yaw,elevation) in enumerate([('Front',0,.08),('Three-quarter',.7,.15),('Back',math.pi,.08),('Above',-.5,.95)]):
        right=np.array([math.cos(yaw),0,-math.sin(yaw)]);forward=np.array([math.sin(yaw)*math.cos(elevation),math.sin(elevation),math.cos(yaw)*math.cos(elevation)]);up=np.cross(forward,right)
        depth=points@forward;scale=19
        uv=np.column_stack([points@right*scale+panel*500+250,1000-points@up*scale])
        light=right*-.38+np.array([0,.45,0])+forward*.75;light/=np.linalg.norm(light)
        shade=.4+.6*np.maximum(normals@light,0)
        for i in np.argsort(depth[faces].mean(axis=1)):
            colour=tuple(np.clip(colours[labels[i]]*shade[faces[i]].mean(),0,255).astype(int))
            draw.polygon([tuple(a) for a in uv[faces[i]]],fill=colour)
        draw.text((panel*500+190,20),name,fill=(30,30,30))
    dest=ROOT/'assets/previews/barbarian-painted.png';dest.parent.mkdir(parents=True,exist_ok=True);image.save(dest)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    asset,p,n,f=load();points,normals,faces,labels=paint_surface(p,n,f)
    data={'id':'barbarian','geometrySha256':asset['geometrySha256'],'triangles':asset['triangles'],
        'vertices':asset['vertices'],'materials':MATERIALS,'geometry':pack(points,normals,faces),
        'faceMaterials':base64.b64encode(labels.tobytes()).decode()}
    output=ROOT/'assets/models/barbarian-paint.js'
    output.write_text('// Authored material seams: scripts/paint_barbarian.py. Original sculpt: imported/barbarian.js.\n'
        +'window.HeroQuest.barbarianPaint = '+json.dumps(data,separators=(',',':'))+';\n')
    if args.preview:preview(points,normals,faces,labels)
    print('Prepared',len(faces),'triangles,',len(points),'vertices;',output.stat().st_size,'bytes.')
    print(', '.join(m['name']+': '+str(int((labels==i).sum())) for i,m in enumerate(MATERIALS)))


if __name__=='__main__':main()
