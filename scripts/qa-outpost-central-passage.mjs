import assert from 'node:assert/strict';

/** Check traversable space, original collision, light/power states and budgets
 * against the running engine rather than mirroring the authoring functions. */
export async function verifyCentralPassage(page){
  const result=await page.evaluate(()=>{
    const g=document.querySelector('midnry-fps').engine,r=g.military;
    const level=JSON.stringify(g.level),records=r.centralPassagePresentation.records,errors=[];
    for(const rec of records){
      if(rec.kind==='ceiling'&&rec.min[1]<2.9)errors.push('headroom');
      if(rec.kind==='wall'&&Math.abs(rec.max[1]-rec.min[1]-.38)<1e-5&&rec.max[1]>=2.36)
        errors.push('wayfinding behind existing header');
      if(rec.kind==='floor'&&(rec.max[1]>.05||g.level[Math.floor(rec.p[2]/3)]?.[Math.floor(rec.p[0]/3)]!==0))errors.push('floor');
      if(rec.kind==='wall'){
        const f=rec.face,axis=f.dx?0:2,edge=((f.dx?f.x:f.y)+.5+.5*(f.dx||f.dz))*3;
        if(!g.level[f.y]?.[f.x]||Math.max(Math.abs(rec.min[axis]-edge),Math.abs(rec.max[axis]-edge))>.12)errors.push('wall-face');
      }
    }
    const paths=[[[10.5,10.5],[17.5,10.5]],[[10.5,11.5],[17.5,11.5]],[[13.5,8.5],[13.5,13.5]],[[14.5,8.5],[14.5,13.5]]];
    let blocked=0;
    for(const path of paths){Object.assign(g.player,{x:path[0][0],y:path[0][1]});for(const [x,y]of path.slice(1)){
      const dx=x-g.player.x,dy=y-g.player.y,n=Math.ceil(Math.hypot(dx,dy)/.05);
      for(let i=0;i<n;i++)g.arena.move(g.player,dx/n,dy/n);
      if(Math.hypot(g.player.x-x,g.player.y-y)>.01)blocked++;
    }}
    const preset=g.academy.preset,samples=[];
    try{for(const p of ['performance','balanced','high'])for(const night of [false,true]){
      g.academy.preset=p;r.updateCinematic(night,g.time);samples.push({preset:p,night,bloom:r.bloom.enabled,grade:[...r.grade.uniforms.highlight.value.toArray(),...r.grade.uniforms.shadow.value.toArray(),r.grade.uniforms.saturation.value]});
    }}finally{g.academy.preset=preset;}
    const view=g.protocolView(),power=view.protocol.sabotage.powerUntil;
    view.protocol.sabotage.powerUntil=0;r.updateProtocol(view,g.player);
    const on=r.protocolLightMaterials.map(m=>m.emissiveIntensity);
    view.protocol.sabotage.powerUntil=g.time+60;r.updateProtocol(view,g.player);
    const off=r.protocolLightMaterials.map(m=>m.emissiveIntensity);
    view.protocol.sabotage.powerUntil=power;r.updateProtocol(view,g.player);
    return {records:records.length,errors,blocked,collisionUnchanged:level===JSON.stringify(g.level),samples,on,off,
      phoneBuffer:[r.renderer.domElement.width,r.renderer.domElement.height],atlas:[r.centralPassageAtlas.image.width,r.centralPassageAtlas.image.height],
      maxAnisotropy:r.renderer.capabilities.getMaxAnisotropy(),atlasAnisotropy:r.centralPassageAtlas.anisotropy};
  });
  assert.deepEqual(result.errors,[]);assert.equal(result.blocked,0);assert.equal(result.collisionUnchanged,true);
  assert.ok(result.records>150);assert.deepEqual(result.atlas,[2048,512]);assert.equal(result.atlasAnisotropy,result.maxAnisotropy);
  for(const s of result.samples){assert.equal(s.bloom,s.preset==='high');assert.deepEqual(s.grade,result.samples[0].grade);}
  assert.ok(result.on.every((v,i)=>v>result.off[i]&&v<=1));
  // Additional close-up of the NEW atlas, alongside the matched main-sign
  // captures. Keep the QA camera on an existing walkable corridor tile.
  result.wayfinding=await page.evaluate(()=>{
    const g=document.querySelector('midnry-fps').engine,r=g.military;
    window.equipmentDraw(15.5,33.065/3,-Math.PI/2,Math.atan2(2.12-1.65,3));
    r.renderer.getContext().finish();
    return {calls:r.renderer.info.render.calls,triangles:r.renderer.info.render.triangles,camera:{x:g.player.x,y:g.player.y,a:g.player.a,pitch:g.lookPitch}};
  });
  await page.screenshot({path:'/workspace/screenshots/outpost-central-passage/central-wayfinding-closeup.png',timeout:120000});
  return result;
}
