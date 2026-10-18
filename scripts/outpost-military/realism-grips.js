/** The actual weapon grip drives supporting-palm two-bone IK. */
import * as THREE from 'three';
const find=(model,name)=>{let b;model.traverse(o=>{if(o.isBone&&o.name.replace(/[^a-z0-9]/gi,'').endsWith(name))b=o;});return b;};
function reach(arm,elbow,hand,target,root){
 const a=arm.getWorldPosition(new THREE.Vector3()),b=elbow.getWorldPosition(new THREE.Vector3()),c=hand.getWorldPosition(new THREE.Vector3());
 const l1=a.distanceTo(b),l2=b.distanceTo(c),d=THREE.MathUtils.clamp(a.distanceTo(target),Math.abs(l1-l2)+.003,l1+l2-.003);
 const direction=target.clone().sub(a).normalize(),bend=b.clone().sub(a);bend.addScaledVector(direction,-bend.dot(direction));
 if(bend.lengthSq()<.00001)bend.set(-.4,-1,.1).transformDirection(root.matrixWorld);bend.normalize();
 const along=(l1*l1-l2*l2+d*d)/(2*d),wanted=a.clone().addScaledVector(direction,along).addScaledVector(bend,Math.sqrt(Math.max(0,l1*l1-along*along)));
 const turn=(joint,end,goal)=>{const origin=joint.getWorldPosition(new THREE.Vector3()),from=end.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(),to=goal.clone().sub(origin).normalize();
  const rotation=joint.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from,to));
  joint.quaternion.copy(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));root.updateMatrixWorld(true);
 };turn(arm,elbow,wanted);turn(elbow,hand,target);
}
export function bindWeaponGrip(actor){
 if(!actor.model.userData.riggedOperator)return;actor.root.updateMatrixWorld(true);
 const hand=actor.weaponAnchor,knuckle=find(actor.model,'RightHandMiddle1');if(!hand||!knuckle)return;
 actor.grip={hand,knuckle,orientation:hand.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(actor.root.getWorldQuaternion(new THREE.Quaternion())),arm:find(actor.model,'LeftArm'),elbow:find(actor.model,'LeftForeArm'),support:find(actor.model,'LeftHand'),point:new THREE.Vector3(),palm:new THREE.Vector3()};
}
export function updateWeaponGrip(actor,reload,solveSupport=true){
 const g=actor.grip;if(!g)return false;
 const weapon=actor.equipment;actor.root.updateMatrixWorld(true);
 g.hand.getWorldPosition(g.point);g.knuckle.getWorldPosition(g.palm);g.point.lerp(g.palm,.5);
 const rootQuaternion=actor.root.getWorldQuaternion(new THREE.Quaternion());
 weapon.quaternion.copy(rootQuaternion.clone().invert().multiply(g.hand.getWorldQuaternion(new THREE.Quaternion())).multiply(g.orientation));
 actor.root.worldToLocal(g.point);
 const grip=new THREE.Vector3(0,-.109,-.001).applyQuaternion(weapon.quaternion);weapon.position.copy(g.point).sub(grip);weapon.updateMatrixWorld(true);
 if(solveSupport&&g.arm&&g.elbow&&g.support){
  const t=1-reload,p=reload>0&&t>.13&&t<.82?new THREE.Vector3(0,-.18-(t<.6?.15:0),-.12):new THREE.Vector3(-.035,-.056,-.312);
  p.applyMatrix4(weapon.matrixWorld);reach(g.arm,g.elbow,g.support,p,actor.root);
 }
 return true;
}

/** Place the centre of the supporting palm, preserving its intended world
 * orientation after arm IK. Targeting the wrist and leaving its local rotation
 * untouched makes a captured hand twist when its elbow is repositioned. */
export function placeSupportPalm(actor,target,worldOrientation){
 const g=actor.grip;if(!g?.arm||!g.elbow||!g.support)return false;
 const knuckle=g.supportKnuckle ||= find(actor.model,'LeftHandMiddle1');
 if(!knuckle)return false;
 actor.root.updateMatrixWorld(true);
 const wrist=g.support.getWorldPosition(new THREE.Vector3());
 const palm=knuckle.getWorldPosition(new THREE.Vector3()).lerp(wrist,.5);
 // Bone-local positions may be centimetres inside a scaled glTF. Keep the
 // offset in world metres and change only its orientation.
 const inverse=g.support.getWorldQuaternion(new THREE.Quaternion()).invert();
 const offset=palm.sub(wrist).applyQuaternion(inverse);
 const wristTarget=target.clone().sub(offset.applyQuaternion(worldOrientation));
 reach(g.arm,g.elbow,g.support,wristTarget,actor.root);
 const parent=g.support.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
 g.support.quaternion.copy(parent).multiply(worldOrientation).normalize();
 actor.root.updateMatrixWorld(true);
 return true;
}
