/** Close-view gloves/forearms use the same sculpt, skinning and photos as the
 * licensed soldier. Geometry/textures stay shared; each hand owns its rig. */
import * as THREE from 'three';
import {clone} from 'three/addons/utils/SkeletonUtils.js';
import {finishActor} from './realism-characters.js';
const key=name=>name.replace(/^.*mixamorig\d*[:_]?/i,'');
const find=(model,name)=>{let b;model.traverse(o=>{if(o.isBone&&key(o.name)===name)b=o;});return b;};
function handGeometry(mesh,side){
 const source=mesh.geometry,ids=source.attributes.skinIndex,weights=source.attributes.skinWeight;
 // Hand, forearm and upper arm: the sleeve then runs off the bottom of the
 // screen (as on a phone's tall view) instead of ending at the elbow, where
 // a cut showed a dark sliver past the cuff. The shoulder end is capped.
 const allowed=mesh.skeleton.bones.map(b=>new RegExp('^'+side+'(Hand|ForeArm|Arm)').test(key(b.name)));
 const includes=i=>{let sum=0;for(let k=0;k<4;k++)if(allowed[ids.getComponent(i,k)])sum+=weights.getComponent(i,k);return sum>.55;};
 const selected=[],order=new Map(),index=source.index;
 for(let i=0;i<(index?.count||source.attributes.position.count);i+=3){
  const tri=[0,1,2].map(k=>index?index.getX(i+k):i+k);if(!tri.every(includes))continue;
  for(const n of tri){if(!order.has(n))order.set(n,order.size);selected.push(order.get(n));}
 }
 if(!selected.length)return null;
 // Close each open edge loop (the shoulder cut) with a fan of its own
 // vertices: one cloth texel for the whole cap, skinned like the rim, lit
 // like the sleeve's top.
 const loops=boundaryLoops(selected),old=[...order.keys()];
 const extra=loops.reduce((n,loop)=>n+loop.length+1,0);
 const read=(attribute,i,k)=>{const array=attribute.array||attribute.data.array;return attribute.isInterleavedBufferAttribute?array[i*attribute.data.stride+attribute.offset+k]:array[i*attribute.itemSize+k];};
 const geo=new THREE.BufferGeometry();
 for(const [name,attribute]of Object.entries(source.attributes)){
  const array=attribute.array||attribute.data.array,size=attribute.itemSize,data=new array.constructor((order.size+extra)*size);
  for(const [from,next]of order)for(let k=0;k<size;k++)data[next*size+k]=read(attribute,from,k);
  let at=order.size;
  for(const loop of loops){
   const first=old[loop[0]];
   for(const v of loop){for(let k=0;k<size;k++)data[at*size+k]=/^uv/.test(name)?read(attribute,first,k):read(attribute,old[v],k);at++;}
   for(let k=0;k<size;k++){
    if(/^skin/.test(name)||/^uv/.test(name))data[at*size+k]=read(attribute,first,k);
    else{let sum=0;for(const v of loop)sum+=read(attribute,old[v],k);data[at*size+k]=sum/loop.length;}
   }
   at++;
  }
  geo.setAttribute(name,new THREE.BufferAttribute(data,size,attribute.normalized));
 }
 const pos=geo.attributes.position,normal=geo.attributes.normal,centre=new THREE.Vector3(),hand=new THREE.Vector3(),a=new THREE.Vector3(),b=new THREE.Vector3(),n=new THREE.Vector3();
 for(let i=0;i<order.size;i++)hand.add(a.fromBufferAttribute(pos,i));hand.divideScalar(order.size);
 const capped=[...selected];
 let at=order.size;
 for(const loop of loops){
  const rim=at,c=at+loop.length;at=c+1;
  centre.fromBufferAttribute(pos,c);n.copy(centre).sub(hand).normalize();
  if(normal)for(let i=rim;i<=c;i++)normal.setXYZ(i,-n.x,-n.y,-n.z);
  for(let i=0;i<loop.length;i++){
   const p=rim+i,q=rim+(i+1)%loop.length;
   a.fromBufferAttribute(pos,p).sub(centre);b.fromBufferAttribute(pos,q).sub(centre);
   capped.push(c,...(a.cross(b).dot(n)>=0?[p,q]:[q,p]));
  }
 }
 geo.setIndex(capped);geo.computeBoundingBox();geo.computeBoundingSphere();return geo;
}
/** Closed loops of edges used by only one triangle (the cut rims). */
function boundaryLoops(triangles){
 const edges=new Map();
 for(let i=0;i<triangles.length;i+=3)for(let k=0;k<3;k++){const a=triangles[i+k],b=triangles[i+(k+1)%3],e=a<b?a+':'+b:b+':'+a;edges.set(e,(edges.get(e)||0)+1);}
 const next=new Map();
 for(const [e,count]of edges){if(count!==1)continue;const [a,b]=e.split(':').map(Number);(next.get(a)||next.set(a,[]).get(a)).push(b);(next.get(b)||next.set(b,[]).get(b)).push(a);}
 const loops=[],seen=new Set();
 for(const start of next.keys()){
  if(seen.has(start))continue;
  const loop=[];let v=start,prev=-1;
  while(v!==undefined&&!seen.has(v)){seen.add(v);loop.push(v);const w=next.get(v).find(u=>u!==prev&&!seen.has(u));prev=v;v=w;}
  if(loop.length>=3)loops.push(loop);
 }
 return loops;
}
/** `source` is the sculpt the arms come from: the operator, or the Locker
 * character you chose (its own gloves and sleeves). */
export function buildRiggedHand(r,parent,x,y,z,source=r.soldier){
 if(!source?.scene.userData.riggedOperator)return null;
 const side=x<0?'Left':'Right',model=clone(source.scene),mixer=new THREE.AnimationMixer(model);
 const idle=source.animations.find(c=>c.name==='Idle'),reload=source.animations.find(c=>c.name==='Reload');
 if(!idle)return null;
 const actions={Idle:mixer.clipAction(idle),Reload:reload?mixer.clipAction(reload):null};actions.Idle.play();mixer.update(0);model.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}});
 const height=new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3()).y;model.scale.multiplyScalar(1.82/height);
 r.handGeometries ||= new Map();const remove=[];
 model.traverse(o=>{
  if(!o.isSkinnedMesh)return;
  if(o.userData.operatorLOD===1){remove.push(o);return;}
  const cacheKey=o.geometry.uuid+':'+side;
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
