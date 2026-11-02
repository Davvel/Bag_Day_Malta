// Motion is confined to the grid; native pinch zoom is never simulated or reset.
export async function animateCalendarGrid(surface,direction,phase,reduced=false){
 if(!surface?.animate||reduced)return;
 const frames=phase==='bounce'?[{transform:'translateX(0)'},{transform:`translateX(${-direction*26}px)`,offset:.4},{transform:'translateX(0)'}]:phase==='out'?[{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*16}%)`,opacity:0}]:[{transform:`translateX(${direction*16}%)`,opacity:0},{transform:'translateX(0)',opacity:1}];
 const animation=surface.animate(frames,{duration:phase==='bounce'?300:phase==='out'?120:180,easing:'cubic-bezier(.22,.68,.3,1)',fill:'none'});
 try{await animation.finished}catch{}finally{animation.cancel?.()}
}

// Finger movement directly turns the current sheet. Native zoom remains native.
export function pageTurnTransform(dx,width=300){return `perspective(900px) translateX(${dx}px) rotateY(${dx/width*22}deg)`}
export async function settleCalendarDrag(surface,reduced=false){
 if(!surface?.style)return;
 const from=surface.style.transform;
 if(from&&surface.animate&&!reduced){const a=surface.animate([{transform:from,filter:surface.style.filter||'none'},{transform:pageTurnTransform(0),filter:'none'}],{duration:180,easing:'ease-out'});try{await a.finished}catch{}finally{a.cancel?.()}}
 surface.style.transform='';surface.style.filter='';delete surface.dataset.dragX;
}

// Complete a page turn from the finger's current position, without snapping back.
export async function slideCalendarPages(surface,incoming,direction,reduced=false){
 if(!surface?.animate||!incoming||reduced)return;
 const parent=surface.parentElement;if(!parent)return;
 incoming.classList.add('calendar-incoming');incoming.setAttribute('aria-hidden','true');incoming.inert=true;parent.append(incoming);
 const from=surface.style?.transform||pageTurnTransform(0),options={duration:340,easing:'cubic-bezier(.2,.8,.2,1)',fill:'forwards'},animations=[];
 try{
  animations.push(surface.animate([{transform:from,filter:surface.style?.filter||'none'},{transform:`perspective(900px) translateX(${-direction*100}%) rotateY(${-direction*24}deg)`,filter:'brightness(.82)'}],options));
  animations.push(incoming.animate([{transform:`perspective(900px) translateX(${direction*100}%) rotateY(${direction*24}deg)`,filter:'brightness(.82)'},{transform:pageTurnTransform(0),filter:'none'}],options));
  await Promise.all(animations.map(a=>a.finished));
 }catch{}finally{animations.forEach(a=>a.cancel?.());incoming.remove();if(surface.style){surface.style.transform='';surface.style.filter='';delete surface.dataset.dragX}}
}
