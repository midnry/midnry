import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { TAKEDOWNS, deathTiming, deathFrame } from "../public/games/outpost-death.js";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { connectionAdvice, testConnection } from "../public/games/outpost-connection.js";
import { AnimationMixer, Box3, Group, Vector3 } from "three";
import { readMotionAsset } from "./outpost-military/motion-build.mjs";
import { bindWeaponGrip, updateWeaponGrip } from "./outpost-military/realism-grips.js";

test("five server-chosen takedowns are delivered only to their victim", () => {
  for (let i = 0; i < 5; i++) {
    const a = new ProtocolArena({
      humans: Array.from({ length: 8 }, (_, i) => ({ id: `p${i}` })),
      rolePreference: "operator",
      random: () => 0.4,
    });
    const victim = a.entities[0],
      killer = a.entities.find((e) => e.team === 1);
    Object.assign(killer, { x: victim.x + 0.1, y: victim.y });
    a.privateFor(killer).killReadyAt = 0;
    a.random = () => i / 5 + 0.01;
    a.eliminate(killer, victim.id);
    assert.equal(victim.hp, 0);
    const state = a.snapshot();
    const view = protocolView(state, victim.id);
    assert.equal(view.protocol.self.deathScene.kind, TAKEDOWNS[i].id);
    assert.deepEqual(Object.keys(view.protocol.self.deathScene).sort(), ["at", "id", "kind"]);
    for (const other of a.entities.filter((e) => e !== victim)) {
      const publicView = protocolView(state, other.id);
      assert.equal(publicView.protocol.self.deathScene, null);
      for (const entity of publicView.entities) assert.equal(entity.deathScene, undefined);
    }
    const restored = restoreArena(state);
    assert.deepEqual(
      protocolView(restored.snapshot(), victim.id).protocol.self.deathScene,
      view.protocol.self.deathScene,
    );
  }
});
test("invalid/distant attacks never create a takedown or change living permissions", () => {
  const a = new ProtocolArena({ rolePreference: "operator", random: () => 0.4 }),
    v = a.entities[0],
    k = a.entities.find((e) => e.team === 1);
  a.privateFor(k).killReadyAt = 0;
  Object.assign(k, { x: 25.5, y: 24.5 });
  a.eliminate(k, v.id);
  assert.equal(v.hp, 100);
  assert.equal(protocolView(a.snapshot(), v.id).protocol.self.deathScene, null);
  a.detach(v.id);
  assert.equal(protocolView(a.snapshot(), v.id).protocol.self.deathScene, null);
});
test("takedown precedes fall, skip preserves fall, and reduced motion stays short", () => {
  for (const kind of TAKEDOWNS) {
    const timing = deathTiming({ kind: kind.id });
    const sequence = {
      at: 100,
      takedownDuration: timing.takedown,
      fallDuration: timing.fall,
      duration: timing.total,
    };
    const early = deathFrame(sequence, 100 + timing.takedown / 2);
    assert.equal(early.stage, "takedown");
    assert.equal(early.fall, 0);
    assert.equal(early.done, false);
    assert.equal(deathFrame(sequence, 100 + timing.takedown).stage, "fall");
    assert.equal(deathFrame(sequence, 100 + timing.total).done, true);
    assert.equal(deathTiming({ kind: kind.id }, true).total, 1050);
  }
  assert.deepEqual(deathTiming(null), { kind: null, takedown: 0, fall: 1200, total: 1200 });
});
test("connection advice warns on delay/jitter/failures even with high Mbps, never blocks play", () => {
  const good = connectionAdvice([31, 33, 32, 30, 34], 8);
  assert.equal(good.quality, "good");
  const lag = connectionAdvice([210, 390, 190, 440, 220], 300);
  assert.equal(lag.quality, "variable");
  assert.match(lag.advice, /available/);
  assert.equal(lag.allowed, undefined);
  assert.equal(connectionAdvice([45, 50, 44], 1).quality, "variable");
  assert.equal(connectionAdvice([], null).quality, "unknown");
  assert.match(connectionAdvice([], null).advice, /still play/);
});
test("bounded HTTP speed probe reads real bytes; save-data skips the download", async () => {
  let clock = 0;
  const requests = [];
  const fetcher = async (url) => {
    requests.push(url);
    clock += 40;
    return {
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(url.includes("download") ? 256 * 1024 : 12),
    };
  };
  const result = await testConnection({ fetcher, now: () => clock });
  assert.equal(result.latency, 40);
  assert.equal(result.jitter, 0);
  assert.ok(result.downloadMbps > 5);
  assert.equal(requests.filter((url) => url.includes("download")).length, 1);
  requests.length = 0;
  await testConnection({ fetcher, now: () => clock, saveData: true });
  assert.equal(
    requests.some((url) => url.includes("download")),
    false,
  );
});
test("rigged operator retains sculpt UVs, embedded surface maps and captured motion", () => {
  const bytes = readFileSync("public/games/military/models/operator-v1.glb");
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  assert.ok(bytes.length < 8 * 1024 * 1024, "browser-sized model");
  const names = json.materials.map((m) => m.name);
  for (const name of ["Uniform fabric", "Operator head 1", "Operator head 2"])
    assert.ok(names.includes(name));
  assert.equal(json.images.length, 4, "original colour and normal maps remain embedded");
  for(const material of json.materials){
    assert.ok(material.pbrMetallicRoughness.baseColorTexture);
    assert.ok(material.normalTexture);
    assert.equal(material.pbrMetallicRoughness.metallicFactor, 0);
    assert.ok(material.pbrMetallicRoughness.roughnessFactor >= .75);
  }
  for(const name of ["Idle","Walk","Run","BackWalk","Crouch","Reload","Hit","Death","Struggle","Stealth","Grapple","Stab"])
    assert.ok(json.animations.some(a=>a.name===name), name);
  assert.ok(!json.animations.some(a=>a.name==='TPose'));
  for (const mesh of json.meshes)
    for (const p of mesh.primitives) {
      assert.ok(p.attributes.JOINTS_0 != null);
      assert.ok(p.attributes.WEIGHTS_0 != null);
      assert.ok(p.attributes.TEXCOORD_0 != null);
    }
});

test("motion preserves bone lengths and skin weights; crouch and death are posed, not bind/T poses", async () => {
  const {gltf}=await readMotionAsset("public/games/military/models/operator-v1.glb");
  let vertices=0;
  gltf.scene.traverse(o=>{
    if(!o.isSkinnedMesh)return;
    const weights=o.geometry.attributes.skinWeight,indices=o.geometry.attributes.skinIndex;
    for(let i=0;i<weights.count;i++){
      let sum=0;for(let j=0;j<4;j++){sum+=weights.getComponent(i,j);assert.ok(indices.getComponent(i,j)<o.skeleton.bones.length);}
      assert.ok(Math.abs(sum-1)<.001);vertices++;
    }
  });
  assert.ok(vertices>10000);
  const mixer=new AnimationMixer(gltf.scene),heights={};
  let hips;gltf.scene.traverse(o=>{if(o.isBone&&o.name.endsWith('Hips'))hips=o;});
  const lengths=new Map();gltf.scene.traverse(o=>{if(o.isBone)lengths.set(o.name,o.position.length());});
  for(const clip of gltf.animations){
    for(const track of clip.tracks){
      assert.ok([...track.values].every(Number.isFinite));
    }
    mixer.stopAllAction();const action=mixer.clipAction(clip).reset().play();
    let origin;
    for(const phase of [0,.5,1]){
      action.time=clip.duration*phase;mixer.update(0);gltf.scene.updateMatrixWorld(true);
      const hip=hips.getWorldPosition(new Vector3());origin ||=hip.clone();
      assert.ok(Math.abs(hip.x-origin.x)<.001&&Math.abs(hip.z-origin.z)<.001,"simulation owns horizontal root movement");
      gltf.scene.traverse(o=>{
        if(o.isBone&&!o.name.endsWith('Hips'))assert.ok(Math.abs(o.position.length()-lengths.get(o.name))<.0001);
        if(o.isSkinnedMesh){o.skeleton.update();o.computeBoundingBox();}
      });
      const size=new Box3().setFromObject(gltf.scene).getSize(new Vector3());
      assert.ok(size.x<3&&size.y<2.2&&size.z<3,clip.name+" has bounded anatomy");
      if((clip.name==='Death'&&phase===1)||(clip.name!=='Death'&&phase===0))heights[clip.name]=size.y;
    }
  }
  assert.ok(heights.Idle>1.6&&heights.Idle<1.9);
  assert.ok(heights.Crouch<heights.Idle*.8);
  assert.ok(heights.Death<.6,"final corpse lies on the floor");
});

test("captured rifle grip remains in the firing palm across crouch and reload poses",async()=>{
  const {gltf}=await readMotionAsset("public/games/military/models/operator-v1.glb");
  gltf.scene.userData.riggedOperator=true;
  const joints=new Map();gltf.scene.traverse(o=>{if(o.isBone)joints.set(o.name.replace(/^mixamorig\d*[:_]?/i,''),o);});
  const actor={root:new Group(),model:gltf.scene,equipment:new Group(),weaponAnchor:joints.get('RightHand')};
  actor.root.add(actor.model,actor.equipment);const mixer=new AnimationMixer(actor.model);
  mixer.clipAction(gltf.animations.find(c=>c.name==='Idle')).play();mixer.update(0);actor.root.updateMatrixWorld(true);
  bindWeaponGrip(actor);assert.ok(actor.grip,"numbered finger joints must bind the palm");
  for(const name of ['Idle','Crouch','Reload']){
    mixer.stopAllAction();const action=mixer.clipAction(gltf.animations.find(c=>c.name===name)).play();action.time=action.getClip().duration*.45;mixer.update(0);
    assert.equal(updateWeaponGrip(actor,name==='Reload'?.6:0),true);
    actor.root.updateMatrixWorld(true);
    const palm=joints.get('RightHand').getWorldPosition(new Vector3()).lerp(joints.get('RightHandMiddle1').getWorldPosition(new Vector3()),.5);
    const grip=actor.equipment.localToWorld(new Vector3(0,-.109,-.001));
    assert.ok(grip.distanceTo(palm)<.001,name+' weapon stays in the firing palm');
  }
});
