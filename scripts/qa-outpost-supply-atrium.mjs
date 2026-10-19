import assert from 'node:assert/strict';

/** Real-geometry clearance, not a room-wide merged-mesh AABB test. Distances
 * use each transformed triangle's AABB: conservative lower bounds. A passing
 * value proves the letter rectangle is >=20mm from the actual triangles.
 * Integral sign backings are included too. No renderer changes are needed. */
export async function verifySupplyAtrium(page){
  const result=await page.evaluate(()=>{
    const g=document.querySelector('midnry-fps').engine,r=g.military;
    const before=JSON.stringify(g.level),errors=[],records=r.supplyAtriumPresentation.records;
    for(const v of records){
      if(v.kind==='ceiling'&&v.min[1]<2.9)errors.push('headroom');
      if(v.kind==='floor'&&(v.max[1]>.05||g.level[Math.floor(v.p[2]/3)]?.[Math.floor(v.p[0]/3)]!==0))errors.push('floor');
      if(v.kind==='wall'){
        const f=v.face,axis=f.dx?0:2,edge=((f.dx?f.x:f.y)+.5+.5*(f.dx||f.dz))*3;
        if(!g.level[f.y]?.[f.x]||Math.max(Math.abs(v.min[axis]-edge),Math.abs(v.max[axis]-edge))>.16)errors.push('wall');
      }
    }
    let blocked=0;
    for(const [a,b] of [ [[11.5,14.5],[16.5,14.5]],[[13.5,12.5],[13.5,16.5]],[[14.5,12.5],[14.5,16.5]] ]){
      Object.assign(g.player,{x:a[0],y:a[1]});
      const n=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.05),dx=(b[0]-a[0])/n,dy=(b[1]-a[1])/n;
      for(let i=0;i<n;i++)g.arena.move(g.player,dx,dy);
      if(Math.hypot(g.player.x-b[0],g.player.y-b[1])>.01)blocked++;
    }
    g.arena.protocol.match.modifier='night-shift';g.protocolCache=null;r.frameProtocolArena=null;
    window.equipmentDraw(14,14.5,0,0);
    r.world.updateMatrixWorld(true);r.night.root.updateMatrixWorld(true);
    const V=r.camera.position.constructor,M=r.world.matrixWorld.constructor;
    const targets=records.filter(v=>v.label).map(v=>({name:v.label,min:v.min,max:v.max}));
    function bounds(o){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity],p=new V(),a=o.geometry.attributes.position;
      for(let i=0;i<a.count;i++){p.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld);for(let k=0;k<3;k++){min[k]=Math.min(min[k],p.getComponent(k));max[k]=Math.max(max[k],p.getComponent(k));}}
      return {min,max};}
    for(const root of [r.world,r.night.root])root.traverse(o=>{
      if(o.material?.map?.userData.worldText?.title==='Covered Supply Atrium'||o.userData.atriumSign)
        targets.push({name:o.userData.atriumSign||'Covered Supply Atrium',...bounds(o)});
    });
    const distance=(a,b)=>Math.hypot(...[0,1,2].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
    const signMaterials=new Set();
    for(const root of [r.world,r.night.root])root.traverse(o=>{if(o.material?.map===r.supplyAtriumAtlas||o.userData.atriumSign||o.material?.map?.userData.worldText?.title==='Covered Supply Atrium')signMaterials.add(o.material);});
    const checks=targets.map(t=>({...t,minimumMetres:Infinity,nearest:null,trianglesChecked:0}));
    const p=[new V(),new V(),new V()],tmp=new M(),world=new M();
    for(const root of [r.world,r.night.root])root.traverse(o=>{
      if(!o.isMesh||o.isSkinnedMesh||signMaterials.has(o.material)||Array.isArray(o.material))return;
      const geo=o.geometry,a=geo?.attributes.position,index=geo?.index;if(!a)return;
      if(!geo.boundingBox)geo.computeBoundingBox();
      for(let inst=0;inst<(o.isInstancedMesh?o.count:1);inst++){
        world.copy(o.matrixWorld);if(o.isInstancedMesh){o.getMatrixAt(inst,tmp);world.multiply(tmp);}
        const bb=geo.boundingBox.clone().applyMatrix4(world),bound={min:bb.min.toArray(),max:bb.max.toArray()};
        const nearby=checks.filter(t=>distance(t,bound)<.3);if(!nearby.length)continue;
        for(let i=0;i<(index?index.count:a.count);i+=3){
          for(let j=0;j<3;j++)p[j].fromBufferAttribute(a,index?index.getX(i+j):i+j).applyMatrix4(world);
          const tri={min:[0,1,2].map(k=>Math.min(...p.map(v=>v.getComponent(k)))),max:[0,1,2].map(k=>Math.max(...p.map(v=>v.getComponent(k))))};
          for(const t of nearby){const d=distance(t,tri);t.trianglesChecked++;if(d<t.minimumMetres){t.minimumMetres=d;t.nearest={mesh:o.name||o.type,geometry:geo.type,material:o.material.name||o.material.type,triangle:i/3,instance:inst};}}
        }
      }
    });
    return {records:records.length,errors,blocked,collisionUnchanged:before===JSON.stringify(g.level),signClearances:checks,
      atlas:[r.supplyAtriumAtlas.image.width,r.supplyAtriumAtlas.image.height],anisotropy:r.supplyAtriumAtlas.anisotropy,
      maxAnisotropy:r.renderer.capabilities.getMaxAnisotropy(),buffer:[r.renderer.domElement.width,r.renderer.domElement.height]};
  });
  assert.deepEqual(result.errors,[]);assert.equal(result.blocked,0);assert.equal(result.collisionUnchanged,true);
  assert.equal(result.signClearances.length,5);assert.deepEqual(result.atlas,[2048,256]);assert.equal(result.anisotropy,result.maxAnisotropy);
  for(const sign of result.signClearances)assert.ok(Number.isFinite(sign.minimumMetres)&&sign.trianglesChecked>0&&sign.minimumMetres>=.02,JSON.stringify(sign));
  return result;
}
