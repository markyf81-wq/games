"""Crop a narrow, capped stone join from the existing ldid69 wall derivative.

Offline authoring only; uses the numpy/Pillow/fast-simplification environment
documented by prepare_walls.py. The source packed wall is never modified.
"""
import base64
import hashlib
import json
import numpy as np
from prepare_walls import ROOT, clip, write_asset

source = ROOT / 'assets/models/walls/wall-one.js'
text = source.read_text()
assignment = text.index(' = ', text.index('window.HeroQuest.stlAssets['))
asset = json.loads(text[assignment + 3:].rstrip().removesuffix(';'))
points = np.frombuffer(base64.b64decode(asset['positions']), dtype='<u2').reshape(-1, 3) / 65535 * np.array(asset['extent']) + np.array(asset['minimum'])
faces = np.frombuffer(base64.b64decode(asset['indices']), dtype='<u2' if asset['indexBytes'] == 2 else '<u4').reshape(-1, 3)
points, faces = clip(points, faces, 0, -.055, True)
points, faces = clip(points, faces, 0, .055, False)
provenance = {key: value for key, value in asset.items() if key not in {
    'id', 'vertices', 'triangles', 'minimum', 'extent', 'indexBytes',
    'positions', 'normals', 'indices', 'colours', 'geometrySha256'
}}
provenance.update(parentAsset='wall-one', parentGeometrySha256=asset['geometrySha256'],
                  parentFileSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                  joinModification='Cropped and capped the central 0.11-square strip for stone-faced joins; source surface and height preserved.')
write_asset('wall-join', points, faces, provenance)
