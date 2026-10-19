import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';

/** Check the running scene, including legacy terminals/cabinet labels, rather
 * than only the new authoring records. Triangle AABBs give conservative lower
 * bounds on clearance. Integral equipment housings are not architecture;
 * every wall, trim, jamb, pipe, conduit, ceiling and light remains included. */
export async function verifyCommandOperations(page) {
  const result=await page.evaluate(()=>{
    const g=document.querySelector('midnry-fps').engine,r=g.military;
    const level=JSON.stringify(g.level),records=r.commandOperationsPresentation.records,errors=[];
    for(const v of records) {
      if(v.kind==='ceiling'&&v.min[1]<2.9)errors.push('headroom');
      if(v.kind==='floor'&&(v.max[1]>.05||g.level[Math.floor(v.p[2]/3)]?.[Math.floor(v.p[0]/3)]!==0))errors.push('floor');
      if(v.kind==='solid') {
        const north=v.min[0]>=15&&v.max[0]<=21&&v.min[2]>=12&&v.max[2]<=15;
        const south=v.min[0]>=12&&v.max[0]<=15&&v.min[2]>=21&&v.max[2]<=24;
        if(!north&&!south)errors.push('furniture outside original solid tiles');
      }
      if(v.kind==='wall') {
        const f=v.face,axis=f.dx?0:2,edge=((f.dx?f.x:f.y)+.5+.5*(f.dx||f.dz))*3;
        if(!g.level[f.y]?.[f.x]||Math.max(Math.abs(v.min[axis]-edge),Math.abs(v.max[axis]-edge))>.16)errors.push('wall');
      }
    }
    let blocked=0;
    const routes=[[[3.5,5.5],[7.5,5.5],[7.5,6.5],[9.5,6.5]],[[6.5,5.5],[6.5,10.5]],[[3.5,3.5],[7.5,3.5]],[[7.5,5.5],[7.5,8.5]]];
    for(const route of routes){Object.assign(g.player,{x:route[0][0],y:route[0][1]});for(const [x,y]of route.slice(1)){
      const dx=x-g.player.x,dy=y-g.player.y,n=Math.ceil(Math.hypot(dx,dy)/.05);
      for(let i=0;i<n;i++)g.arena.move(g.player,dx/n,dy/n);
      if(Math.hypot(g.player.x-x,g.player.y-y)>.01)blocked++;
    }}
    g.arena.protocol.match.modifier='night-shift';g.protocolCache=null;r.frameProtocolArena=null;
    window.equipmentDraw(6.5,8.3,-Math.PI/2,.02);r.world.updateMatrixWorld(true);
    const V=r.camera.position.constructor,M=r.world.matrixWorld.constructor;
    const targets=records.filter(v=>v.label).map(v=>({name:v.label,min:v.min,max:v.max}));
    const region=p=>p[0]>=9&&p[0]<=24&&p[2]>=9&&p[2]<=27;
    function bounds(o){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],p=new V(),a=o.geometry.attributes.position;
      for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);for(let k=0;k<3;k++){min[k]=Math.min(min[k],p.getComponent(k));max[k]=Math.max(max[k],p.getComponent(k));}}
      return {min,max};}
    const signs=new Set();
    r.world.traverse(o=>{
      if(o.material?.map===r.commandOperationsAtlas&&o.material?.userData.textEmission)signs.add(o.material);
      if(!o.geometry||!o.material?.map?.userData.worldText?.title)return;
      const b=bounds(o),center=b.min.map((v,i)=>(v+b.max[i])/2);if(!region(center))return;
      targets.push({name:o.material.map.userData.worldText.title,...b});signs.add(o.material);
    });
    for(const id of ['intel-upload','sensor-reset']) {
      const st=r.interactableInstances.find(v=>v.type==='station'&&v.id===id);
      targets.push({name:'Terminal screen / '+id,...bounds(st.screen)});signs.add(st.screen.material);
    }
    // Printed MEDICAL and RADIO labels are baked into the shared equipment
    // mesh. Extract each actual two-triangle atlas plate, including the backs
    // of the four medical cases, so concealed clashes are not skipped.
    const p=[new V(),new V(),new V()],kit=r.interactableKit.material;
    r.world.traverse(o=>{
      if(!o.isMesh||o.material!==kit)return;
      const a=o.geometry.attributes.position,uv=o.geometry.attributes.uv,idx=o.geometry.index;
      for(let i=0;i<(idx?idx.count:a.count);i+=6){
        const ids=Array.from({length:6},(_,j)=>idx?idx.getX(i+j):i+j);if(ids.some(v=>v>=a.count))continue;
        const cells=ids.map(v=>(3-Math.floor(uv.getY(v)*4))*4+Math.floor(uv.getX(v)*4));
        if(!cells.every(v=>v===cells[0])||![4,12].includes(cells[0]))continue;
        const b={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]},point=new V();
        for(const v of ids){point.fromBufferAttribute(a,v).applyMatrix4(o.matrixWorld);for(let k=0;k<3;k++){b.min[k]=Math.min(b.min[k],point.getComponent(k));b.max[k]=Math.max(b.max[k],point.getComponent(k));}}
        const center=b.min.map((v,k)=>(v+b.max[k])/2);if(!region(center))continue;
        targets.push({name:(cells[0]===4?'Printed medical case':'Printed emergency console')+' / '+targets.length,...b});
      }
    });
    const distance=(a,b)=>Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
    const checks=targets.map(t=>({...t,minimumMetres:Infinity,nearest:null,trianglesChecked:0})),tmp=new M(),world=new M();
    r.world.traverse(o=>{
      if(!o.isMesh||o.isSkinnedMesh||signs.has(o.material)||o.material===kit||Array.isArray(o.material))return;
      const geo=o.geometry,a=geo?.attributes.position,index=geo?.index;if(!a)return;
      if(!geo.boundingBox)geo.computeBoundingBox();
      for(let inst=0;inst<(o.isInstancedMesh?o.count:1);inst++){
        world.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(inst,tmp);world.multiply(tmp);}
        const bb=geo.boundingBox.clone().applyMatrix4(world),bound={min:bb.min.toArray(),max:bb.max.toArray()};
        const nearby=checks.filter(t=>distance(t,bound)<3);if(!nearby.length)continue;
        for(let i=0;i<(index?index.count:a.count);i+=3){
          for(let j=0;j<3;j++)p[j].fromBufferAttribute(a,index?index.getX(i+j):i+j).applyMatrix4(world);
          const tri={min:[0,1,2].map(k=>Math.min(...p.map(v=>v.getComponent(k)))),max:[0,1,2].map(k=>Math.max(...p.map(v=>v.getComponent(k))))};
          for(const t of nearby){const d=distance(t,tri);t.trianglesChecked++;if(d<t.minimumMetres){t.minimumMetres=d;t.nearest={mesh:o.name||o.type,geometry:geo.type,material:o.material.name||o.material.type,triangle:i/3,instance:inst};}}
        }
      }
    });
    return {records:records.length,errors,blocked,collisionUnchanged:level===JSON.stringify(g.level),signClearances:checks,
      atlas:[r.commandOperationsAtlas.image.width,r.commandOperationsAtlas.image.height],anisotropy:r.commandOperationsAtlas.anisotropy,
      maxAnisotropy:r.renderer.capabilities.getMaxAnisotropy(),buffer:[r.renderer.domElement.width,r.renderer.domElement.height]};
  });
  // Save diagnostics before asserting, so an actual architectural clash can
  // be located without another long software-rendered loading cycle.
  writeFileSync('/tmp/outpost-command-clearance.json',JSON.stringify(result,null,2));
  assert.deepEqual(result.errors,[]);assert.equal(result.blocked,0);assert.equal(result.collisionUnchanged,true);
  assert.ok(result.signClearances.length>=19,'all 10 primary labels/screens plus nine embedded equipment plates');
  assert.deepEqual(result.atlas,[2048,512]);assert.equal(result.anisotropy,result.maxAnisotropy);
  for(const sign of result.signClearances)assert.ok(Number.isFinite(sign.minimumMetres)&&sign.trianglesChecked>0&&sign.minimumMetres>=.02,JSON.stringify(sign));
  return result;
}
