/** Close-view gloves/forearms use the same sculpt, skinning and photos as the
 * licensed soldier. Geometry/textures stay shared; each hand owns its rig. */
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {finishActor} from './realism-characters.js';
const key=name=>name.replace(/^.*mixamorig\d*[:_]?/i,'');
const find=(model,name)=>{let b;model.traverse(o=>{if(o.isBone&&key(o.name)===name)b=o;});return b;};
function handGeometry(mesh,side){
 const source=mesh.geometry,ids=source.attributes.skinIndex,weights=source.attributes.skinWeight;
 const allowed=mesh.skeleton.bones.map(b=>new RegExp('^'+side+'(Hand|ForeArm)').test(key(b.name)));
 const includes=i=>{let sum=0;for(let k=0;k<4;k++)if(allowed[ids.getComponent(i,k)])sum+=weights.getComponent(i,k);return sum>.55;};
 const selected=[],order=new Map(),index=source.index;
 for(let i=0;i<(index?.count||source.attributes.position.count);i+=3){
  const tri=[0,1,2].map(k=>index?index.getX(i+k):i+k);if(!tri.every(includes))continue;
  for(const n of tri){if(!order.has(n))order.set(n,order.size);selected.push(order.get(n));}
 }
 if(!selected.length)return null;
 const geo=new THREE.BufferGeometry();
 for(const [name,attribute]of Object.entries(source.attributes)){
  const array=attribute.array||attribute.data.array,data=new array.constructor(order.size*attribute.itemSize);
  for(const [old,next]of order)for(let k=0;k<attribute.itemSize;k++)data[next*attribute.itemSize+k]=attribute.isInterleavedBufferAttribute?array[old*attribute.data.stride+attribute.offset+k]:array[old*attribute.itemSize+k];
  geo.setAttribute(name,new THREE.BufferAttribute(data,attribute.itemSize,attribute.normalized));
 }
 geo.setIndex(selected);geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
export function buildRiggedHand(r,parent,x,y,z){
 if(!r.soldier?.scene.userData.riggedOperator)return null;
 const side=x<0?'Left':'Right',model=clone(r.soldier.scene),mixer=new THREE.AnimationMixer(model);
 const idle=r.soldier.animations.find(c=>c.name==='Idle'),reload=r.soldier.animations.find(c=>c.name==='Reload');
 const actions={Idle:mixer.clipAction(idle),Reload:reload?mixer.clipAction(reload):null};actions.Idle.play();mixer.update(0);model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const height=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;model.scale.multiplyScalar(1.82/height);
 r.handGeometries ||= new Map();const remove=[];
 model.traverse(o=>{
  if(!o.isSkinnedMesh)return;const cacheKey=o.geometry.uuid+':'+side;
  if(!r.handGeometries.has(cacheKey)){const geo=handGeometry(o,side);r.handGeometries.set(cacheKey,geo);if(geo)r.geometries.set('hand:'+cacheKey,geo);}
  const geo=r.handGeometries.get(cacheKey);if(!geo)remove.push(o);else o.geometry=geo;
 });for(const object of remove)object.removeFromParent();
 finishActor(r,model,{x:0,y:0});
 const group=new THREE.Group();group.name=side+' captured glove';group.userData.weaponMoving=true;group.position.set(x,y,z);group.add(model);parent.add(group);
 const hand=find(model,side+'Hand'),knuckle=find(model,side+'HandMiddle1')||hand;
 group.userData.handRig={r,model,mixer,actions,hand,knuckle,palm:new THREE.Vector3(),point:new THREE.Vector3(),sample:null};
 updateRiggedHand(group,0,0);return group;
}
export function updateRiggedHand(group,reload,time){
 const h=group?.userData.handRig;if(!h)return;
 const sample=Math.floor(time*30),key=(reload>0?'reload:':'idle:')+sample;
 if(key===h.sample)return;h.sample=key;h.mixer.stopAllAction();
 const action=reload>0&&h.actions.Reload?h.actions.Reload:h.actions.Idle;
 action.reset().setEffectiveWeight(1).setEffectiveTimeScale(0).play();
 action.time=h.r.motion.matches?0:reload>0?(1-reload)*action.getClip().duration:time%action.getClip().duration;
 h.mixer.update(0);h.model.position.set(0,0,0);group.updateWorldMatrix(true,true);
 h.hand.getWorldPosition(h.palm);h.knuckle.getWorldPosition(h.point);h.palm.lerp(h.point,.5);group.worldToLocal(h.palm);
 h.model.position.copy(h.palm).negate();group.updateWorldMatrix(true,true);
}
export function disposeRiggedHands(root){
 const skeletons=new Set();root.traverse(o=>{if(o.userData.handRig)o.userData.handRig.mixer.stopAllAction();if(o.isSkinnedMesh)skeletons.add(o.skeleton);});
 for(const skeleton of skeletons)skeleton.dispose();
}
