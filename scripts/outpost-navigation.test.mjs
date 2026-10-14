import test from 'node:test';
import assert from 'node:assert/strict';
import {navigationGoals,navigationRoutes,chooseNavigation,navigationBearing} from '../public/games/outpost-navigation.js';
import {ProtocolArena,protocolView} from '../public/games/outpost-protocol.js';
import {PROTOCOL_MAP,TRANSPORT_MAP} from '../public/games/outpost-protocol-map.js';
const fresh=()=>new ProtocolArena({humans:Array.from({length:8},(_,i)=>({id:'p'+i,name:'Patrol '+i})),rolePreference:'operator',random:()=>.4});
const view=a=>protocolView(a.snapshot(),a.entities[0].id);
const goals=a=>navigationGoals(view(a),a.entities[0].id);
const transport=()=>{const a=fresh();for(const item of a.protocol.mission.manifest)item.loaded=item.required;const p=a.protocol.mission.loading;Object.assign(a.entities[0],{x:p.x,y:p.y});assert.equal(a.departMission(a.entities[0]),true);return a;};

test('base guidance advances from supplies to loading and boarding without changing mission state',()=>{
 const a=fresh(),before=JSON.stringify(a.snapshot());
 assert.ok(goals(a).every(g=>g.id.startsWith('collect:')));
 assert.ok(goals(a).length>3);assert.equal(JSON.stringify(a.snapshot()),before);
 a.privateFor(a.entities[0]).cargo={supplyId:'surgical',name:'Surgical packs'};
 assert.deepEqual(goals(a).map(g=>g.id),['load']);
 a.privateFor(a.entities[0]).cargo=null;
 for(const item of a.protocol.mission.manifest)item.loaded=item.required;
 assert.deepEqual(goals(a).map(g=>g.id),['depart']);
});
test('unknown bomb alarms never yield charge coordinates; discovered charges get repair routes',()=>{
 const a=fresh(),site=PROTOCOL_MAP.sites.at(-1);
 Object.assign(a.entities[0],{x:3.5,y:5.5});
 a.protocol.bombs.push({...site,id:'hidden-charge'});a.protocol.detonateAt=120;
 const recipient=view(a);assert.deepEqual(recipient.protocol.bombs,[]);
 assert.deepEqual(navigationGoals(recipient,a.entities[0].id),[]);
 a.privateFor(a.entities[0]).discoveredBombs.push('hidden-charge');
 const found=goals(a).filter(g=>g.id.startsWith('defuse:'));assert.deepEqual(found.map(g=>g.id),['defuse:hidden-charge']);
 assert.equal(found[0].x,site.x);
 assert.ok(navigationRoutes(a.level,a.entities[0],found).length===1);
});
test('urgent repairs override manually pinned routine tasks and expire cleanly',()=>{
 const a=fresh();a.protocol.sabotage.powerUntil=20;a.protocol.sabotage.commsUntil=20;
 const routes=navigationRoutes(a.level,a.entities[0],goals(a));
 const routine=routes.find(r=>r.goal.id.startsWith('collect:'));
 assert.ok(routine);assert.ok(chooseNavigation(routes,routine.goal.id).goal.id.startsWith('repair:'));
 a.time=21;assert.ok(goals(a).every(g=>!g.id.startsWith('repair:')));
 assert.equal(chooseNavigation(navigationRoutes(a.level,a.entities[0],goals(a)),routine.goal.id).goal.id,routine.goal.id);
});
test('corridor routing turns around walls and omits unreachable, malformed and out-of-bounds targets',()=>{
 const level=[[1,1,1,1,1],[1,0,1,0,1],[1,0,1,0,1],[1,0,0,0,1],[1,1,1,1,1]],start={x:1.5,y:1.5};
 const routes=navigationRoutes(level,start,[{id:'goal',x:3.5,y:1.5,priority:30},{id:'wall',x:2.5,y:1.5},{id:'outside',x:8,y:2},{id:'nan',x:NaN,y:2}]);
 assert.equal(routes.length,1);assert.equal(routes[0].metres,18);
 assert.deepEqual(routes[0].path[0],{x:1.5,y:2.5});
 for(const p of routes[0].path)assert.equal(level[Math.floor(p.y)][Math.floor(p.x)],0);
 assert.deepEqual(navigationRoutes(level,{x:0,y:0},routes.map(r=>r.goal)),[]);
});
test('compass bearing follows the next corridor turn and stays normalized',()=>{
 const start={x:1.5,y:1.5},path=[{x:1.5,y:2.5},{x:3.5,y:1.5}];
 assert.equal(navigationBearing(start,0,path),Math.PI/2);
 assert.ok(Math.abs(navigationBearing(start,Math.PI/2,path))<1e-9);
 assert.ok(Math.abs(navigationBearing(start,-10,path))<=Math.PI);
});
test('aircraft guidance prioritizes manual flight recovery, then cargo repairs, duties and delivery',()=>{
 const a=transport(),m=a.protocol.mission,v=m.vehicle;
 assert.ok(goals(a).every(g=>g.id.startsWith('flight:')));
 v.autopilot=false;v.pilotId=null;v.cargoDamage=20;
 const urgent=chooseNavigation(navigationRoutes(a.level,a.entities[0],goals(a)));
 assert.equal(urgent.goal.id,'recover-flight');
 v.pilotId=a.entities[1].id;assert.equal(goals(a).some(g=>g.id==='recover-flight'),false);
 assert.ok(goals(a).some(g=>g.id==='repair-cargo'));
 v.autopilot=true;v.pilotId=null;v.arrived=true;v.cargoDamage=0;
 for(const t of m.flightTasks)t.done=true;
 assert.deepEqual(goals(a).map(g=>g.id),['deliver']);
});
test('infiltrators get ordinary work waypoints without crew-only recovery or defuse guidance',()=>{
 const a=transport(),self=a.entities.find(e=>e.team===1);a.protocol.mission.vehicle.autopilot=false;
 a.protocol.mission.vehicle.cargoDamage=10;a.protocol.sabotage.powerUntil=20;
 const list=navigationGoals(protocolView(a.snapshot(),self.id),self.id);
 assert.ok(list.length);assert.ok(list.every(g=>g.id.startsWith('flight:')));
});
test('dead players, meetings, combat and ended rounds clear objective navigation',()=>{
 const a=fresh(),v=view(a),id=a.entities[0].id;
 for(const phase of ['meeting','combat']){v.protocol.phase=phase;assert.deepEqual(navigationGoals(v,id),[]);}
 v.protocol.phase='roam';v.entities[0].hp=0;assert.deepEqual(navigationGoals(v,id),[]);
 v.entities[0].hp=100;v.state='ended';assert.deepEqual(navigationGoals(v,id),[]);
});
test('all public base and aircraft tasks remain reachable by walking; route selection stays stable',()=>{
 for(const map of [PROTOCOL_MAP,TRANSPORT_MAP]){
  const [x,y]=map.spawns[0],start={x,y},targets=map.stations.map(p=>({...p,priority:30,label:p.name}));
  const routes=navigationRoutes(map.level,start,targets);
  assert.equal(routes.length,targets.length);
  const farthest=routes.toSorted((a,b)=>b.metres-a.metres)[0];
  assert.equal(chooseNavigation(routes,null,farthest.goal.id).goal.id,farthest.goal.id);
 }
});
