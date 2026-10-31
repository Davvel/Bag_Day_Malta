import {esc,icon} from './shared.mjs?v=1.1.127';
import {localityCentre,validPin} from './locations.mjs?v=1.1.127';
let leafletTask;
function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(!leafletTask)leafletTask=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='/noticeboard/vendor/leaflet/leaflet.css?v=1.1.127';document.head.append(css);
  const script=document.createElement('script');script.src='/noticeboard/vendor/leaflet/leaflet.js?v=1.1.127';script.onload=()=>resolve(window.L);script.onerror=()=>{leafletTask=null;reject(Error('Map library unavailable'))};document.head.append(script);
 });return leafletTask;
}
export function locationFields(item={}){const hasPin=validPin(item.latitude,item.longitude);return `<label><span>Where <span class="notice-required">*</span></span><input name="where_text" required maxlength="300" placeholder="Venue, address or meeting point" value="${esc(item.where_text||'')}"></label><input type="hidden" name="latitude" value="${hasPin?esc(item.latitude):''}"><input type="hidden" name="longitude" value="${hasPin?esc(item.longitude):''}"><div class="location-actions"><button type="button" class="secondary" id="chooseMapPin">${icon('pin')}<span>${hasPin?'Change map pin':'Choose map pin'}</span></button><button type="button" class="secondary" id="removeMapPin" ${hasPin?'':'hidden'}>Remove pin</button><span class="hint" id="pinStatus">${hasPin?'Map pin saved':'Map pin optional'}</span></div><p class="hint">Describe where to meet. You can also choose an exact point on the map.</p>`}
export function readLocationFields(form){const lat=form.elements.latitude.value,lon=form.elements.longitude.value;return {where_text:form.elements.where_text.value.trim(),latitude:lat===''?null:Number(lat),longitude:lon===''?null:Number(lon)}}
export function bindLocationFields(form,page){
 const button=form.querySelector('#chooseMapPin'),remove=form.querySelector('#removeMapPin'),status=form.querySelector('#pinStatus');
 const update=pin=>{form.elements.latitude.value=pin?.[0]??'';form.elements.longitude.value=pin?.[1]??'';remove.hidden=!pin;button.querySelector('span').textContent=pin?'Change map pin':'Choose map pin';status.textContent=pin?'Map pin saved':'Map pin optional'};
 remove.onclick=()=>update(null);
 button.onclick=async()=>{
  button.disabled=true;let modal,map,timer,errorTimer;
  try{
   const L=await loadLeaflet();if(!button.isConnected||!form.closest('dialog')?.open)return;
   const saved=readLocationFields(form),hasPin=validPin(saved.latitude,saved.longitude),centre=localityCentre(page);let selected=hasPin?[saved.latitude,saved.longitude]:null,marker,loaded=false;
   modal=document.createElement('dialog');modal.className='map-pin-modal';modal.setAttribute('aria-labelledby','mapPinTitle');modal.innerHTML=`<header class="map-pin-heading"><h2 id="mapPinTitle">Choose a map pin</h2><button type="button" class="notice-detail-close" id="closePin" aria-label="Close map">×</button></header><p class="hint">${esc(page.locality_name||'Malta')} · Zoom, pan and tap the exact meeting point.</p><div class="pin-map" role="region" aria-label="Choose a location on the map"></div><p class="hint">Tap the map or drag the pin. Keyboard: pan with arrows, then use “Pin at map centre”.</p><p class="hint map-source">Locality starting points: <a href="https://openadmindata.org/mt/" target="_blank" rel="noopener">Open Admin Data</a> (CC BY 4.0).</p><div class="location-actions"><button type="button" class="secondary" id="centrePin">Pin at map centre</button><button type="button" class="secondary" id="resetPinMap">Back to locality</button></div><div class="toolbar"><button type="button" class="secondary" id="cancelPin">Cancel</button><button type="button" class="primary" id="usePin" ${selected?'':'disabled'}>Use this pin</button></div>`;document.body.append(modal);modal.showModal();
   map=L.map(modal.querySelector('.pin-map'),{maxBounds:[[35.7,14.1],[36.2,14.7]],minZoom:10,maxZoom:19}).setView(selected||centre,selected?17:14);
   // Request only tiles the editor views; normal browser cache and Referer apply.
   const tiles=L.tileLayer(window.BAG_DAY_CONFIG?.mapTileURL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
   const pinIcon=L.divIcon({className:'notice-map-marker',html:'<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 42S3 26 3 17a15 15 0 1 1 30 0c0 9-15 25-15 25Z" fill="#e23c38" stroke="white" stroke-width="2"/><circle cx="18" cy="17" r="5" fill="white"/></svg>',iconSize:[36,44],iconAnchor:[18,40]});
   const place=point=>{if(!validPin(point.lat,point.lng))return;selected=[Number(point.lat.toFixed(6)),Number(point.lng.toFixed(6))];if(marker)marker.setLatLng(selected);else{marker=L.marker(selected,{icon:pinIcon,draggable:true,alt:'Event meeting point'}).addTo(map);marker.on('dragend',()=>place(marker.getLatLng()))}modal.querySelector('#usePin').disabled=false};
   if(selected)place({lat:selected[0],lng:selected[1]});map.on('click',e=>place(e.latlng));
   tiles.on('tileload',()=>{loaded=true;clearTimeout(timer)});
   const unavailable=()=>{if(!loaded&&modal.open){modal.close();button.hidden=true;status.textContent='Map pin optional'}};
   timer=setTimeout(unavailable,15000);tiles.on('tileerror',()=>{if(!loaded&&!errorTimer)errorTimer=setTimeout(unavailable,3000)});
   modal.querySelector('#centrePin').onclick=()=>place(map.getCenter());modal.querySelector('#resetPinMap').onclick=()=>map.setView(centre,14);
   modal.querySelector('#usePin').onclick=()=>{if(selected){update(selected);modal.close()}};
   for(const id of ['closePin','cancelPin'])modal.querySelector('#'+id).onclick=()=>modal.close();
   modal.addEventListener('close',()=>{clearTimeout(timer);clearTimeout(errorTimer);map?.remove();modal.remove();button.focus()},{once:true});
   requestAnimationFrame(()=>map.invalidateSize());
  }catch{clearTimeout(timer);clearTimeout(errorTimer);button.hidden=true;status.textContent='Map pin optional';if(modal?.open)modal.close();map?.remove();modal?.remove()}
  finally{button.disabled=false}
 };
}
