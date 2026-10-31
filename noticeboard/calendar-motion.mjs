// Motion is confined to the grid; native pinch zoom is never simulated or reset.
export async function animateCalendarGrid(surface,direction,phase,reduced=false){
 if(!surface?.animate||reduced)return;
 const frames=phase==='bounce'?[{transform:'translateX(0)'},{transform:`translateX(${-direction*26}px)`,offset:.4},{transform:'translateX(0)'}]:phase==='out'?[{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*16}%)`,opacity:0}]:[{transform:`translateX(${direction*16}%)`,opacity:0},{transform:'translateX(0)',opacity:1}];
 const animation=surface.animate(frames,{duration:phase==='bounce'?300:phase==='out'?120:180,easing:'cubic-bezier(.22,.68,.3,1)',fill:'none'});
 try{await animation.finished}catch{}finally{animation.cancel?.()}
}

// Keep the outgoing month visible while its neighbour slides in beside it.
export async function slideCalendarPages(surface,incoming,direction,reduced=false){
 if(!surface?.animate||!incoming||reduced)return;
 const parent=surface.parentElement;if(!parent)return;
 incoming.classList.add('calendar-incoming');incoming.setAttribute('aria-hidden','true');incoming.inert=true;parent.append(incoming);
 const options={duration:380,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'},animations=[];
 try{
  animations.push(surface.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],options));
  animations.push(incoming.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],options));
  await Promise.all(animations.map(a=>a.finished));
 }catch{}finally{animations.forEach(a=>a.cancel?.());incoming.remove()}
}
