/** Reproducible game build: licensed soldier sculpt and captured rifle motion. */
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
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
const out=await new GLTFExporter().parseAsync(model,{binary:true,animations,onlyVisible:true});
const result=restoreImages(Buffer.from(out),raw,originals);
writeFileSync('public/games/military/models/operator-v1.glb',result);
console.log(JSON.stringify({operatorBytes:result.length,clips:animations.map(c=>c.name),geometry:'Mixamo Swat sculpt',maps:'original photographed colour and normal maps',animationFPS:30}));
