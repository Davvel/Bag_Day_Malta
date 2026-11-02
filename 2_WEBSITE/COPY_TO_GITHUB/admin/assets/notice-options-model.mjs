export const kinds=['categories','audiences'];
export const normaliseOptions=o=>Object.fromEntries(kinds.map(kind=>[kind,(o[kind]||[]).map(i=>({id:i.id,label:i.label,active:i.active!==false}))]));
export const optionsSignature=o=>JSON.stringify(normaliseOptions(o));
export const permanentOption=id=>id==='all'||id==='other';
export function setOptionDeleted(options,kind,id,deleted){const row=options[kind].find(o=>o.id===id);if(!row||permanentOption(id))throw Error('All and Other are permanent choices');row.active=!deleted;}
export function validateGrid(options){for(const kind of kinds){const labels=new Set();for(const o of options[kind]){if(!o.active)continue;const label=o.label.trim().toLowerCase();if(!label||o.label.length>80)throw Error('Enter a name of 1–80 characters for every active choice.');if(labels.has(label))throw Error('Each active choice must have a unique name.');labels.add(label)}}}
