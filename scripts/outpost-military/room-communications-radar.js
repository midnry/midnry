/** Breakwater Communications / Radar: x20–24 / y3–8.
 * Original authored fittings, not scanned production assets. The equipment
 * replaces only the two existing solid radar tiles. Objectives, walls, cover
 * height and all walkable cells retain their original gameplay coordinates.
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceMaterial} from './realism-surfaces.js';
import {batchStaticByMaterial} from './static-batches.js';
import {drawAtlasText,signMaterial,textTexture} from './world-text.js';

export const communicationsStorage=(x,y)=>y===5&&(x===22||x===23);
const LABELS=['RADAR / SIGNAL PROCESSING','UPLINK / DISTRIBUTION'];

function artwork(r) {
  if(r.communicationsAtlas)return r.communicationsAtlas;
  const c=document.createElement('canvas');c.width=2048;c.height=256;
  const ctx=c.getContext('2d');ctx.scale(2,2);
  LABELS.forEach((title,i)=>{
    ctx.fillStyle='#263338';ctx.fillRect(0,i*64,1024,64);
    ctx.fillStyle='#9aaca9';ctx.fillRect(0,i*64,10,64);
    ctx.fillStyle='#e0e6de';drawAtlasText(r,ctx,title,{y:i*64,aspect:4.9/.32});
  });
  return r.communicationsAtlas=textTexture(r,c,'Communications / original Barlow equipment identification');
}

export function decorateCommunicationsRadar(r,id,ctx) {
  if(id!=='breakwater')return null;
  const room=r.g.protocolMap.rooms.find(v=>v.id==='communications');
  if(!room)return null;
  const {add,box,plane,own,steel,darkSteel,seal,floorMark,concrete,warm,extraFixtures}=ctx;
  const paint=own(surfaceMaterial(r,'plaster',{color:'#b3bcb8',repeat:[1.5,1],roughness:.94,normalStrength:.16}));
  // Photograph-derived microstructure only; indoor enamel must not inherit
  // the large rust pattern from the source metal's colour texture.
  const enamel=own(r.material({color:'#667b7e',roughness:.82,metalness:.15,
    roughnessMap:r.realismSurfaces.weaponMetal.roughness,
    normalMap:r.realismSurfaces.weaponMetal.normal,normalScale:new THREE.Vector2(.045,.045)}));
  const foldedCase=r.geo('communications:folded-case',()=>new RoundedBoxGeometry(1,1,1,2,.008));
  const letters=own(signMaterial(r,artwork(r),{world:false,intensity:.18}));
  const signs=new THREE.Group();signs.name='Communications / equipment identification';
  const records=[],floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const alongX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
  const alongZ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),Math.PI/2);
  const pipe=r.geo('realism-environment:utility-pipe',()=>new THREE.CylinderGeometry(1,1,1,12));
  function record(g,p,s,q,kind,face,extra={}) {
    if(!g.boundingBox)g.computeBoundingBox();
    const b=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),q||new THREE.Quaternion(),new THREE.Vector3(...s)));
    records.push({kind,p,min:b.min.toArray(),max:b.max.toArray(),face,...extra});
  }
  function put(g,m,p,s,q=null,kind='ceiling',face=null,shadow=false) {
    add(g,m,p,s,q,shadow);record(g,p,s,q,kind,face);
  }
  function plate(row,p,q) {
    const g=r.geo('communications:plate:'+row,()=>{
      const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,(1-row+uv.getY(i))/2);
      return g;
    });
    const m=new THREE.Mesh(g,letters);m.position.set(...p);m.quaternion.copy(q);m.scale.set(4.9,.32,1);m.receiveShadow=true;signs.add(m);
    record(g,p,m.scale.toArray(),q,'solid',null,{label:LABELS[row]});
  }

  // Joined opaque rack bank, 2.29m tall like the former tarp core. Both the
  // rack ends and every hinge remain within solid tiles (22,5) and (23,5).
  put(foldedCase,enamel,[69,1.215,16.5],[5.84,2.15,2.84],null,'solid',null,true);
  put(box,darkSteel,[69,.09,16.5],[5.88,.15,2.88],null,'solid');
  put(box,steel,[69,2.30,16.5],[5.86,.045,2.86],null,'solid');
  for(const side of [-1,1]) {
    const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),side===1?0:Math.PI);
    const at=(u,v,d)=>new THREE.Vector3(u,v,d).applyQuaternion(q).add(new THREE.Vector3(69,0,16.5)).toArray();
    const fit=(m,u,v,d,w,h,t)=>put(box,m,at(u,v,d),[w,h,t],q,'solid');
    // Four service bays: inset chassis, vent slots, rails and recessed handles.
    // No decorative glowing screen that could be mistaken for a task station.
    for(const u of [-2.16,-.72,.72,2.16]) {
      fit(darkSteel,u,1.05,1.426,1.32,1.64,.014);
      for(const v of [.49,.99,1.49]) {
        fit(enamel,u,v,1.438,1.22,.43,.01);
        for(let k=0;k<4;k++)fit(seal,u-.12,v-.11+k*.064,1.447,.72,.019,.008);
        fit(steel,u+.47,v,1.45,.025,.19,.014);
      }
      for(const e of [-.65,.65])fit(steel,u+e,1.05,1.442,.023,1.55,.016);
      for(const v of [.32,1.76])fit(steel,u-.53,v,1.447,.065,.027,.009);
    }
    plate(side===1?0:1,at(0,2.05,1.455),q);
  }
  // Sealed side access doors and metal hinges, all within the same tile edge.
  for(const side of [-1,1]) {
    const x=69+side*2.935;
    put(box,darkSteel,[x,1.2,16.5],[.018,1.9,2.35],null,'solid');
    put(box,enamel,[x+side*.012,1.2,16.5],[.012,1.8,2.25],null,'solid');
    for(let z=15.62;z<17.4;z+=.15)put(box,seal,[x+side*.024,.59,z],[.01,.36,.035],null,'solid');
    for(const y of [.55,1.85])put(box,steel,[x+side*.025,y,15.48],[.016,.13,.065],null,'solid');
    put(box,darkSteel,[x+side*.025,1.45,17.38],[.016,.27,.08],null,'solid');
  }

  // Matte concrete, quiet service boundaries, no change to the route marker.
  for(let y=3;y<9;y++)for(let x=20;x<25;x++)if(r.g.level[y][x]===0)
    put(plane,concrete,[(x+.5)*3,.034,(y+.5)*3],[3,3,1],floorQ,'floor');
  for(const [x,z,w,d]of[[69,14.55,5.7,.055],[69,18.45,5.7,.055],[65.55,16.5,.055,2.7],[72.45,16.5,.055,2.7]])
    put(plane,floorMark,[x,.039,z],[w,d,1],floorQ,'floor');

  // Cooling duct and cable ladders feed the equipment bay above head height.
  // The original luminaires and north-wall conduit keep clear of these runs.
  put(box,darkSteel,[60.45,3.25,18],[.42,.23,17.7]);
  for(let z=9.6;z<27;z+=2.1)put(box,steel,[60.45,3.25,z],[.45,.255,.045]);
  for(const x of [71.5,71.98])put(box,steel,[x,3.19,16.6],[.035,.065,14.4]);
  for(let z=9.6;z<23.8;z+=.65)put(box,darkSteel,[71.74,3.15,z],[.51,.025,.035]);
  for(const x of [71.61,71.78,71.9])put(pipe,seal,[x,3.19,16.6],[.014,14.4,.014],alongZ);
  for(const z of [26.53,26.79]) {
    put(pipe,steel,[67.5,3.18,z],[.045,14.7,.045],alongX);
    for(let x=60.6;x<75;x+=1.5)put(box,seal,[x,3.18,z],[.04,.105,.105]);
  }

  // Preserve east/west recessed windows; replace the uninterrupted north and
  // south walls and the radar terminal bay. This also reroutes its old conduit
  // away from the lettering rather than drawing over a functional screen.
  function handles(f) {
    return (f.dx===0&&f.x>=20&&f.x<25&&((f.y===2&&f.dz===1)||(f.y===9&&f.dz===-1)))||
      (f.x===25&&f.y===6&&f.dx===-1);
  }
  function face(f) {
    const at=(u,v,d)=>new THREE.Vector3(u,v,d).applyQuaternion(f.quaternion).add(new THREE.Vector3(f.position[0],0,f.position[2])).toArray();
    const anchor={x:f.x,y:f.y,dx:f.dx,dz:f.dz};
    const wall=(m,u,v,d,w,h,t)=>put(box,m,at(u,v,d),[w,h,t],f.quaternion,'wall',anchor);
    put(plane,paint,at(0,1.75,.018),[2.96,3.46,1],f.quaternion,'wall',anchor);
    if(f.x===22&&f.y===2) {
      // The cabinet's rear medical-case plates sit close to this wall. Stop
      // the impact strip outside their footprint; keep the stock fixture put.
      for(const u of [-1.05,1.05])wall(seal,u,.26,.035,.86,.34,.026);
    } else wall(seal,0,.26,.035,2.96,.34,.026);
    wall(darkSteel,0,.07,.035,2.96,.055,.03);
    wall(steel,0,3.34,.035,2.96,.055,.035);
    for(const u of [-1.46,1.46])wall(darkSteel,u,1.78,.034,.028,3.38,.025);
    if((f.x===20&&f.y===2)||(f.x===24&&f.y===9)) {
      wall(darkSteel,.65,2.87,.055,.7,.17,.07);
      wall(warm,.65,2.84,.099,.5,.045,.015);
      const p=at(.65,2.77,.28),fixture={x:p[0],y:p[1],z:p[2],color:'#edd8b6',intensity:3,distance:6};
      extraFixtures.push(fixture);r.protocolFixtures.push(fixture);
    }
  }
  r.communicationsPresentation={room:{...room},records,storageTiles:[[22,5],[23,5]],source:'Existing CC0 substrates; original authored room fittings',labels:LABELS};
  return {handles,face,finish(group){batchStaticByMaterial(signs,32);group.add(signs);}};
}
