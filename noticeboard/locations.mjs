import {localityCentres} from './locality-centres.mjs?v=1.1.127';
export const MALTA_CENTRE=[35.9,14.42];
export const locationKey=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[ħĦ]/g,'h').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function validPin(lat,lon){return lat!==null&&lat!==undefined&&lat!==''&&lon!==null&&lon!==undefined&&lon!==''&&Number.isFinite(Number(lat))&&Number.isFinite(Number(lon))&&Number(lat)>=35.7&&Number(lat)<=36.2&&Number(lon)>=14.1&&Number(lon)<=14.7}
export function localityCentre(page={}){if(validPin(page.center_latitude,page.center_longitude))return [Number(page.center_latitude),Number(page.center_longitude)];const key=locationKey(page.locality_name);const row=localityCentres.find(r=>[r.name,...r.aliases].some(s=>locationKey(s)===key));return row?[row.latitude,row.longitude]:[...MALTA_CENTRE]}
export function mapURL(item){if(!validPin(item.latitude,item.longitude))return '';return 'https://www.google.com/maps/search/?'+new URLSearchParams({api:'1',query:Number(item.latitude)+','+Number(item.longitude)})}
