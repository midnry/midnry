/** Central Passage only: tiles x11–16 / y10–11, Breakwater.
 * Original authored fittings, not downloaded production models. Everything
 * hugs an existing wall, clears 2.9m overhead, or is flush floor paint.
 * Reuse the corridor's photographed substrates and existing instance batches. */
import * as THREE from 'three';
import {batchStaticByMaterial} from './static-batches.js';
import {drawAtlasText,signMaterial,textTexture} from './world-text.js';

const LABELS=[
  ['ARMORY  /  RECOVERY STORES',2.55,.38],
  ['SUPPLY ATRIUM  /  MEDEVAC',2.55,.38],
  ['CENTRAL TRANSIT  /  KEEP CLEAR',2.5,.28],
  ['SERVICES  /  CP-01',1.55,.24],
];
function artwork(r){
  if(r.centralPassageAtlas)return r.centralPassageAtlas;
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;
  const c=canvas.getContext('2d');c.scale(2,2);
  LABELS.forEach(([text,w,h],i)=>{
    c.fillStyle='#1b2a2d';c.fillRect(0,i*64,1024,64);
    c.fillStyle=i===2?'#bcad7f':'#9cbfbb';c.fillRect(0,i*64,10,64);
    c.fillStyle='#e1e7df';drawAtlasText(r,c,text,{y:i*64,aspect:w/h});
  });
  return r.centralPassageAtlas=textTexture(r,canvas,'Central Passage / original Barlow wayfinding');
}

export function decorateCentralPassage(r,id,ctx){
  if(id!=='breakwater')return null;
  const room=r.g.protocolMap.rooms.find(v=>v.id==='central-corridor');
  if(!room)return null;
  const {add,box,plane,own,steel,darkSteel,seal,floorMark,concrete,caution,warm,extraFixtures}=ctx;
  const records=[],signs=new THREE.Group();signs.name='Central Passage / wayfinding';
  const labels=own(signMaterial(r,artwork(r),{world:false}));
  const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const alongX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
  const tube=r.geo('realism-environment:utility-pipe',()=>new THREE.CylinderGeometry(1,1,1,12));
  function record(g,p,s,q,kind,face){
    if(!g.boundingBox)g.computeBoundingBox();
    const b=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),q||new THREE.Quaternion(),new THREE.Vector3(...s)));
    records.push({kind,p,min:b.min.toArray(),max:b.max.toArray(),face});
  }
  function put(g,m,p,s,q=null,kind='ceiling',face=null){
    // These fittings receive existing shadows; they need no additional shadow
    // submissions of their own. Architecture retains its opaque cover mesh.
    add(g,m,p,s,q,false);record(g,p,s,q,kind,face);
  }
  function label(row,p,q,kind='wall',face=null){
    const geo=r.geo('central-passage:label:'+row,()=>{
      const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,(3-row+uv.getY(i))/4);
      return g;
    });
    const m=new THREE.Mesh(geo,labels);m.position.set(...p);m.scale.set(LABELS[row][1],LABELS[row][2],1);
    if(q)m.quaternion.copy(q);m.receiveShadow=true;signs.add(m);
    record(geo,p,m.scale.toArray(),q,kind,face);
  }

  // Dry, rough service concrete. Reusing exactly the approved substrate also
  // reuses its uploaded colour/normal/roughness maps, not 12 new texture sets.
  for(let y=10;y<12;y++)for(let x=11;x<17;x++)if(r.g.level[y]?.[x]===0)
    put(plane,concrete,[(x+.5)*3,.034,(y+.5)*3],[3,3,1],floorQ,'floor');
  // Transit edges and thresholds are paint, with no raised collision lip.
  for(const z of [30.36,35.64])for(let x=34;x<51;x+=2.4)
    put(plane,floorMark,[x,.038,z],[1.25,.045,1],floorQ,'floor');
  for(const x of [40.5,43.5])for(const z of [30.13,35.87])
    put(plane,caution,[x,.039,z],[2.68,.085,1],floorQ,'floor');
  label(2,[46.5,.041,34.65],floorQ,'floor');

  // Parallel supply/return pipes and a cable tray run in the ceiling service
  // band, away from the existing centre-line luminaires and door headers.
  for(const [z,radius] of [[30.32,.075],[30.64,.042]]){
    put(tube,steel,[42,3.19,z],[radius,17.8,radius],alongX);
    for(let x=33.5;x<51;x+=1.5)put(box,seal,[x,3.19,z],[.04,radius*2.2,radius*2.2]);
  }
  for(const z of [35.32,35.76])put(box,steel,[42,3.16,z],[17.8,.065,.035]);
  for(let x=33.25;x<51;x+=.7)put(box,darkSteel,[x,3.12,35.54],[.035,.025,.48]);
  put(box,darkSteel,[42,3.3,34.94],[17.8,.21,.28]);
  for(let x=34.5;x<51;x+=3){
    put(box,steel,[x,3.4,33],[.07,.05,5.8]);
    put(box,steel,[x,3.3,34.94],[.045,.235,.31]);
  }

  function handles(f){return f.x+f.dx>=11&&f.x+f.dx<17&&f.y+f.dz>=10&&f.y+f.dz<12;}
  function face(f){
    const at=(u,v,d)=>new THREE.Vector3(u,v,d).applyQuaternion(f.quaternion).add(new THREE.Vector3(f.position[0],0,f.position[2])).toArray();
    const anchor={x:f.x,y:f.y,dx:f.dx,dz:f.dz};
    const wall=(g,m,u,v,d,w,h,t=1)=>put(g,m,at(u,v,d),[w,h,t],f.quaternion,'wall',anchor);
    wall(plane,concrete,0,1.75,.018,2.96,3.46);
    wall(box,seal,0,.28,.038,2.96,.38,.035);
    wall(box,darkSteel,0,.075,.035,2.96,.065,.03);
    wall(box,steel,0,3.34,.035,2.96,.055,.035);
    for(const u of [-1.46,1.46])wall(box,darkSteel,u,1.78,.034,.028,3.38,.025);
    // An insulated utility panel is shallow wall equipment, not a fake door
    // or an interactable. Its muted finish keeps real terminals recognisable.
    if(f.y===12&&f.x===16){
      wall(box,darkSteel,0,1.72,.045,1.75,.73,.045);
      wall(box,steel,0,1.72,.074,1.62,.61,.012);
      for(let k=0;k<7;k++)wall(box,seal,-.57+k*.19,1.7,.083,.095,.025,.007);
      label(3,at(0,2.26,.075),f.quaternion,'wall',anchor);
    }
    // Existing circulation headers start at 2.36m. Keep the complete plate
    // below them so a player looking straight at it never reads through a beam.
    if(f.y===9&&f.x===15)label(0,at(0,2.12,.065),f.quaternion,'wall',anchor);
    if(f.y===12&&f.x===12)label(1,at(0,2.12,.065),f.quaternion,'wall',anchor);
    // Shielded warm practicals balance the existing cool ceiling fill. The
    // existing nearest-light pool selects these; its size and cost stay fixed.
    if((f.y===9&&f.x===12)||(f.y===12&&f.x===15)){
      wall(box,darkSteel,0,2.82,.055,.82,.17,.07);
      wall(box,warm,0,2.79,.098,.62,.055,.015);
      const p=at(0,2.7,.24),fixture={x:p[0],y:p[1],z:p[2],color:'#efd8b4',intensity:3.2,distance:5.5};
      extraFixtures.push(fixture);r.protocolFixtures.push(fixture);
    }
  }
  r.centralPassagePresentation={room:{...room},records,source:'Existing CC0 concrete/metal; original authored fittings',atlas:LABELS};
  return {handles,face,finish(group){batchStaticByMaterial(signs,32);group.add(signs);}};
}
