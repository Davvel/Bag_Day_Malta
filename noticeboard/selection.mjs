export function selectionIds(value){return (Array.isArray(value)?value:String(value||'').split('|')).filter(Boolean)}
export function matchesSelection(value,filter,{legacyAll=false}={}){const wanted=selectionIds(filter).filter(id=>id!=='all');if(!wanted.length)return true;const ids=selectionIds(value);return (legacyAll&&ids.includes('all'))||wanted.some(id=>ids.includes(id))}
