"""Deterministic material-data maps derived from the existing licensed SWAT
atlas. These are authored roughness/metalness masks, not new photographs.
No geometry, colour, UV, dye mask or animation is changed. Requires Pillow.
"""
from pathlib import Path
import json, struct, io, hashlib
from PIL import Image
raw=Path('public/games/military/models/operator-v1.glb').read_bytes()
n=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+n]);binary=raw[28+n:]
def image(index):
    entry=gltf['images'][index];v=gltf['bufferViews'][entry['bufferView']]
    return Image.open(io.BytesIO(binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])).convert('RGB')
body=image(1).resize((512,512),Image.Resampling.LANCZOS)
packed=Image.new('RGB',body.size)
# Explicit atlas regions containing the photographed metal clips/fasteners.
# Cloth colours never define role, and the diffuse atlas remains untouched.
clips=[(78,0,199,72),(484,3,556,61),(497,101,548,149),(911,486,1001,546),(22,552,76,654)]
for y in range(512):
    for x in range(512):
        red,green,blue=body.getpixel((x,y));light=(red*.2126+green*.7152+blue*.0722)/255
        cloth=blue-max(red,green)>3
        rough=.91 if cloth else .94 if light<.11 else .81
        # Restrained roughness variation retains the source's stitched folds.
        rough=max(.73,min(.96,rough+(light-.2)*.035));metal=0
        if any(a<=x*2<b and c<=y*2<d for a,c,b,d in clips) and max(red,green,blue)-min(red,green,blue)<18 and light>.16:
            rough=.46;metal=.65
        packed.putpixel((x,y),(255,round(rough*255),round(metal*255)))
skin=Image.new('RGB',(512,512),(255,194,0))
# Softer oil response in the nose/T-zone, kept within plausible skin roughness.
for y in range(512):
    for x in range(512):
        t=((x-256)/56)**2+((y-199)/52)**2
        rough=.76-.12*max(0,1-t)
        skin.putpixel((x,y),(255,round(rough*255),0))
folder=Path('public/games/military/textures')
for filename,pic in [('benchmark-operator-body-orm.png',packed),('benchmark-operator-skin-roughness.png',skin)]:
    pic.save(folder/filename,optimize=True)
    print(filename,(folder/filename).stat().st_size)
Path('docs/outpost-corridor-benchmark/material-source.json').write_text(json.dumps({'source':'operator-v1.glb / original Mixamo SWAT atlases','sourceSHA256':hashlib.sha256(raw).hexdigest(),'licence':'Adobe Mixamo terms, embedded game use; derivative material masks','generated':['benchmark-operator-body-orm.png','benchmark-operator-skin-roughness.png'],'channels':{'R':'constant 1 (not assigned as AO)','G':'authored roughness','B':'restricted hardware metalness'},'dimensions':[512,512]},indent=2))
