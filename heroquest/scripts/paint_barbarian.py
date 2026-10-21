"""Author clean material colours on the supplied barbarian mesh.

Materials are selected from hand-placed sculpt landmarks in canonical model
coordinates. Output uniform material regions without baked pigment or wash.
Requires numpy. --preview additionally uses Pillow for an authoring contact sheet.
"""
from pathlib import Path
import argparse
import base64
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
    {'name':'stone','colour':'#858780','roughness':.92,'metalness':0},
    {'name':'base','colour':'#30332f','roughness':.78,'metalness':0},
    {'name':'recess','colour':'#77513a','roughness':.75,'metalness':0},
]
ID={m['name']:i for i,m in enumerate(MATERIALS)}


def polygon(a,b,points):
    """Vectorized point-in-polygon for an authored two-coordinate paint mask."""
    inside=np.zeros(a.shape,dtype=bool)
    previous=points[-1]
    for current in points:
        x1,y1=previous;x2,y2=current
        if abs(y2-y1)>1e-12:
            inside^=((y1>b)!=(y2>b)) & (a<(x2-x1)*(b-y1)/(y2-y1)+x1)
        previous=current
    return inside


def load():
    text=(ROOT/'assets/models/imported/barbarian.js').read_text()
    asset=json.loads(text.split('window.HeroQuest.stlAssets["barbarian"] = ',1)[1].rsplit(';',1)[0])
    raw=np.frombuffer(base64.b64decode(asset['positions']),dtype='<u2').reshape(-1,3)
    p=raw/65535*np.array(asset['extent'])+np.array(asset['minimum'])
    normals=np.frombuffer(base64.b64decode(asset['normals']),dtype='<i2').reshape(-1,3)/32767
    faces=np.frombuffer(base64.b64decode(asset['indices']),dtype='<u2' if asset['indexBytes']==2 else '<u4').reshape(-1,3)
    # After the runtime's +90-degree facing correction: X across, Y up, Z front.
    return asset,p[:,[2,1,0]]*[1,1,-1],normals[:,[2,1,0]]*[1,1,-1],faces


def paint(points,faces):
    centres=points[faces].mean(axis=1);x,y,z=centres.T
    labels=np.full(len(faces),ID['skin'],dtype=np.uint8)
    def apply(name,mask):labels[mask]=ID[name]

    # Boots end at the rolled fur cuff; calves and knees remain bare.
    apply('leather',(y>1.75)&(y<6.5))
    apply('fur',(y>=6.15)&(y<8.15)&(np.abs(x)>4.0))

    # Furred loincloth: red front panel with natural fur at the back and sides.
    loin=polygon(x,y,[(-4.4,17.65),(3.5,17.65),(3.8,16.1),(2.5,14.2),
                      (-.7,12.4),(-2.3,13.1),(-3.4,15.0)])
    apply('fur',loin & (np.abs(z)<4.5))
    apply('cloth',loin & (z>1.3))
    belt=(y>=17.55)&(y<19.5)&((x/5.4)**2+(z/4.0)**2<1.25)
    apply('leather',belt)
    # The sculpted front buckle, keeping neighbouring belt studs in leather.
    apply('bronze',belt & (z>2.7)&(((x+2.25)/1.15)**2+((y-18.55)/.8)**2<1))

    # Hair follows the cap and swept back locks. A side profile excludes the face.
    hair_profile=polygon(z,y,[(2.7,30.65),(2.2,31.6),(.2,32.2),(-2.8,31.5),
        (-4.4,27.4),(-5.9,24),(-3.4,22.6),(-1.5,24.1),(-.5,26.6),
        (.35,28.0),(.6,29.7),(1.9,30.05)])
    hair_width=polygon(x,y,[(-4.7,24),(-4.1,28),(-2.6,31.5),(.4,32.2),
                          (2.6,30.8),(3.15,27.8),(4.0,23.0),(.4,22.7)])
    apply('hair',hair_profile & hair_width)
    # Temple locks beside the cheeks and shoulders, without crossing the face.
    apply('hair',(y>24.8)&(y<29.7)&(z<1.1)&(x>-4.5)&(x<3.5))

    # The fists cover the grip. Keep them skin-coloured on every side; the old
    # broad grip mask also coloured the back of the hand like a dark wristband.
    apply('bronze',(x>5.2)&(x<8.8)&(y>18.6)&(y<20.05))
    # Authored curved crossguard silhouette; leave the upper hand below it bare.
    guard=polygon(x,y,[(2.2,29.8),(3.1,30.6),(5.5,31.2),(7.3,30.7),
                      (8.6,29.7),(8.45,28.5),(6.4,27.85),(3.6,28.3)])
    apply('bronze',guard)
    # Blade starts inside the crossguard and continues beyond all body surfaces.
    blade=polygon(x,y,[(4.15,29.5),(6.6,29.6),(6.6,32.0),(5.1,41.8),
                      (2.55,48.7),(.45,48.7),(.6,46.5),(3.7,32.0)])
    apply('steel',blade)

    # Soft brown definition confined to the sculpted eyes and mouth.
    eyes=(((x+1.38)/.52)**2+((y-29.0)/.18)**2<1)|(((x-.72)/.45)**2+((y-28.98)/.18)**2<1)
    mouth=((x+.25)/.72)**2+((y-26.95)/.13)**2<1
    apply('recess',(eyes|mouth)&(z>2.1)&(labels==ID['skin']))

    # Preserve the modelled base geometry; paint its top as stone, rim charcoal.
    apply('stone',y<=1.78)
    apply('base',y<.85)
    return labels


def preview(points,normals,faces,labels):
    from PIL import Image,ImageDraw
    image=Image.new('RGB',(1500,900),(226,224,216));draw=ImageDraw.Draw(image)
    colours=np.array([[int(m['colour'][i:i+2],16) for i in (1,3,5)] for m in MATERIALS])
    for panel,(name,yaw) in enumerate([('Front',0),('Three-quarter',.65),('Back',math.pi)]):
        right=np.array([math.cos(yaw),0,-math.sin(yaw)]);forward=np.array([math.sin(yaw),0,math.cos(yaw)])
        depth=points@forward;scale=16;u=points@right
        uv=np.column_stack([u*scale+panel*500+250,850-points[:,1]*scale])
        light=right*-.38+np.array([0,.45,0])+forward*.75;light/=np.linalg.norm(light)
        shade=.35+.65*np.maximum(normals@light,0)
        for i in np.argsort(depth[faces].mean(axis=1)):
            colour=tuple(np.clip(colours[labels[i]]*shade[faces[i]].mean(),0,255).astype(int))
            draw.polygon([tuple(a) for a in uv[faces[i]]],fill=colour)
        draw.text((panel*500+200,20),name,fill=(30,30,30))
    dest=ROOT/'assets/previews/barbarian-painted.png';dest.parent.mkdir(parents=True,exist_ok=True)
    image.save(dest)


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--preview',action='store_true');args=parser.parse_args()
    asset,points,normals,faces=load();labels=paint(points,faces)
    data={'id':'barbarian','geometrySha256':asset['geometrySha256'],'triangles':len(faces),
          'vertices':len(points),'materials':MATERIALS,
          'faceMaterials':base64.b64encode(labels.tobytes()).decode()}
    output=ROOT/'assets/models/barbarian-paint.js'
    output.write_text('// Authored paint scheme: scripts/paint_barbarian.py. Geometry remains in imported/barbarian.js.\n'
        +'window.HeroQuest.barbarianPaint = '+json.dumps(data,separators=(',',':'))+';\n')
    if args.preview:preview(points,normals,faces,labels)
    print('Painted',len(faces),'triangles;',output.stat().st_size,'bytes of paint data.')
    print(', '.join(m['name']+': '+str(int((labels==i).sum())) for i,m in enumerate(MATERIALS)))


if __name__=='__main__':main()
