export const EDITOR_ROUTES={police:'EditPoliceNoticeBoard',council:'EditCouncilNoticeBoard',church:'EditChurchNoticeBoard'};
export const sectionFromPath=path=>Object.keys(EDITOR_ROUTES).find(s=>new RegExp('^/'+EDITOR_ROUTES[s]+'/?$').test(path))||null;
export function editorURL(page){if(!EDITOR_ROUTES[page.section])throw Error('Unknown noticeboard section');return '/'+EDITOR_ROUTES[page.section]+'/?'+new URLSearchParams({locality:page.locality_id})}
export const localityKey=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').trim().toLocaleLowerCase('en');
export function localityNames(roster,pages,current=''){
 const byKey=new Map();for(const p of pages)if(p.locality_name)byKey.set(localityKey(p.locality_name),p.locality_name);
 for(const row of roster||[]){const name=Array.isArray(row)?row[0]:row.name;if(name)byKey.set(localityKey(name),name)}
 if(current&&!byKey.has(localityKey(current)))byKey.set(localityKey(current),current);
 return [...byKey.values()].sort(new Intl.Collator('en',{sensitivity:'base'}).compare);
}
export function enabledSections(pages,locality){return ['police','council','church'].filter(section=>pages.some(p=>localityKey(p.locality_name)===localityKey(locality)&&p.section===section))}
export function authorisedPages(pages,section){return pages.filter(p=>p.section===section).sort((a,b)=>a.locality_name.localeCompare(b.locality_name,'en',{sensitivity:'base'}))}
export function selectEditorPage(pages,section,wanted=''){const allowed=authorisedPages(pages,section);return allowed.find(p=>p.locality_id===wanted||localityKey(p.locality_name)===localityKey(wanted))||(!wanted&&allowed.length===1?allowed[0]:null)}
