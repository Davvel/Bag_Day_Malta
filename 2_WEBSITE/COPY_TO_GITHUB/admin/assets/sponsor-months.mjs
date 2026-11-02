// Carry a locality's selection and price into newly added months.
export function expandSelection(candidates,previous,selectAll,defaultPrice){
 const localities=new Map();for(const row of previous.values())if(row.selected)localities.set(row.locality_id,row);
 return candidates.map(row=>{const old=previous.get(row.slot_id),local=localities.get(row.locality_id);return{...row,selected:!row.blocked&&(old?old.selected:selectAll||!!local),price:old?.price??local?.price??defaultPrice};});
}
export function monthSummary(rows){const byMonth=new Map();for(const r of rows){const m=r.advertising_month.slice(0,7);byMonth.set(m,(byMonth.get(m)||0)+1);}return [...byMonth].sort(([a],[b])=>a.localeCompare(b));}
