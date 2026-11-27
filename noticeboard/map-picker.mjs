import {esc,icon} from './shared.mjs?v=1.1.185';
import {localityCentre,validPin} from './locations.mjs?v=1.1.185';
const pinSVG='<svg viewBox="0 0 36 44" aria-hidden="true"><path d="M18 42S3 26 3 17a15 15 0 1 1 30 0c0 9-15 25-15 25Z" fill="#e23c38" stroke="white" stroke-width="2"/><circle cx="18" cy="17" r="5" fill="white"/></svg>';
const localitySource='<p class="hint map-source">Locality starting points: <a href="https://openadmindata.org/mt/" target="_blank" rel="noopener">Open Admin Data</a> (CC BY 4.0).</p>';
let leafletTask;
export function loadLeaflet(){
 if(window.L)return Promise.resolve(window.L);
 if(!leafletTask)leafletTask=new Promise((resolve,reject)=>{
  const css=document.createElement('link');css.rel='stylesheet';css.href='/noticeboard/vendor/leaflet/leaflet.css?v=1.1.185';document.head.append(css);
  const script=document.createElement('script');script.src='/noticeboard/vendor/leaflet/leaflet.js?v=1.1.185';script.onload=()=>resolve(window.L);script.onerror=()=>{leafletTask=null;reject(Error('Map library unavailable'))};document.head.append(script);
 });return leafletTask;
}
function pinButtonText(hasPin,report){
 if(report)return hasPin?'Change problem location':'Set problem location';
 return hasPin?'Change map pin':'Choose map pin';
}
export function locationFields(item={},pinOnly=false){
 const hasPin=validPin(item.latitude,item.longitude);
 return `${pinOnly?'':`<label><span>Where <span class="notice-required">*</span></span><input name="where_text" maxlength="300" placeholder="Venue, address or meeting point" value="${esc(item.where_text||'')}"></label>`}
 <input type="hidden" name="latitude" value="${hasPin?esc(item.latitude):''}"><input type="hidden" name="longitude" value="${hasPin?esc(item.longitude):''}">
 <div class="location-actions${pinOnly?' report-location-actions':''}">
  <button type="button" class="secondary" id="chooseMapPin">${icon('pin')}<span>${pinButtonText(hasPin,pinOnly)}</span></button>
  <button type="button" class="secondary" id="removeMapPin" ${hasPin?'':'hidden'}>Remove pin</button>
  <span class="hint" id="pinStatus"${pinOnly?' role="status" hidden':''}>${pinOnly?'':hasPin?'Map pin saved':'Map pin optional'}</span>
 </div>${pinOnly?'':'<p class="hint">Describe where to meet. You can also choose an exact point on the map.</p>'}`;
}
export function readLocationFields(form){const lat=form.elements.latitude.value,lon=form.elements.longitude.value;return {where_text:form.elements.where_text?.value.trim()||'',latitude:lat===''?null:Number(lat),longitude:lon===''?null:Number(lon)}}
function pickerMarkup(page,hasPin,report){
 const header=`<header class="map-pin-heading"><h2 id="mapPinTitle">${report?'Where is the problem?':'Choose a map pin'}</h2><button type="button" class="notice-detail-close" id="closePin" aria-label="Close map">×</button></header>`;
 const locality=esc(page.locality_name||'Malta');
 if(report)return `${header}
 <p class="hint" id="reportPinHint">${locality} · Move the map until the pin is over the problem.</p>
 <div class="report-pin-map-wrap">
  <div class="pin-map" role="region" aria-label="Problem location map. Use arrow keys to move the map." aria-describedby="reportPinHint"></div>
  <span class="notice-map-marker report-pin-marker" aria-hidden="true">${pinSVG}</span>
  <button type="button" class="secondary report-pin-gps" id="useCurrentPosition" aria-label="Use my location" title="Use my location">
   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>
   </svg>
  </button>
  <div class="report-pin-loading" aria-hidden="true" hidden><span class="report-pin-spinner"></span>Finding your location…</div>
 </div>
 <p class="hint report-pin-status" id="reportPinStatus" role="status"></p>
 <details class="report-pin-credits"><summary>Map credits</summary>${localitySource}</details>
 <button type="button" class="primary report-pin-confirm" id="usePin">Use this pin</button>`;
 return `${header}<p class="hint">${locality} · Zoom, pan and tap the exact meeting point.</p><div class="pin-map" role="region" aria-label="Choose a location on the map"></div><p class="hint">Tap the map or drag the pin. Keyboard: pan with arrows, then use “Pin at map centre”.</p>${localitySource}<div class="location-actions"><button type="button" class="secondary" id="centrePin">Pin at map centre</button><button type="button" class="secondary" id="resetPinMap">Back to locality</button></div><div class="toolbar"><button type="button" class="secondary" id="cancelPin">Cancel</button><button type="button" class="primary" id="usePin" ${hasPin?'':'disabled'}>Use this pin</button></div>`;
}
function bindReportPicker(L,map,modal,initialPin,update){
 const locate=modal.querySelector('#useCurrentPosition'),usePin=modal.querySelector('#usePin'),status=modal.querySelector('#reportPinStatus');
 const viewport=modal.querySelector('.pin-map'),loading=modal.querySelector('.report-pin-loading');
 const close=modal.querySelector('#closePin');
 const timeout=8000;
 let attempt=0,locationTimer;
 function focusPin(latitude,longitude){
  const span=L.latLng(latitude,longitude).toBounds(80);
  const zoom=map.getBoundsZoom([[span.getSouth(),longitude],[span.getNorth(),longitude]]);
  map.setView([latitude,longitude],zoom,{animate:false});
 }
 function setLoading(pending,message){
  if(pending&&(document.activeElement===locate||viewport.contains(document.activeElement)))close.focus();
  viewport.inert=pending;loading.hidden=!pending;locate.disabled=pending;usePin.disabled=pending;
  status.classList.toggle('report-pin-live-only',pending);status.textContent=message;
 }
 function finishLocation(message){
  attempt++;
  clearTimeout(locationTimer);
  setLoading(false,message);
 }
 modal.addEventListener('close',()=>clearTimeout(locationTimer),{once:true});
 function showPosition(){
  if(!navigator.geolocation){
   finishLocation('Location is unavailable. Move the map to place the pin.');
   return;
  }
  const current=++attempt;
  const active=()=>modal.open&&current===attempt;
  const unavailable=()=>{
   if(active())finishLocation('Couldn’t get your location. Move the map to place the pin.');
  };
  map.stop();
  setLoading(true,'Finding your location…');
  locationTimer=setTimeout(unavailable,timeout);
  try{
   navigator.geolocation.getCurrentPosition(({coords})=>{
    if(!active())return;
    const {latitude,longitude,accuracy}=coords;
    if(!validPin(latitude,longitude)){
     finishLocation('Your location is outside the map area. Move the map to place the pin.');
     return;
    }
    focusPin(latitude,longitude);
    finishLocation(accuracy>20?`GPS accuracy is about ${Math.round(accuracy)} m.`:'');
   },unavailable,{enableHighAccuracy:true,timeout,maximumAge:0});
  }catch{unavailable()}
 }
 locate.onclick=showPosition;
 usePin.onclick=()=>{
  const {lat,lng}=map.getCenter();
  if(!validPin(lat,lng))return;
  update([Number(lat.toFixed(6)),Number(lng.toFixed(6))]);modal.close();
 };
 if(initialPin)focusPin(...initialPin);else showPosition();
}
export function bindLocationFields(form,page,{report=false}={}){
 const button=form.querySelector('#chooseMapPin'),remove=form.querySelector('#removeMapPin'),status=form.querySelector('#pinStatus');
 const update=pin=>{
  form.elements.latitude.value=pin?.[0]??'';form.elements.longitude.value=pin?.[1]??'';
  remove.hidden=!pin;button.querySelector('span').textContent=pinButtonText(Boolean(pin),report);
  status.hidden=report;status.textContent=report?'':pin?'Map pin saved':'Map pin optional';
 };
 const showMapError=()=>{
  button.hidden=!report;status.hidden=false;
  status.textContent=report?'Map unavailable. Try opening it again.':'Map pin optional';
 };
 remove.onclick=()=>{update(null);if(report)button.focus()};
 button.onclick=async()=>{
  button.disabled=true;let modal,map,timer,errorTimer;
  try{
   const L=await loadLeaflet();if(!button.isConnected||!form.closest('dialog')?.open)return;
   if(report)status.hidden=true;
   const saved=readLocationFields(form),hasPin=validPin(saved.latitude,saved.longitude),centre=localityCentre(page);let selected=hasPin?[saved.latitude,saved.longitude]:null,marker,loaded=false;
   modal=document.createElement('dialog');modal.className='map-pin-modal';modal.setAttribute('aria-labelledby','mapPinTitle');modal.innerHTML=pickerMarkup(page,hasPin,report);document.body.append(modal);modal.showModal();
   map=L.map(modal.querySelector('.pin-map'),{maxBounds:[[35.7,14.1],[36.2,14.7]],minZoom:10,maxZoom:report?23:19,...(report?{zoomSnap:0}:{})}).setView(selected||centre,selected?(report?19:17):14);
   // Request only tiles the editor views; normal browser cache and Referer apply.
   const tiles=L.tileLayer(window.BAG_DAY_CONFIG?.mapTileURL||'https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:report?23:19,maxNativeZoom:19,referrerPolicy:'strict-origin',attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'}).addTo(map);
   tiles.on('tileload',()=>{loaded=true;clearTimeout(timer)});
   const unavailable=()=>{if(!loaded&&modal.open){modal.close();showMapError()}};
   timer=setTimeout(unavailable,15000);tiles.on('tileerror',()=>{if(!loaded&&!errorTimer)errorTimer=setTimeout(unavailable,3000)});
   modal.querySelector('#closePin').onclick=()=>modal.close();
   modal.addEventListener('close',()=>{clearTimeout(timer);clearTimeout(errorTimer);map?.remove();map=null;modal.remove();button.focus()},{once:true});
   if(report)bindReportPicker(L,map,modal,selected,update);
   else{
    const pinIcon=L.divIcon({className:'notice-map-marker',html:pinSVG,iconSize:[36,44],iconAnchor:[18,40]});
    const place=point=>{if(!validPin(point.lat,point.lng))return;selected=[Number(point.lat.toFixed(6)),Number(point.lng.toFixed(6))];if(marker)marker.setLatLng(selected);else{marker=L.marker(selected,{icon:pinIcon,draggable:true,alt:'Event meeting point'}).addTo(map);marker.on('dragend',()=>place(marker.getLatLng()))}modal.querySelector('#usePin').disabled=false};
    if(selected)place({lat:selected[0],lng:selected[1]});map.on('click',e=>place(e.latlng));
    modal.querySelector('#centrePin').onclick=()=>place(map.getCenter());modal.querySelector('#resetPinMap').onclick=()=>map.setView(centre,14);
    modal.querySelector('#usePin').onclick=()=>{if(selected){update(selected);modal.close()}};
    modal.querySelector('#cancelPin').onclick=()=>modal.close();
   }
   requestAnimationFrame(()=>{if(modal.open)map.invalidateSize()});
  }catch{clearTimeout(timer);clearTimeout(errorTimer);showMapError();if(modal?.open)modal.close();map?.remove();map=null;modal?.remove()}
  finally{button.disabled=false}
 };
}
