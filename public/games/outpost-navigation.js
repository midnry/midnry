/** Recipient-safe objective selection and floor-grid routing. This module reads
 * the same private view as Info; it never reads raw roles, bot plans or sites. */
const finite=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
export function navigationGoals(view,selfId,wantMeeting=false){
 const p=view?.protocol,self=p?.self,actor=view?.entities?.find(e=>e.id===selfId),m=p?.mission;
 if(!self||!actor||actor.hp<=0||actor.departed||view.state==='ended'||p.phase!=='roam')return [];
 const operator=self.role==='operator',goals=[],put=(point,id,label,priority)=>{if(finite(point))goals.push({id,label,priority,x:point.x,y:point.y,room:point.room});};
 const v=m?.vehicle,stations=p.stations||[];
 if(wantMeeting&&self.emergenciesLeft>0)put(p.emergency,'meeting-console','Use wired emergency console',4);
 if(operator){
  if(m?.phase==='transport'&&!v.arrived&&!v.autopilot&&!v.pilotId)put(stations.find(s=>s.kind==='helm'),'recover-flight','Take flight control',0);
  for(const bomb of p.bombs||[])put(bomb,'defuse:'+bomb.id,'Disable located charge',2);
  for(const kind of ['power','comms'])if(p.sabotage?.[kind+'Until']>view.time)
   for(const station of stations.filter(s=>kind==='power'?/power|generator/.test(s.kind):/comms|radio|radar/.test(s.kind)))put(station,'repair:'+station.id,kind==='power'?'Restore power':'Restore communications',kind==='power'?5:6);
  if(m?.phase==='transport'&&v.cargoDamage>0)put(stations.find(s=>s.kind==='cargo'),'repair-cargo','Repair medical cargo',8);
  for(const body of p.bodies||[])if(!body.reported&&finite(body))put(body,'report:'+body.id,'Report fallen patrol',3);
 }
 if(!m){for(const task of self.tasks||[])if(!task.done)put(task,'task:'+task.id,task.name,30);return goals;}
 if(m.phase==='base'){
  // An alarm is public; undiscovered charge coordinates are not. Direct the
  // player to known repairs, or leave the search instruction without a trail.
  if(operator&&p.detonateAt!=null&&!(p.bombs||[]).length)return goals;
  if(self.cargo)put(m.loading,'load','Load '+self.cargo.name,15);
  else if(m.manifest.every(i=>i.loaded>=i.required))put(m.loading,'depart','Board the medevac',20);
  else{
   for(const stock of m.supplyStock||[]){const item=m.manifest.find(i=>i.id===stock.supplyId);
    if(stock.stock>0&&item&&item.loaded<item.required)put(stock,'collect:'+stock.id,'Collect '+item.name,30);
   }
   if(!goals.length)put(m.loading,'rally','Rally at the loading pad',40);
  }
 }else if(m.phase==='transport'){
  // Your own duty first; the rest are help once it is done.
  for(const task of m.flightTasks||[])if(!task.done&&(!task.system||!(p.sabotage?.[task.system+'Until']>view.time)))put(task,'flight:'+task.id,(task.mine?'Your duty: ':'')+task.name,task.mine?18:20);
  if(operator&&v.arrived&&v.cargoDamage<=0&&m.flightTasks.every(t=>t.done))put(stations.find(s=>s.kind==='cargo'),'deliver','Deliver medical aid',10);
 }
 return goals;
}

/** One BFS serves every candidate; no game state or collision data is mutated. */
export function navigationRoutes(level,start,goals){
 const h=level?.length,w=level?.[0]?.length;
 if(!w||!h||!finite(start))return [];
 const sx=Math.floor(start.x),sy=Math.floor(start.y),inside=(x,y)=>x>=0&&x<w&&y>=0&&y<h;
 if(!inside(sx,sy)||level[sy][sx]!==0)return [];
 const parent=new Int32Array(w*h).fill(-1),queue=new Int32Array(w*h),origin=sy*w+sx;
 let count=1;queue[0]=origin;parent[origin]=origin;
 for(let i=0;i<count;i++){
  const key=queue[i],x=key%w,y=Math.floor(key/w);
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,n=ny*w+nx;
   if(inside(nx,ny)&&level[ny]?.[nx]===0&&parent[n]===-1){parent[n]=key;queue[count++]=n;}
  }
 }
 const routes=[];
 for(const goal of goals){
  if(!finite(goal))continue;const tx=Math.floor(goal.x),ty=Math.floor(goal.y);
  if(!inside(tx,ty)||parent[ty*w+tx]===-1)continue;
  const path=[];for(let k=ty*w+tx;k!==origin;k=parent[k])path.push({x:k%w+.5,y:Math.floor(k/w)+.5});
  path.reverse();path.push({x:goal.x,y:goal.y});
  let length=0,prev=start;for(const point of path){length+=Math.hypot(point.x-prev.x,point.y-prev.y);prev=point;}
  routes.push({goal,path,metres:length*3});
 }
 return routes;
}
/** Choose a stable tracked target; emergencies always outrank a manual pin. */
export function chooseNavigation(routes,pinned=null,previous=null){
 if(!routes.length)return null;
 const sorted=[...routes].sort((a,b)=>a.goal.priority-b.goal.priority||a.metres-b.metres||a.goal.id.localeCompare(b.goal.id));
 const urgent=sorted[0].goal.priority<10;
 if(!urgent&&pinned){const manual=routes.find(r=>r.goal.id===pinned);if(manual)return manual;}
 const stable=routes.find(r=>r.goal.id===previous&&r.goal.priority===sorted[0].goal.priority);
 return stable||sorted[0];
}
export function navigationBearing(start,angle,path){
 const next=path.find(p=>Math.hypot(p.x-start.x,p.y-start.y)>.24)||path.at(-1);
 if(!next)return 0;const a=Math.atan2(next.y-start.y,next.x-start.x)-angle;
 return Math.atan2(Math.sin(a),Math.cos(a));
}

/** Sample a floor trail in map units (one tile = three metres). Start in the
 * player's current cell, retaining right-angle corridor turns rather than
 * smoothing through cover. This reads only the recipient's selected route. */
export function navigationTrail(level,start,path,{range=8,spacing=.25,offset=.35}={}){
 const walkable=p=>finite(p)&&level?.[Math.floor(p.y)]?.[Math.floor(p.x)]===0;
 if(!walkable(start)||!Array.isArray(path)||!path.length||!(spacing>0)||!(range>0))return {markers:[],end:null};
 let index=0;
 for(let i=0;i<path.length;i++)if(finite(path[i])&&Math.floor(path[i].x)===Math.floor(start.x)&&Math.floor(path[i].y)===Math.floor(start.y))index=Math.min(i+1,path.length-1);
 // Anchor the pattern to tile centres, so walking crops existing floor marks
 // instead of sliding the entire pattern forward at each presentation tick.
 const anchor={x:Math.floor(start.x)+.5,y:Math.floor(start.y)+.5},first=path.slice(index).find(p=>finite(p)&&Math.hypot(p.x-anchor.x,p.y-anchor.y)>1e-6);
 const direction=first?Math.atan2(first.y-anchor.y,first.x-anchor.x):0;
 const progress=(start.x-anchor.x)*Math.cos(direction)+(start.y-anchor.y)*Math.sin(direction);
 const markers=[];let previous=anchor,travelled=0,next=0;
 for(const point of path.slice(index)){
  if(!walkable(point))return {markers:[],end:null};
  const dx=point.x-previous.x,dy=point.y-previous.y,length=Math.hypot(dx,dy);
  if(length<1e-6){previous=point;continue;}
  // A stale route must never draw through newly changed cover or a teleport.
  for(let i=1,n=Math.ceil(length/.1);i<=n;i++)if(!walkable({x:previous.x+dx*i/n,y:previous.y+dy*i/n}))return {markers:[],end:null};
  while(next<=travelled+length&&next-progress<=range){
   const f=(next-travelled)/length;
   if(next-progress>=offset)markers.push({x:previous.x+dx*f,y:previous.y+dy*f,angle:Math.atan2(dy,dx),distance:next-progress});
   next+=spacing;
  }
  travelled+=length;previous=point;
  if(travelled-progress>range)return {markers,end:null};
 }
 return {markers,end:{x:previous.x,y:previous.y}};
}

export class ObjectiveNavigation {
 constructor(g,ui){
  this.g=g;this.ui=ui;this.pinned=null;this.route=null;this.nextUpdate=0;
  this.style=document.createElement('style');this.style.textContent=`
   midnry-fps .mf-navline{display:flex;align-items:center;gap:9px;min-height:24px}
   midnry-fps .mf-navline[hidden]{display:none}
   midnry-fps .mf-navline[data-urgent="true"] .mf-navlabel{color:#ffe1ac}
   midnry-fps .mf-navlabel{min-width:0;flex:1;font:600 12px/1.3 var(--mf-body);overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;white-space:normal}
   midnry-fps .mf-navdistance{flex:0 0 auto;font:500 12px var(--mf-body);color:#c1d0c5;font-variant-numeric:tabular-nums}
   midnry-fps .mf-navactive>b{display:none}
   midnry-fps .mf-navdetails{margin:12px 0}midnry-fps .mf-navdetails select{display:block;width:100%;min-height:44px;margin:10px 0;background:#17251f;color:#eef4ee;border:1px solid #84968b;border-radius:10px;padding:9px}
   midnry-fps .mf-navdetails p{font-size:12px;color:#bccbbb}
   midnry-fps .mf-namesetting{display:flex;align-items:center;gap:10px;min-height:44px}
  `;
  this.line=document.createElement('div');this.line.className='mf-navline';this.line.hidden=true;
  this.label=document.createElement('span');this.label.className='mf-navlabel';this.distance=document.createElement('span');this.distance.className='mf-navdistance';
  this.line.append(this.label,this.distance);ui.context.append(this.line);g.shell.append(this.style);
  this.details=document.createElement('details');this.details.className='mf-navdetails';
  const summary=document.createElement('summary');summary.textContent='Navigation & player names';
  this.select=document.createElement('select');this.select.setAttribute('aria-label','Track an objective');
  this.select.append(new Option('Automatic · next useful objective',''));
  const note=document.createElement('p');note.textContent='Follow the mint trail on the ground. Amber trails mark urgent repairs and reports. The ring marks your destination. Hidden charges appear after you locate them.';
  const names=document.createElement('label');names.className='mf-namesetting';this.names=document.createElement('input');this.names.type='checkbox';
  try{this.names.checked=localStorage.getItem('midnry-outpost-names')!=='off';}catch{this.names.checked=true;}
  names.append(this.names,document.createTextNode('Show visible player names'));
  this.details.append(summary,this.select,note,names);ui.focus.info.append(this.details);
  g.on(this.select,'change',()=>{this.pinned=this.select.value||null;this.nextUpdate=0;this.update(ui.safeView());ui.focus.drawMap();});
  g.on(this.names,'change',()=>{try{localStorage.setItem('midnry-outpost-names',this.names.checked?'on':'off');}catch{}});
 }
 update(view){
  const g=this.g,ui=this.ui,actor=view?.entities?.find(e=>e.id===g.selfId);
  const available=ui.visibleGameplay()&&actor?.hp>0&&!g.deathSequence&&view.protocol?.phase==='roam'&&!ui.piloting;
  if(!available){this.line.hidden=true;ui.context.classList.remove('mf-navactive');this.route=null;return;}
  if(!(view.protocol.sabotage.commsUntil>view.time)||view.protocol.self.emergenciesLeft<=0)this.requestMeeting=false;
  const goals=navigationGoals(view,g.selfId,this.requestMeeting),key=view.roundId+':'+view.mapId+':'+Math.floor(actor.x)+':'+Math.floor(actor.y)+':'+goals.map(t=>t.id+':'+t.priority).join(',');
  const now=performance.now();
  if(key!==this.key||now>=this.nextUpdate){
   this.key=key;this.nextUpdate=now+750;
   this.mapId=view.mapId;this.roundId=view.roundId;
   const routes=navigationRoutes(view.level,actor,goals);
   this.route=chooseNavigation(routes,this.pinned,this.route?.goal.id);
   const optionsKey=goals.map(t=>t.id).join(',');
   if(optionsKey!==this.optionsKey){
    this.optionsKey=optionsKey;this.select.replaceChildren(new Option('Automatic · next useful objective',''));
    for(const t of goals)this.select.append(new Option(t.label,t.id));
    if(this.pinned&&!goals.some(t=>t.id===this.pinned))this.pinned=null;this.select.value=this.pinned||'';
   }
  }
  this.line.hidden=!this.route||!!view.protocol.self.channel;ui.context.classList.toggle('mf-navactive',!this.line.hidden);
  if(!this.route)return;
  const urgent=this.route.goal.priority<10;
  this.line.dataset.urgent=String(urgent);
  this.label.textContent=(urgent?'URGENT · ':'')+this.route.goal.label;
  this.distance.textContent=Math.max(1,Math.round(this.route.metres))+' m';
  this.line.title=this.route.goal.label+' · follow the corridor route';
 }
 drawMap(ctx,scale){
  if(!this.route)return;const p=this.g.player;
  ctx.save();ctx.strokeStyle='#c5ddaf';ctx.lineWidth=2;ctx.setLineDash([4,3]);ctx.beginPath();ctx.moveTo(p.x*scale,p.y*scale);
  for(const point of this.route.path)ctx.lineTo(point.x*scale,point.y*scale);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#d2e3b7';ctx.beginPath();ctx.arc(this.route.goal.x*scale,this.route.goal.y*scale,4,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 dispose(){this.style.remove();this.line.remove();this.details.remove();}
}
