/** Offline, rest-pose-aware motion retargeting. Sources and rights are recorded
 * in scripts/assets/outpost-operator/sources.json; builds never fetch assets. */
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
export function unpackGlb(bytes) {
  const size=bytes.readUInt32LE(12);
  return {json:JSON.parse(bytes.subarray(20,20+size)),bin:bytes.subarray(28+size)};
}
export function packGlb(json,bin) {
  const text=Buffer.from(JSON.stringify(json)), padded=Buffer.alloc(Math.ceil(text.length/4)*4,32);
  text.copy(padded);const data=Buffer.alloc(Math.ceil(bin.length/4)*4);bin.copy(data);
  const out=Buffer.alloc(28+padded.length+data.length);
  out.writeUInt32LE(0x46546c67,0);out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);
  out.writeUInt32LE(padded.length,12);out.writeUInt32LE(0x4e4f534a,16);padded.copy(out,20);
  out.writeUInt32LE(data.length,20+padded.length);out.writeUInt32LE(0x004e4942,24+padded.length);data.copy(out,28+padded.length);
  return out;
}
export async function readMotionAsset(path) {
  const raw=unpackGlb(readFileSync(path)),json=structuredClone(raw.json);
  json.images=[];json.textures=[];
  for(const m of json.materials||[]){
    delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;
    delete m.pbrMetallicRoughness?.baseColorTexture;delete m.pbrMetallicRoughness?.metallicRoughnessTexture;
  }
  const bytes=packGlb(json,raw.bin);
  const gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
  return {gltf,raw};
}
export const jointKey=name=>name.replace(/^.*mixamorig\d*[:_]?/i,'').replace(/[^a-z0-9]/gi,'');
function joints(scene){const map=new Map();scene.traverse(o=>{if(/mixamorig/i.test(o.name))map.set(jointKey(o.name),o);});return map;}
const point=o=>o.getWorldPosition(new THREE.Vector3());
function facing(bones){
  const v=new THREE.Vector3();
  for(const side of ['Left','Right'])v.add(point(bones.get(side+'ToeBase')).sub(point(bones.get(side+'Foot'))));
  return Math.atan2(v.x,v.z);
}
/** Sample captured world-space rotation deltas and recover target-local poses.
 * The sculpt's bone axes, lengths and centimetre/metre units remain intact.
 * Horizontal root motion is removed: game simulation owns collision/movement. */
export function retargetMotion(target,source,name){
  target.updateMatrixWorld(true);source.scene.updateMatrixWorld(true);
  const tb=joints(target),sb=joints(source.scene);
  const basis=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),facing(tb)-facing(sb));
  const inverseBasis=basis.clone().invert(),states=[];
  const ratio=point(tb.get('LeftUpLeg')).distanceTo(point(tb.get('LeftFoot')))/point(sb.get('LeftUpLeg')).distanceTo(point(sb.get('LeftFoot')));
  const sourceHipRest=point(sb.get('Hips'));
  target.traverse(b=>{
    if(!b.isBone)return;const s=sb.get(jointKey(b.name));if(!s)return;
    states.push({bone:b,source:s,position:b.position.clone(),scale:b.scale.clone(),local:b.quaternion.clone(),world:b.getWorldQuaternion(new THREE.Quaternion()),sourceInverse:s.getWorldQuaternion(new THREE.Quaternion()).invert(),worldPosition:point(b),rotations:[],positions:[]});
  });
  const clip=source.animations[0],duration=clip.duration,frames=Math.ceil(duration*30)+1,times=[];
  const mixer=new THREE.AnimationMixer(source.scene),action=mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  for(let frame=0;frame<frames;frame++){
    const t=Math.min(duration,frame/30);times.push(t);action.time=t;mixer.update(0);source.scene.updateMatrixWorld(true);
    for(const state of states){
      const b=state.bone;b.position.copy(state.position);b.scale.copy(state.scale);
      if(jointKey(b.name)==='Hips'){
        const delta=point(state.source).sub(sourceHipRest).applyQuaternion(basis).multiplyScalar(ratio);
        delta.x=delta.z=0;
        const world=state.worldPosition.clone().add(delta);b.parent.worldToLocal(world);b.position.copy(world);state.positions.push(...world.toArray());
      }
      const desired=state.source.getWorldQuaternion(new THREE.Quaternion()).multiply(state.sourceInverse);
      desired.premultiply(basis).multiply(inverseBasis).multiply(state.world);
      b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(desired)).normalize();
      b.updateMatrixWorld(true);state.rotations.push(...b.quaternion.toArray());
    }
  }
  const tracks=[];
  for(const s of states){
    tracks.push(new THREE.QuaternionKeyframeTrack(s.bone.name+'.quaternion',times,s.rotations));
    if(s.positions.length)tracks.push(new THREE.VectorKeyframeTrack(s.bone.name+'.position',times,s.positions));
    s.bone.position.copy(s.position);s.bone.quaternion.copy(s.local);s.bone.scale.copy(s.scale);
  }
  mixer.stopAllAction();target.updateMatrixWorld(true);
  return new THREE.AnimationClip(name,duration,tracks).optimize();
}
/** Keep original photographs embedded after the image-free Node export. */
export function restoreImages(exported,original,materialSources){
  const {json,bin}=unpackGlb(exported),chunks=[bin];let offset=bin.length;
  json.images=[];json.textures=structuredClone(original.json.textures||[]);json.samplers=structuredClone(original.json.samplers||[]);
  for(const image of original.json.images||[]){
    const view=original.json.bufferViews[image.bufferView],data=original.bin.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
    const pad=Buffer.alloc((4-offset%4)%4);chunks.push(pad);offset+=pad.length;
    const id=json.bufferViews.length;json.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length});chunks.push(data);offset+=data.length;
    json.images.push({...image,bufferView:id});
  }
  for(const material of json.materials||[]){
    const old=materialSources.get(material.name);if(!old)continue;
    if(old.pbrMetallicRoughness?.baseColorTexture)material.pbrMetallicRoughness.baseColorTexture=structuredClone(old.pbrMetallicRoughness.baseColorTexture);
    if(old.normalTexture)material.normalTexture={...old.normalTexture,scale:.55};
  }
  json.buffers=[{byteLength:offset}];return packGlb(json,Buffer.concat(chunks));
}
