// Motion is confined to the grid; native pinch zoom is never simulated or reset.
export async function animateCalendarGrid(surface,direction,phase,reduced=false){
 if(!surface?.animate||reduced)return;
 const frames=phase==='bounce'?[{transform:'translateX(0)'},{transform:`translateX(${-direction*26}px)`,offset:.4},{transform:'translateX(0)'}]:phase==='out'?[{transform:'translateX(0)',opacity:1},{transform:`translateX(${-direction*16}%)`,opacity:0}]:[{transform:`translateX(${direction*16}%)`,opacity:0},{transform:'translateX(0)',opacity:1}];
 const animation=surface.animate(frames,{duration:phase==='bounce'?300:phase==='out'?120:180,easing:'cubic-bezier(.22,.68,.3,1)',fill:'none'});
 try{await animation.finished}catch{}finally{animation.cancel?.()}
}
