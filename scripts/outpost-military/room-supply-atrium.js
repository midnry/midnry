/** Covered Supply Atrium: Breakwater tiles x12–15 / y13–15 only.
 * Original authored fittings, not production models. No new collision or props
 * in a walking lane: dry floor paint, shallow wall equipment, overhead services.
 * All materials share the approved corridor batches and photographed CC0 maps. */
import * as THREE from 'three';
import {batchStaticByMaterial} from './static-batches.js';
import {drawAtlasText,signMaterial,textTexture} from './world-text.js';

const LABELS=[
  ['STAGING A  /  MEDICAL CARGO',2.45,.36],
  ['CARGO MANIFEST',1.5,.25],
  ['DISPATCH  /  FLIGHT DECK',2.4,.34],
];
function artwork(r){
  if(r.supplyAtriumAtlas)return r.supplyAtriumAtlas;
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;
  const c=canvas.getContext('2d');c.scale(2,2);
  LABELS.forEach(([text,w,h],i)=>{
    c.fillStyle='#1b2a2d';c.fillRect(0,i*64,1024,64);
    c.fillStyle=i===1?'#b8ab85':'#9cbfbb';c.fillRect(0,i*64,10,64);
    c.fillStyle='#e1e7df';drawAtlasText(r,c,text,{y:i*64,aspect:w/h});
  });
  return r.supplyAtriumAtlas=textTexture(r,canvas,'Supply Atrium / original Barlow logistics labels');
}

export function decorateSupplyAtrium(r,id,ctx){
  if(id!=='breakwater')return null;
  const room=r.g.protocolMap.rooms.find(v=>v.id==='courtyard');
  if(!room)return null;
  const {add,box,plane,own,steel,darkSteel,seal,floorMark,concrete,caution,warm,extraFixtures}=ctx;
  const records=[],signs=new THREE.Group();signs.name='Supply Atrium / logistics wayfinding';
  const labels=own(signMaterial(r,artwork(r),{world:false}));
  const floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const alongX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
  const tube=r.geo('realism-environment:utility-pipe',()=>new THREE.CylinderGeometry(1,1,1,12));
  function record(g,p,s,q,kind,face,extra={}){
    if(!g.boundingBox)g.computeBoundingBox();
    const b=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),q||new THREE.Quaternion(),new THREE.Vector3(...s)));
    records.push({kind,p,min:b.min.toArray(),max:b.max.toArray(),face,...extra});
  }
  function put(g,m,p,s,q=null,kind='ceiling',face=null){add(g,m,p,s,q,false);record(g,p,s,q,kind,face);}
  function label(row,p,q,face){
    const geo=r.geo('supply-atrium:label:'+row,()=>{
      const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,(3-row+uv.getY(i))/4);
      return g;
    });
    const m=new THREE.Mesh(geo,labels);m.position.set(...p);m.scale.set(LABELS[row][1],LABELS[row][2],1);
    m.quaternion.copy(q);m.receiveShadow=true;signs.add(m);
    record(geo,p,m.scale.toArray(),q,'wall',face,{label:LABELS[row][0]});
  }
  for(let y=13;y<16;y++)for(let x=12;x<16;x++)
    put(plane,concrete,[(x+.5)*3,.034,(y+.5)*3],[3,3,1],floorQ,'floor');
  // Loading bays are paint, not crates placed into non-solid floor tiles.
  // Keep the crossing and all eight original door cells completely open.
  for(const z of [40.05,42.25,45.75,47.35])
    for(const x of [37.5,46.5])put(plane,floorMark,[x,.038,z],[2.15,.055,1],floorQ,'floor');
  for(const x of [36.45,38.55,45.45,47.55])for(const z of [41.15,46.55])
    put(plane,floorMark,[x,.038,z],[.055,2.15,1],floorQ,'floor');
  for(const z of [39.13,47.87])for(const x of [40.5,43.5])
    put(plane,caution,[x,.04,z],[2.65,.09,1],floorQ,'floor');

  // Services run around the perimeter, clear of the centre-line luminaire.
  for(const [z,radius] of [[39.32,.075],[39.58,.04]]){
    put(tube,steel,[42,3.17,z],[radius,11.8,radius],alongX);
    for(let x=36.7;x<48;x+=1.5)put(box,seal,[x,3.17,z],[.04,radius*2.2,radius*2.2]);
  }
  put(box,darkSteel,[42,3.19,47.5],[11.8,.23,.42]);
  for(let x=36.6;x<48;x+=1.5)put(box,steel,[x,3.19,47.5],[.045,.255,.45]);
  for(const x of [36.24,36.65])put(box,steel,[x,3.16,43.5],[.045,.065,8.8]);
  for(let z=39.3;z<48;z+=.65)put(box,darkSteel,[36.445,3.12,z],[.47,.025,.035]);
  for(const z of [40.5,43.5,46.5])put(box,steel,[42,3.4,z],[11.8,.05,.06]);

  function handles(f){return f.x+f.dx>=12&&f.x+f.dx<16&&f.y+f.dz>=13&&f.y+f.dz<16;}
  function face(f){
    const at=(u,v,d)=>new THREE.Vector3(u,v,d).applyQuaternion(f.quaternion).add(new THREE.Vector3(f.position[0],0,f.position[2])).toArray();
    const anchor={x:f.x,y:f.y,dx:f.dx,dz:f.dz};
    const wall=(g,m,u,v,d,w,h,t=1)=>put(g,m,at(u,v,d),[w,h,t],f.quaternion,'wall',anchor);
    wall(plane,concrete,0,1.75,.018,2.96,3.46);
    wall(box,seal,0,.43,.038,2.96,.65,.035);
    wall(box,darkSteel,0,.08,.035,2.96,.065,.03);
    wall(box,steel,0,3.34,.035,2.96,.055,.035);
    for(const u of [-1.46,1.46])wall(box,darkSteel,u,1.78,.034,.028,3.38,.025);
    // Tie-down rails and recessed loading hardware distinguish this room
    // from medical storage. No bright screen or cross mimics a task cabinet.
    if((f.x===11&&f.y===13)||(f.x===16&&f.y===15)){
      for(const v of [.68,1.2]){
        wall(box,steel,0,v,.059,2.55,.085,.025);
        for(let u=-1.1;u<1.2;u+=.28)wall(box,seal,u,v,.077,.055,.042,.007);
      }
    }
    if(f.x===16&&f.y===15){
      wall(box,darkSteel,0,1.88,.049,1.67,.42,.035);
      // Letter face is 38.5mm clear of its integral backing, and all external
      // pipes, lamps and frames are further away. Measured again in real QA.
      label(1,at(0,1.9,.105),f.quaternion,anchor);
    }
    if(f.x===12&&f.y===16)label(0,at(0,2.1,.105),f.quaternion,anchor);
    if(f.x===15&&f.y===12)label(2,at(0,2.45,.105),f.quaternion,anchor);
    if((f.x===12&&f.y===16)||(f.x===15&&f.y===12)){
      wall(box,darkSteel,0,2.99,.055,.8,.16,.07);
      wall(box,warm,0,2.96,.099,.6,.045,.015);
      const p=at(0,2.86,.25),fixture={x:p[0],y:p[1],z:p[2],color:'#efd8b4',intensity:2.6,distance:5};
      extraFixtures.push(fixture);r.protocolFixtures.push(fixture);
    }
  }
  r.supplyAtriumPresentation={room:{...room},records,source:'Existing CC0 concrete/metal; original authored fittings',atlas:LABELS};
  return {handles,face,finish(group){batchStaticByMaterial(signs,32);group.add(signs);}};
}
