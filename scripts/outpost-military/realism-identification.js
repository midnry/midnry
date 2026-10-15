/** Small neutral call-sign labels for visible living participants only. */
import * as THREE from 'three';
export class PlayerIdentification {
 constructor(r){
  this.r=r;this.labels=new Map();this.point=new THREE.Vector3();
  this.root=document.createElement('div');this.root.className='mf-playernames';
  this.style=document.createElement('style');this.style.textContent=`
   midnry-fps .mf-playernames{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden}
   midnry-fps .mf-playername{position:absolute;transform:translate(-50%,-100%);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:3px 7px;border-radius:7px;color:#f3f7f1;background:#111b21bd;border:1px solid #b7c6c233;font:600 12px/1.2 var(--mf-body);text-shadow:0 1px 2px #000}
   midnry-fps .mf-playername[hidden]{display:none}
   midnry-fps .mf-playername{border:2px solid var(--mf-player,#b7c6c255)}
   midnry-fps .mf-playername::before{content:attr(data-mark);display:inline-block;margin-right:5px;color:var(--mf-player,#b7c6c2);font-size:11px;line-height:1}
   midnry-fps .mf-playername-accused{border-color:#b79478;background:#35291fed}
   @media(max-width:700px){midnry-fps .mf-playername{max-width:100px;font-size:11px;padding:3px 6px}}
  `;r.g.shell.append(this.style,this.root);
 }
 update(view,camera,takedown){
  const r=this.r,g=r.g,ui=g.protocolUI;
  const enabled=!!view&&ui?.visibleGameplay()&&g.navigation?.names.checked!==false&&!takedown&&!g.deathSequence&&['roam','combat'].includes(view.protocol?.phase)&&!ui.hasDialogOpen();
  this.root.hidden=!enabled;if(!enabled)return;
  const current=new Set();
  for(const e of view.entities){
   if(e.id===camera.id||e.hp<=0||e.departed)continue;current.add(e.id);
   let node=this.labels.get(e.id);if(!node){node=document.createElement('span');node.className='mf-playername';node.hidden=true;this.root.append(node);this.labels.set(e.id,node);}
   const actor=r.actors.get(e.id),distance=Math.hypot(e.x-camera.x,e.y-camera.y);
   let visible=actor?.root.visible&&distance<=(r.protocolPowerOut?2.6:7)&&g.arena.visible(camera,e);
   if(visible){
    if(!actor.nameHead){actor.model.traverse(b=>{if(b.isBone&&b.name.replace(/[^a-z]/gi,'').endsWith('Head'))actor.nameHead=b;});}
    if(actor.nameHead)actor.nameHead.getWorldPosition(this.point);else this.point.set(e.x*3,1.64,e.y*3);
    this.point.y+=.32;this.point.project(r.camera);
    visible=this.point.z>=-1&&this.point.z<=1&&Math.abs(this.point.x)<.96&&Math.abs(this.point.y)<.94;
    if(visible){
     node.style.left=(this.point.x*.5+.5)*100+'%';node.style.top=(-this.point.y*.5+.5)*100+'%';
     const name=String(e.name||'Operator').slice(0,32);if(node.textContent!==name)node.textContent=name;
     // Each seat's colour, so players can say "I saw Blue" (colours carry no role).
     if(e.color&&node.dataset.color!==e.color){node.dataset.color=e.color;node.style.setProperty('--mf-player',e.color);}
     // A shape per colour too, for players who cannot tell the colours apart.
     if(node.dataset.mark!==(e.mark||'●'))node.dataset.mark=e.mark||'●';
     node.classList.toggle('mf-playername-accused',view.protocol?.phase==='combat'&&view.protocol.combat?.targetId===e.id);
    }
   }
   node.hidden=!visible;
  }
  for(const [id,node]of this.labels)if(!current.has(id)){node.remove();this.labels.delete(id);}
 }
 dispose(){this.root.remove();this.style.remove();this.labels.clear();}
}
