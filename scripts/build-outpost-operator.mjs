/** Reproducible game build: licensed soldier sculpt and captured rifle motion. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {MeshoptSimplifier} from 'meshoptimizer/simplifier';
import {readMotionAsset,retargetMotion,restoreImages} from './outpost-military/motion-build.mjs';
globalThis.FileReader=class{async readAsArrayBuffer(blob){this.result=await blob.arrayBuffer();this.onloadend?.();}};
const root='scripts/assets/outpost-operator/';
const sources=JSON.parse(readFileSync(root+'sources.json'));
for(const asset of sources.assets){const bytes=readFileSync(root+asset.file);if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw new Error('Invalid operator source: '+asset.file);}
const {gltf,raw}=await readMotionAsset(root+'swat-source.glb');
const model=gltf.scene;
model.rotation.y=Math.PI;
model.userData.originalOperator=true;model.userData.riggedOperator=true;
const originals=new Map();let materialIndex=0;
model.traverse(o=>{
 if(!o.isMesh)return;const m=o.material,old=raw.json.materials.find(x=>x.name===m.name);
 const head=old?.pbrMetallicRoughness?.baseColorTexture?.index!==1;
 m.name=head?'Operator head '+(++materialIndex):'Uniform fabric';
 originals.set(m.name,old);m.userData.riggedOperator=true;m.userData.realismCharacterKind=head?'skin':'uniform';
 m.color.set('#ffffff');m.metalness=0;m.roughness=head?.76:.93;m.side=THREE.FrontSide;
});
const clips=[['Rifle_Aiming_Idle','Idle'],['Rifle_Walk','Walk'],['Rifle_Run','Run'],['Backwards_Rifle_Walk','BackWalk'],['Idle_Crouching_Aiming','Crouch'],['Reloading','Reload'],['Hit_Reaction','Hit'],['Death','Death'],['Being_Strangled','Struggle'],['Stealth_Assassination','Stealth'],['Brutal_Assassination','Grapple'],['Stabbing','Stab']];
const animations=[];
for(const [file,name]of clips){const source=await readMotionAsset(root+file+'.glb');animations.push(retargetMotion(model,source.gltf,name));}
// Index-only LOD preserves the photographed UVs, original vertices, skin
// weights and captured rig. Close views always retain the source sculpt.
await MeshoptSimplifier.ready;
const meshes=[];model.traverse(o=>{if(o.isSkinnedMesh)meshes.push(o);});
let fullTriangles=0,farTriangles=0;
for(const mesh of meshes){
 const geometry=mesh.geometry,index=Uint32Array.from(geometry.index.array);
 const [reduced,error]=MeshoptSimplifier.simplify(index,geometry.attributes.position.array,3,Math.floor(index.length*.45/3)*3,.008,['LockBorder']);
 const lodGeometry=new THREE.BufferGeometry();
 for(const [name,attribute]of Object.entries(geometry.attributes))lodGeometry.setAttribute(name,attribute);
 lodGeometry.setIndex(new THREE.BufferAttribute(reduced,1));
 const lod=mesh.clone(false);lod.name=mesh.name+' distant';lod.geometry=lodGeometry;lod.skeleton=mesh.skeleton;
 mesh.userData.operatorLOD=0;lod.userData.operatorLOD=1;lod.userData.lodError=error;
 mesh.parent.add(lod);fullTriangles+=index.length/3;farTriangles+=reduced.length/3;
}
const out=await new GLTFExporter().parseAsync(model,{binary:true,animations,onlyVisible:true});
const result=restoreImages(Buffer.from(out),raw,originals);
writeFileSync('public/games/military/models/operator-v1.glb',result);
console.log(JSON.stringify({operatorBytes:result.length,fullTriangles,farTriangles,clips:animations.map(c=>c.name),geometry:'Mixamo Swat sculpt',maps:'original photographed colour and normal maps',animationFPS:30}));
