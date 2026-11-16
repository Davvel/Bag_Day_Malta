const limit=75000;

export async function compressPhoto(file){
 const source=URL.createObjectURL(file);
 const image=new Image();image.src=source;
 try{
  await image.decode();
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
  const encode=(mime,quality)=>new Promise(resolve=>canvas.toBlob(resolve,mime,quality));
  const longest=Math.max(image.naturalWidth,image.naturalHeight);
  let mime='image/webp';
  for(let edge=Math.min(1280,longest);edge>=1;edge=Math.floor(edge*.8)){
   const ratio=edge/longest;
   canvas.width=Math.max(1,Math.round(image.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(image.naturalHeight*ratio));
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.drawImage(image,0,0,canvas.width,canvas.height);
   for(const quality of [.85,.73,.62,.5]){
    let blob=await encode(mime,quality);
    if(mime==='image/webp'&&blob?.type!==mime){mime='image/jpeg';blob=await encode(mime,quality)}
    if(blob?.type===mime&&blob.size>0&&blob.size<=limit)return blob;
   }
  }
  throw Error('Photo preparation failed');
 }finally{URL.revokeObjectURL(source)}
}

export async function sendPhoto(blob,upload){
 const form=new FormData();
 for(const [key,value] of Object.entries(upload.fields))form.append(key,String(value));
 form.append('file',blob,blob.type==='image/webp'?'concern.webp':'concern.jpg');
 const response=await fetch(upload.url,{method:'POST',body:form,signal:AbortSignal.timeout(20000)});
 return response.ok;
}
