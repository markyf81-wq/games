"""Prepare ldid69's supplied wall for board edges. Offline numpy/Pillow tools.

Run with the source download directory. Reads mesh data only, preserves source
and notices locally, removes the printing plinth, and prepares two reusable sizes.
"""
from pathlib import Path
import argparse
import base64
import hashlib
import json
import shutil
import sys
import numpy as np
from PIL import Image, ImageDraw
from import_stl import read_stl, shaded_mesh, bounds

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/model-libs'))
import fast_simplification


def clip(points, faces, axis, limit, keep_above):
    """Clip triangles and close each simple section loop with an ear-cut cap."""
    triangles, segments = [], []
    for triangle in points[faces]:
        polygon, cuts = [], []
        for i in range(3):
            a, b = triangle[i], triangle[(i+1) % 3]
            inside_a = (a[axis] >= limit) if keep_above else (a[axis] <= limit)
            inside_b = (b[axis] >= limit) if keep_above else (b[axis] <= limit)
            if inside_a:
                polygon.append(a)
            if inside_a != inside_b:
                cut = a + (b-a) * ((limit-a[axis])/(b[axis]-a[axis]))
                polygon.append(cut)
                cuts.append(cut)
        for i in range(1, len(polygon)-1):
            triangles.append([polygon[0], polygon[i], polygon[i+1]])
        if len(cuts) == 2:
            segments.append(cuts)
    # Section vertices are paired at triangle boundaries. Quantisation joins
    # numerically equivalent intersections before walking the cap perimeter.
    graph = {}
    for a, b in segments:
        a, b = tuple(np.round(a, 6)), tuple(np.round(b, 6))
        if a == b:
            continue
        graph.setdefault(a, set()).add(b)
        graph.setdefault(b, set()).add(a)
    unused = {tuple(sorted((a, b))) for a in graph for b in graph[a]}
    axes = [i for i in range(3) if i != axis]
    desired = np.zeros(3)
    desired[axis] = -1 if keep_above else 1
    while unused:
        start, following = next(iter(unused))
        loop = [start]
        previous, current = start, following
        unused.discard(tuple(sorted((previous, current))))
        while current != start:
            loop.append(current)
            options = [n for n in graph[current] if tuple(sorted((current, n))) in unused]
            if not options:
                break
            following = options[0]
            unused.discard(tuple(sorted((current, following))))
            previous, current = current, following
        if current != start or len(loop) < 3:
            continue
        vertices = np.array(loop)
        uv = vertices[:, axes]
        area = np.sum(uv[:, 0]*np.roll(uv[:, 1], -1)-np.roll(uv[:, 0], -1)*uv[:, 1])
        order = list(range(len(vertices)))
        sign = 1 if area > 0 else -1
        def cross(a, b):
            return a[0]*b[1]-a[1]*b[0]
        while len(order) > 2:
            found = False
            for i, b in enumerate(order):
                a, c = order[i-1], order[(i+1) % len(order)]
                if sign*cross(uv[b]-uv[a], uv[c]-uv[b]) <= 1e-10:
                    continue
                others = [j for j in order if j not in (a, b, c)]
                if any(all(sign*cross(uv[v]-uv[u], uv[j]-uv[u]) > -1e-9 for u, v in [(a,b),(b,c),(c,a)]) for j in others):
                    continue
                tri = vertices[[a,b,c]].copy()
                if np.dot(np.cross(tri[1]-tri[0], tri[2]-tri[0]), desired) < 0:
                    tri = tri[[0,2,1]]
                triangles.append(tri)
                order.pop(i)
                found = True
                break
            if not found:
                # Collinear perimeter points add no cap area.
                removed = False
                for i, b in enumerate(order):
                    a, c = order[i-1], order[(i+1) % len(order)]
                    if abs(cross(uv[b]-uv[a], uv[c]-uv[b])) < 1e-9:
                        order.pop(i)
                        removed = True
                        break
                if not removed:
                    break
    vertices, inverse = np.unique(np.round(np.array(triangles).reshape(-1,3),6),axis=0,return_inverse=True)
    return vertices, inverse.reshape(-1,3)


def write_asset(key, points, faces, provenance):
    points, normals, faces = shaded_mesh(points, faces)
    extent, minimum = np.ptp(points, axis=0), points.min(0)
    quant = np.rint((points-minimum)/extent*65535).astype('<u2')
    indices = faces.astype('<u2' if len(points) <= 65535 else '<u4')
    # Warm grey stone on raised faces, darker mortar in recessed sculpt detail.
    depth = np.abs(points[:,2]) * (.30/np.ptp(points[:,2]))
    mortar = np.clip((.115-depth)/.055, 0, 1)
    colours = np.array([164,156,139])[None,:]*(1-mortar[:,None]*.40)
    variation = np.sin(np.floor(points[:,0]*7)*12.7+np.floor(points[:,1]*9)*31.3)*.025
    colours = np.clip(colours*(1+variation[:,None]),0,255).astype(np.uint8)
    asset = dict(provenance, id=key, vertices=len(points), triangles=len(faces),
                 minimum=minimum.tolist(), extent=extent.tolist(), indexBytes=indices.dtype.itemsize,
                 positions=base64.b64encode(quant.tobytes()).decode(),
                 normals=base64.b64encode(normals.tobytes()).decode(),
                 indices=base64.b64encode(indices.tobytes()).decode(),
                 colours=base64.b64encode(colours.tobytes()).decode(),
                 geometrySha256=hashlib.sha256(quant.tobytes()+normals.tobytes()+indices.tobytes()).hexdigest())
    output = ROOT / 'assets/models/walls'
    output.mkdir(parents=True, exist_ok=True)
    (output/(key+'.js')).write_text('// Derived from ldid69, Thingiverse 6005201. CC BY-NC-SA; see README.md and LICENSE.txt.\nwindow.HeroQuest.stlAssets = window.HeroQuest.stlAssets || {};\nwindow.HeroQuest.stlAssets['+json.dumps(key)+'] = '+json.dumps(asset,separators=(',',':'))+';\n')
    print(key, len(faces), 'triangles', len(points), 'vertices', 'size', extent.round(3).tolist())
    return points, faces, colours


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = args.source/'files/heroquest_double_wall.stl'
    retained = ROOT/'references/wall-source/ldid69-6005201'
    retained.mkdir(parents=True, exist_ok=True)
    for name in ['LICENSE.txt','README.txt']:
        shutil.copy2(args.source/name, retained/name)
    shutil.copy2(source, retained/source.name)
    output = ROOT/'assets/models/walls'
    output.mkdir(parents=True, exist_ok=True)
    shutil.copy2(args.source/'LICENSE.txt', output/'LICENSE.txt')
    points, faces, encoding, count = read_stl(source)
    source_bounds = bounds(points)
    # Plinth ends below 4mm; above this the source is a narrow stone wall.
    body = points[points[:,2] >= 4]
    centre = (body.max(0)+body.min(0))/2
    scale = 2/np.ptp(body[:,0])
    points, faces = fast_simplification.simplify(points, faces, target_count=7500, agg=5)
    points, faces = clip(points, faces, 2, 4, True)
    points = (points-[centre[0],centre[1],4])*scale
    points = points[:,[0,2,1]]*[1,1,-1]
    # Exact endpoints join on integer grid boundaries after simplification.
    points[:,0] *= 2/np.ptp(points[:,0])
    points[:,0] -= (points[:,0].max()+points[:,0].min())/2
    # A full-width corridor must still accommodate the .82-space hero bases.
    # The freestanding print's thickness is reduced independently for room edges.
    points[:,2] *= .16/np.ptp(points[:,2])
    provenance = dict(sourceFile='ldid69-6005201/heroquest_double_wall.stl',
        sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(), sourceTriangles=count,
        sourceBounds=source_bounds, creator='ldid69', sourceUrl='https://www.thingiverse.com/thing:6005201',
        licence='Creative Commons Attribution - Non-Commercial - Share Alike (version not specified in supplied notice)',
        modifications='Simplified; printing plinth removed at source Z=4mm; rotated/scaled to two spaces; depth reduced independently to .16 spaces for corridor/base clearance; warm stone/recess vertex colours; one-space derivative cropped and capped.')
    full = write_asset('wall-two', points, faces, provenance)
    one_points, one_faces = clip(points, faces, 0, -.5, True)
    one_points, one_faces = clip(one_points, one_faces, 0, .5, False)
    one = write_asset('wall-one', one_points, one_faces, provenance)
    # Offline authoring view only: inspect shape/proportions/colours, not browser QA.
    image = Image.new('RGB',(1000,520),(213,213,204));draw=ImageDraw.Draw(image)
    forward=np.array([.4,.22,.89]);forward/=np.linalg.norm(forward)
    right=np.array([forward[2],0,-forward[0]]);right/=np.linalg.norm(right)
    up=np.cross(forward,right)
    for column,(v,f,c) in enumerate([full,one]):
        uv=v@np.stack([right,up],axis=1)
        uv=(uv-(uv.max(0)+uv.min(0))/2)*[205,-205]+[column*500+250,270]
        centres=v[f].mean(1);norm=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
        norm/=np.maximum(np.linalg.norm(norm,axis=1)[:,None],1e-12)
        light=np.array([-.3,.7,.6]);light/=np.linalg.norm(light)
        brightness=.43+.57*np.maximum(norm@light,0)
        for i in np.argsort(centres@forward):
            colour=np.clip(c[f[i]].mean(0)*brightness[i],0,255).astype(int)
            draw.polygon([tuple(p) for p in uv[f[i]]], fill=tuple(colour))
        draw.text((column*500+20,20),['Two-space wall','One-space wall'][column],fill=(35,40,35))
    (ROOT/'tmp').mkdir(exist_ok=True)
    image.save(ROOT/'tmp/wall-authoring.png')


if __name__ == '__main__':
    main()
