import {esc} from './data.mjs';
import {localityCentre,validPin} from '../../noticeboard/locations.mjs?v=1.1.144';
import {localityCentres} from '../../noticeboard/locality-centres.mjs?v=1.1.144';
import {loadLeaflet} from '../../noticeboard/map-picker.mjs?v=1.1.144';
export function localityFields(old={}){
 const point=localityCentre({...old,locality_name:old.name});
 const source=validPin(old.center_latitude,old.center_longitude)?old.center_source||'Saved in database':localityCentres.some(r=>r.latitude===point[0]&&r.longitude===point[1])?'Bundled locality starting point':'General Malta starting point';
 return `<fieldset class="locality-location"><legend>Noticeboard map starting point</legend><p class="smalltext muted">The notice editor opens here when choosing a pin. This does not change existing notice pins.</p><div class="grid"><label>Latitude<input id="localityLatitude" type="number" step="any" min="35.7" max="36.2" required value="${point[0]}"></label><label>Longitude<input id="localityLongitude" type="number" step="any" min="14.1" max="14.7" required value="${point[1]}"></label></div><p id="localityPointSource" class="smalltext" role="status">Source: ${esc(source)}</p><div class="toolbar"><button type="button" class="secondary" id="localityMapButton" aria-expanded="false">Adjust on map</button><button type="button" class="secondary" id="localityDefaultPoint">Use bundled starting point</button></div><div id="localityMapPanel" hidden><div id="localityMap" style="height:260px;min-height:260px;position:relative" role="region" aria-label="Locality starting point map"></div><p class="smalltext">Tap the map or drag the pin. You can also pan, then press the button below.</p><button type="button" class="secondary" id="localityMapCentre">Pin at map centre</button></div><p class="smalltext" id="localityMapMessage" role="status">Changes apply only when you save the locality.</p><p class="smalltext muted">Bundled starting points: <a href="https://openadmindata.org/mt/" target="_blank" rel="noopener">Open Admin Data</a> (CC BY 4.0).</p></fieldset>`;
}
export function readLocalityFields(form){
 if(!form.localityPointChanged)return {};
 const lat=form.querySelector('#localityLatitude').value,lon=form.querySelector('#localityLongitude').value;
 if(!validPin(lat,lon))throw Error('Enter a valid latitude and longitude within Malta and Gozo.');
 return {center_latitude:Number(lat),center_longitude:Number(lon)};
}
export function bindLocalityFields(form,old={}){
 const q=s=>form.querySelector(s),lat=q('#localityLatitude'),lon=q('#localityLongitude'),button=q('#localityMapButton'),panel=q('#localityMapPanel'),message=q('#localityMapMessage');
 const owner=form.closest('dialog');let map,marker,closed=false;
 const current=()=>validPin(lat.value,lon.value)?[Number(lat.value),Number(lon.value)]:null;
 const changed=()=>{form.localityPointChanged=true;q('#localityPointSource').textContent='Source: administrator change (not saved yet)';const point=current();if(point&&marker){marker.setLatLng(point);map.panTo(point)}};
 const place=p=>{if(!validPin(p.lat,p.lng))return;lat.value=Number(p.lat.toFixed(6));lon.value=Number(p.lng.toFixed(6));changed()};
 lat.addEventListener('input',changed);lon.addEventListener('input',changed);
 q('#localityDefaultPoint').onclick=()=>{const point=localityCentre({locality_name:q('[name=name]').value});lat.value=point[0];lon.value=point[1];changed()};
 q('#localityMapCentre').onclick=()=>{if(map)place(map.getCenter())};
 owner.addEventListener('close',()=>{closed=true;map?.remove();map=null},{once:true});
 button.onclick=async()=>{
  if(map){panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)map.invalidateSize();return}
  button.disabled=true;
  try{
   const L=await loadLeaflet();if(closed||!form.isConnected||!owner.open)return;
   panel.hidden=false;button.setAttribute('aria-expanded','true');
   map=L.map(q('#localityMap'),{maxBounds:[[35.7,14.1],[36.2,14.7]],minZoom:10,maxZoom:19}).setView(current()||localityCentre({locality_name:old.name}),14);
   const tiles=L.tileLayer(window.BAG_DAY_CONFIG?.mapTileURL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
   const pin=L.divIcon({className:'locality-centre-marker',html:'<span style="display:block;width:22px;height:22px;border:3px solid white;border-radius:50%;background:#cf3030;box-shadow:0 1px 5px #333"></span>',iconSize:[28,28],iconAnchor:[14,14]});
   marker=L.marker(map.getCenter(),{icon:pin,draggable:true,alt:'Locality map starting point'}).addTo(map);
   marker.on('dragend',()=>place(marker.getLatLng()));map.on('click',e=>place(e.latlng));
   tiles.on('tileerror',()=>{message.textContent='Map tiles could not load. You can still edit the coordinates and save.'});
   requestAnimationFrame(()=>{if(!closed)map.invalidateSize()});
  }catch{map?.remove();map=null;panel.hidden=true;button.setAttribute('aria-expanded','false');message.textContent='Map unavailable. You can still edit the coordinates and save.'}
  finally{button.disabled=false}
 };
}
