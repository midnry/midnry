import test from "node:test";
import assert from "node:assert/strict";
import { ProtocolArena, protocolView, restoreArena } from "../public/games/outpost-protocol.js";
import { beginCombat, canFight } from "../public/games/outpost-protocol-combat.js";
import { battlePreparation, eliminationConfirmation } from "../public/games/outpost-battle-presentation.js";
const fresh = () => new ProtocolArena({ humans: Array.from({length:8},(_,i)=>({id:`p${i}`,name:`Patrol ${i}`})), random:()=>.4 });
const view = (a,e) => protocolView(a.snapshot(),e.id);

test("only a confirmed close-range elimination creates an acknowledgement, private to its attacker", () => {
  const a=fresh(),killer=a.entities.find(e=>e.team===1),victim=a.entities.find(e=>e.team===0);
  const privateState=a.privateFor(killer);privateState.killReadyAt=0;
  Object.assign(killer,{x:3.5,y:5.5});Object.assign(victim,{x:15.5,y:23.5});
  a.eliminate(killer,victim.id);
  assert.equal(eliminationConfirmation(view(a,killer)),null);
  Object.assign(victim,{x:3.8,y:5.5});a.eliminate(killer,victim.id);
  const result=eliminationConfirmation(view(a,killer));
  assert.equal(result.name,victim.name);assert.equal(result.sequence,1);assert.equal(victim.hp,0);
  for(const other of a.entities.filter(e=>e!==killer)) {
    const recipient=view(a,other);
    assert.equal(recipient.protocol.self.lastElimination,null);
    assert.equal(recipient.entities.find(e=>e.id===killer.id).notice,undefined);
  }
  a.eliminate(killer,victim.id);
  assert.deepEqual(eliminationConfirmation(view(a,killer)),result);
  assert.deepEqual(eliminationConfirmation(view(restoreArena(a.snapshot()),killer)),result);
  a.time+=4.1;assert.equal(eliminationConfirmation(view(a,killer)),null);
});

test("battle preparation uses public voted sides even when the accused is an innocent operator", () => {
  const a=fresh(),accused=a.entities.find(e=>e.team===0),self=a.entities.find(e=>e.team===1);
  beginCombat(a,accused);
  const before=JSON.stringify(a.snapshot()),recipient=view(a,self),prep=battlePreparation(recipient,self.id);
  assert.equal(prep.target.id,accused.id);assert.equal(prep.patrol.id,self.id);
  assert.equal(prep.count,7);assert.equal(prep.remaining,5);assert.equal(prep.elapsed,0);
  assert.equal(prep.target.role,undefined);assert.equal(recipient.protocol.revealedRoles,undefined);
  assert.equal(canFight(a,self),false);
  const ammo=self.ammo;a.shoot(self);assert.equal(self.ammo,ammo);
  assert.equal(JSON.stringify(a.snapshot()),before);
  a.time=a.protocol.combat.startsAt-1.5;
  assert.equal(battlePreparation(view(a,self),self.id).remaining,1.5);
  a.time=a.protocol.combat.startsAt;
  assert.equal(battlePreparation(view(a,self),self.id),null);assert.equal(canFight(a,self),true);
});

test("observers, ended rounds, and interrupted combats cannot keep a preparation scene active", () => {
  const a=fresh(),self=a.entities[0];beginCombat(a,a.entities[1]);
  self.hp=0;assert.equal(battlePreparation(view(a,self),self.id),null);
  self.hp=100;a.protocol.phase="roam";assert.equal(battlePreparation(view(a,self),self.id),null);
  a.protocol.phase="combat";a.state="ended";assert.equal(battlePreparation(view(a,self),self.id),null);
});
