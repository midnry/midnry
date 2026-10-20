/** Breakwater Command / Operations, tiles x3–7 / y3–8 only.
 * Authored architectural fittings, not production/scanned models. Reuse the
 * approved CC0 substrates and existing static batches. All furniture replaces
 * dressing on the same three solid tiles; no walking cell or objective moves.
 */
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {surfaceMaterial} from './realism-surfaces.js';
import {batchStaticByMaterial} from './static-batches.js';
import {drawAtlasText,signMaterial,textTexture} from './world-text.js';

export const commandStorage = (x,y) => (y === 4 && (x === 5 || x === 6)) || (x === 4 && y === 7);
const LABELS = [['RESCUE COORDINATION',1.65,.55],['OPERATIONS ARCHIVE',2.4,.32]];

function artwork(r) {
  if(r.commandOperationsAtlas) return r.commandOperationsAtlas;
  const canvas=document.createElement('canvas');canvas.width=2048;canvas.height=512;
  const c=canvas.getContext('2d');c.scale(2,2);
  LABELS.forEach(([text,w,h],i)=>{
    c.fillStyle='#233032';c.fillRect(0,i*64,1024,64);
    c.fillStyle='#a4b5af';c.fillRect(0,i*64,10,64);
    c.fillStyle='#e1e5dc';
    if(i===0) {
      // Two equally sized lines on the left of the board, below the meeting
      // console's sightline. No tiny subtitle or change to the console mount.
      for(const [line,word] of ['RESCUE','COORDINATION'].entries())
        drawAtlasText(r,c,word,{y:line*32,height:32,aspect:w/(h/2),margin:48});
    } else drawAtlasText(r,c,text,{y:i*64,aspect:w/h});
  });
  // A printed route-planning diagram: no tiny dummy type, status LEDs or
  // interactive-screen treatment. The actual task terminals stay recognisable.
  c.save();c.translate(0,128);c.fillStyle='#9c9b88';c.fillRect(0,0,1024,128);
  c.strokeStyle='#737e74';c.lineWidth=1;
  for(let x=32;x<1024;x+=64){c.beginPath();c.moveTo(x,0);c.lineTo(x,128);c.stroke();}
  for(let y=16;y<128;y+=32){c.beginPath();c.moveTo(0,y);c.lineTo(1024,y);c.stroke();}
  c.fillStyle='#68736a';
  for(const [x,y,w,h] of [[60,30,72,58],[155,32,42,24],[155,67,42,25],[460,15,70,24],[460,90,70,24],[720,20,48,25],[805,68,95,30]]) c.fillRect(x,y,w,h);
  c.strokeStyle='#364c4e';c.lineWidth=4;c.setLineDash([14,8]);c.beginPath();
  c.moveTo(217,61);c.lineTo(355,61);c.lineTo(420,72);c.lineTo(605,72);c.lineTo(670,51);c.lineTo(912,51);c.stroke();c.setLineDash([]);
  for(const x of [225,600,925]){c.beginPath();c.arc(x,x===600?72:51,11,0,Math.PI*2);c.stroke();}
  c.fillStyle='#ddd9c4';c.fillRect(922,40,6,22);c.fillRect(914,48,22,6);
  c.restore();
  return r.commandOperationsAtlas=textTexture(r,canvas,'Command / original Barlow labels and printed rescue diagram');
}

export function decorateCommandOperations(r,id,ctx) {
  if(id !== 'breakwater') return null;
  const room=r.g.protocolMap.rooms.find(v=>v.id==='command');
  if(!room) return null;
  const {add,box,plane,own,steel,darkSteel,seal,floorMark,concrete,caution,warm,extraFixtures}=ctx;
  const paint=own(surfaceMaterial(r,'plaster',{color:'#aeb5ac',repeat:[1.5,1],roughness:.94,normalStrength:.16}));
  // Painted sheet metal needs a different response from plaster. Reuse only
  // the metal's photographed roughness/normal detail: its rusty colour plate
  // would look like huge masonry tiles on an indoor equipment enclosure.
  const enamel=own(r.material({color:'#70817a',roughness:.84,metalness:.12,
    roughnessMap:r.realismSurfaces.weaponMetal.roughness,
    normalMap:r.realismSurfaces.weaponMetal.normal,normalScale:new THREE.Vector2(.045,.045)}));
  const foldedCase=r.geo('command:folded-metal-case',()=>new RoundedBoxGeometry(1,1,1,2,.009));
  const atlas=artwork(r),letters=own(signMaterial(r,atlas,{world:false,intensity:.18}));
  const paper=own(r.material({map:atlas,color:'#d4d2c4',roughness:.97,metalness:0}));
  const signs=new THREE.Group();signs.name='Command / planning and archive plates';
  const records=[],floorQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2);
  const alongX=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI/2);
  const pipe=r.geo('realism-environment:utility-pipe',()=>new THREE.CylinderGeometry(1,1,1,12));
  function record(g,p,s,q,kind,face,extra={}) {
    if(!g.boundingBox)g.computeBoundingBox();
    const b=g.boundingBox.clone().applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p),q||new THREE.Quaternion(),new THREE.Vector3(...s)));
    records.push({kind,p,min:b.min.toArray(),max:b.max.toArray(),face,...extra});
  }
  function put(g,m,p,s,q=null,kind='ceiling',face=null,shadow=false) {
    add(g,m,p,s,q,shadow);record(g,p,s,q,kind,face);
  }
  function plate(row,p,size,material=letters) {
    const geo=r.geo('command:plate:'+row,()=>{
      const g=new THREE.PlaneGeometry(1,1),uv=g.attributes.uv;
      for(let i=0;i<uv.count;i++)uv.setY(i,row===2?uv.getY(i)*.5:(3-row+uv.getY(i))/4);
      return g;
    });
    const m=new THREE.Mesh(geo,material);m.position.set(...p);m.scale.set(size[0],size[1],1);m.receiveShadow=true;signs.add(m);
    record(geo,p,m.scale.toArray(),null,'solid',null,row<2?{label:LABELS[row][0]}:{});
  }

  // Same opaque storage footprint and cover height as the former tarp stacks.
  // Hardware stays inside the tile edge, including the 35mm-clear letter faces.
  for(const [x,z,w] of [[18,13.5,5.84],[13.5,22.5,2.84]]) {
    put(foldedCase,enamel,[x,1.215,z],[w,2.15,2.84],null,'solid',null,true);
    put(box,darkSteel,[x,.09,z],[w+.04,.15,2.88],null,'solid');
    put(box,steel,[x,2.30,z],[w+.02,.045,2.86],null,'solid');
    for(const u of [-w/2+.08,w/2-.08])
      put(box,darkSteel,[x+u,1.2,z+1.435],[.035,2.13,.02],null,'solid');
    for(const side of [-1,1]) {
      const edge=x+side*(w/2+.016);
      put(box,darkSteel,[edge,1.2,z],[.018,1.85,2.3],null,'solid');
      put(box,enamel,[edge+side*.012,1.2,z],[.012,1.77,2.22],null,'solid');
      for(let v=.42;v<1.32;v+=.15)put(box,seal,[edge+side*.024,v,z],[.01,.024,1.36],null,'solid');
      // Folded return, hinges and recessed latch on the service door.
      for(const dz of [-1.09,1.09])put(box,steel,[edge+side*.023,1.2,z+dz],[.018,1.71,.025],null,'solid');
      for(const v of [.59,1.81])put(box,steel,[edge+side*.028,v,z-.96],[.02,.12,.055],null,'solid');
      put(box,darkSteel,[edge+side*.026,1.52,z+.8],[.02,.27,.08],null,'solid');
    }
  }
  // Large paper planning board on the joined north storage block. A dark
  // surround and matte diagram keep it distinct from the powered terminals.
  put(box,darkSteel,[18,1.34,14.916],[5.55,1.82,.028],null,'solid');
  plate(0,[16.25,1.34,14.955],LABELS[0].slice(1));
  plate(2,[18.99,1.34,14.958],[3.4,1.3],paper);
  for(const x of [15.31,20.69])for(const y of [.54,2.14])
    put(box,steel,[x,y,14.95],[.035,.035,.018],null,'solid');

  // Closed archive drawers; muted latch metal, recessed seams and toe shadow.
  for(const x of [12.85,14.15])for(const y of [.48,1.14,1.72]) {
    put(box,steel,[x,y,23.927],[1.16,y===1.72 ? .42 : .57,.014],null,'solid');
    put(box,darkSteel,[x,y+.09,23.946],[.3,.035,.018],null,'solid');
  }
  plate(1,[13.5,2.04,23.955],LABELS[1].slice(1));

  for(let y=3;y<9;y++)for(let x=3;x<8;x++)if(r.g.level[y][x]===0)
    put(plane,concrete,[(x+.5)*3,.034,(y+.5)*3],[3,3,1],floorQ,'floor');
  // Paint marks the two existing exits and the console's approach; no raised
  // kerbs or furniture in a clear tile, and no replacement navigation trail.
  for(const x of [16.5,19.5])put(plane,floorMark,[x,.039,26.78],[2.7,.065,1],floorQ,'floor');
  for(const z of [19.5,22.5])put(plane,floorMark,[23.78,.039,z],[.065,2.7,1],floorQ,'floor');
  for(const x of [18.97,20.03])put(plane,caution,[x,.04,19.62],[.04,1.05,1],floorQ,'floor');

  // Services stay above 3m and off the existing north conduit and luminaires.
  for(const [z,radius] of [[9.27,.055],[26.65,.075]]) {
    put(pipe,steel,[16.5,3.19,z],[radius,14.7,radius],alongX);
    for(let x=9.5;x<24;x+=1.5)put(box,seal,[x,3.19,z],[.04,radius*2.2,radius*2.2]);
  }
  put(box,darkSteel,[9.45,3.25,18],[.42,.23,17.7]);
  for(let z=9.5;z<27;z+=2)put(box,steel,[9.45,3.25,z],[.45,.255,.045]);
  for(const x of [23.25,23.7])put(box,steel,[x,3.17,18],[.035,.065,17.7]);
  for(let z=9.4;z<27;z+=.7)put(box,darkSteel,[23.475,3.13,z],[.48,.025,.035]);

  // Keep the existing recessed window bays on the east/west walls. This pass
  // only reskins the uninterrupted north/south faces and their material trim.
  function handles(f) {return f.dx===0&&f.x>=3&&f.x<8&&((f.y===2&&f.dz===1)||(f.y===9&&f.dz===-1));}
  function face(f) {
    const at=(u,v,d)=>new THREE.Vector3(u,v,d).applyQuaternion(f.quaternion).add(new THREE.Vector3(f.position[0],0,f.position[2])).toArray();
    const anchor={x:f.x,y:f.y,dx:f.dx,dz:f.dz};
    const wall=(m,u,v,d,w,h,t)=>put(box,m,at(u,v,d),[w,h,t],f.quaternion,'wall',anchor);
    put(plane,paint,at(0,1.75,.018),[2.96,3.46,1],f.quaternion,'wall',anchor);
    if(f.x===4&&f.y===2) {
      // Keep the backs of the existing stocked medical cases clear of this
      // impact strip; the cabinet and all interaction coordinates stay put.
      for(const u of [-1.05,1.05])wall(seal,u,.29,.039,.86,.4,.035);
    } else wall(seal,0,.29,.039,2.96,.4,.035);
    wall(darkSteel,0,.075,.035,2.96,.055,.03);
    wall(steel,0,3.34,.035,2.96,.055,.035);
    for(const u of [-1.46,1.46])wall(darkSteel,u,1.78,.034,.028,3.38,.025);
    // Offset warm practicals from labels/screens. Existing pooled lights and
    // protocol electrical state control them; no additional shadow cameras.
    if((f.x===7&&f.y===2)||(f.x===3&&f.y===9)) {
      wall(darkSteel,.7,2.87,.055,.7,.17,.07);
      wall(warm,.7,2.84,.099,.5,.045,.015);
      const p=at(.7,2.77,.28),fixture={x:p[0],y:p[1],z:p[2],color:'#edd8b6',intensity:3,distance:6};
      extraFixtures.push(fixture);r.protocolFixtures.push(fixture);
    }
  }
  r.commandOperationsPresentation={room:{...room},records,source:'Existing CC0 substrates; original authored room fittings',atlas:LABELS};
  return {handles,face,finish(group){batchStaticByMaterial(signs,32);group.add(signs);}};
}
