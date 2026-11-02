// Per-tab request reuse and button cooldown. No listing text is persisted.
const STORAGE_KEY='bag-day-ai-icon-button-v2';
export function createIconState({storage,now=()=>Date.now(),digest=async value=>{const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')}}={}){
 let state={blockedUntil:0,presses:[],entries:[]};
 try{const saved=JSON.parse(storage?.getItem(STORAGE_KEY)||'null');if(saved&&typeof saved==='object')state={blockedUntil:Number(saved.blockedUntil)||0,presses:Array.isArray(saved.presses)?saved.presses.filter(Number.isFinite).slice(-4):[],entries:Array.isArray(saved.entries)?saved.entries.filter(e=>e&&typeof e.key==='string'&&/^[a-f0-9]{64}$/.test(e.key)&&(e.icons===null||Array.isArray(e.icons)&&e.icons.length<=3&&e.icons.every(v=>typeof v==='string'))).slice(-32):[]}}catch{}
 const memory=new Map(state.entries.map(e=>[e.key,e]));
 const save=()=>{state.entries=[...memory.values()].filter(e=>/^[a-f0-9]{64}$/.test(e.key)).slice(-32);try{storage?.setItem(STORAGE_KEY,JSON.stringify(state))}catch{}};
 return {
  remaining(){return Math.max(0,state.blockedUntil-now())},
  press(){const t=now();if(state.blockedUntil>t)return false;state.presses=state.presses.filter(p=>t-p>=0&&t-p<60000);if(state.presses.length>=4){state.blockedUntil=t+60000;state.presses=[];save();return false}state.presses.push(t);save();return true},
  async key(user,context){const input=JSON.stringify(['palette-2',user||'',context]);try{return await digest(input)}catch{return input}},
  get(key){return memory.get(key)},
  remember(key,icons=null){if(memory.has(key))memory.delete(key);memory.set(key,{key,icons});while(memory.size>32)memory.delete(memory.keys().next().value);save()}
 };
}
