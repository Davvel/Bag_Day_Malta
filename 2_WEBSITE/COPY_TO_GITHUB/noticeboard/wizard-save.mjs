// Retain the saved entry across publication failures, so a retry cannot create a second notice.
export async function commitWizard({session,data,publish=false,request,pageId,token,verify}){
 if(session.uncertain)throw Error('The earlier save could not be confirmed. Check the notice list before saving again.');
 const path='/noticeboard/'+pageId,signature=JSON.stringify(data);
 if(session.signature!==signature){
  const before=await request(path+'/entries',{token});
  if(before.page.revision!==session.pageRevision)throw Error('This noticeboard changed while you were writing. Save your text, close this wizard and refresh before continuing.');
  const entry=session.entry,body={...data,...(entry?{revision:entry.revision}:{})};
  let response;
  try{response=await request(path+'/entries'+(entry?'/'+encodeURIComponent(entry.entry_id):''),{method:entry?'PATCH':'POST',body,token})}catch(error){if(!error.status){session.uncertain=true;throw Error('The save could not be confirmed. Keep your text and check the notice list before saving again.')}throw error}
  session.entry={...data,entry_id:entry?.entry_id||response.entry_id,revision:entry?entry.revision+1:1};
  session.pageRevision++;session.signature=signature;
 }
 if(!publish)return {saved:true};
 const current=await request(path+'/entries',{token});
 if(current.page.revision!==session.pageRevision)throw Error('Your draft is saved, but this noticeboard has other new changes. Close the wizard and review them before publishing.');
 await request(path+'/publish',{method:'POST',body:{revision:current.page.revision},token});
 if(!await verify(current))throw Error('Your draft is saved, but publication could not be confirmed. Use Refresh status before relying on it.');
 return {saved:true,published:true};
}
