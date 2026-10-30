import assert from 'node:assert/strict';
const base='http://127.0.0.1:8787';let checks=0;
const admin={user:'local_seedy',email:'seedy@sites.test'},client={user:'catalog_client',email:'catalog-client@example.test'},other={user:'another_client',email:'other-catalog@example.test'};
async function api(path,{who=admin,method,body}={}){const headers={'oai-authenticated-user-id':who.user,'oai-authenticated-user-email':who.email,Origin:base};if(body&&!(body instanceof FormData))headers['Content-Type']='application/json';const r=await fetch(base+'/api/'+path,{method:method||(body?'POST':'GET'),headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data=text}return {status:r.status,data};}
const check=(value,msg)=>{assert.ok(value,msg);checks++;console.log('PASS '+msg);};
const original=(await api('session')).data.config;let config=structuredClone(original);let appId;
async function save(changes){const r=await api('config',{method:'PUT',body:{...config,...changes}});check(r.status===200,'team settings save succeeds: '+JSON.stringify(r.status===200?'ok':r));config=r.data;return r;}
async function upload(name){const body=new FormData();body.append('file',new Blob(['SYNTHETIC PRICE LIST ONLY'],{type:'text/csv'}),name);return api('price-lists',{body});}
try{
 const offer={id:'synthetic-free',name:'Synthetic free access',description:'Test only',badge:'Free access',buttonLabel:'Get access',enabled:true,url:'https://example.test/signup',features:['Synthetic feature A','Synthetic feature B']};
 await save({signupOptions:[...config.signupOptions,offer]});
 check((await api('session',{who:client})).data.config.signupOptions.some(o=>o.id===offer.id),'added signup option visible to client');
 check((await api('session',{who:client})).data.config.signupOptions.find(o=>o.id===offer.id).features.length===2,'custom account features visible to client');
 check((await api('config',{method:'PUT',body:{...config,signupOptions:[{...offer,url:'javascript:alert(1)'}]}})).status===400,'unsafe signup link rejected');
 const stale=structuredClone(config);await save({fees:[...config.fees,{name:'Synthetic service',description:'Test only',rate:'0.02',unit:'per action',group:'Usage'}]});
 check((await api('config',{method:'PUT',body:stale})).status===409,'stale settings cannot overwrite new edits');
 const staged=await upload('synthetic-prices-v1.csv');check(staged.status===201,'team can upload a price-list document');
 check((await api('price-lists/'+staged.data.id,{who:client})).status===403,'unsaved price-list upload is hidden from clients');
 const fd=new FormData();fd.append('file',new Blob(['test']),'client-price.csv');check((await api('price-lists',{who:client,body:fd})).status===403,'clients cannot upload team price lists');
 await save({priceList:staged.data});check((await api('price-lists/'+staged.data.id,{who:client})).status===200,'saved current price-list document downloadable by client');
 const created=(await api('applications',{who:client,body:{data:{}}})).data;appId=created.id;
 check((await api('applications/'+appId,{who:client,method:'PUT',body:{data:{},step:1}})).status===409,'step 2 locked before signup completion');
 const d={flowVersion:2,completedSteps:['0'],signupId:offer.id,signupDone:true,alreadyHaveAccount:false};
 check((await api('applications/'+appId,{who:client,method:'PUT',body:{data:d,step:1}})).status===200,'completed signup unlocks step 2');
 check((await api('applications/'+appId,{who:client,method:'PUT',body:{data:d,step:2}})).status===409,'later step locked until business step is complete');
 Object.assign(d,{completedSteps:['0','1','2','3','4','5','6'],legalName:'SYNTHETIC CATALOG TEST',contactName:'QA',contactEmail:client.email,contactPhone:'+15555550100',industry:'Other',address:'Test',city:'Test',region:'CA',postalCode:'00000',representative:'QA',representativeEmail:'qa@example.test',campaign:'Test reminders',consentMethod:'Test form',sampleMessage:'Test. Reply STOP to opt out.',domain:'example.test',routingPhone:'+15555550100',calendarOwner:'qa@example.test',services:'Test',leadGoal:'Test booking',brandType:'Registered business',country:'United States',taxId:'12-3456789',days:['Monday'],startTime:'09:00',endTime:'17:00',importMode:'Starting fresh',signature:'SYNTHETIC TEST',reviewAccuracy:true,reviewUsage:true,reviewAuthority:true});
 check((await api('applications/'+appId+'/submit',{who:client,body:{data:d,pricingVersion:stale.pricingVersion}})).status===409,'client must review revised prices before submitting');
 const submitted=await api('applications/'+appId+'/submit',{who:client,body:{data:d,pricingVersion:config.pricingVersion}});check(submitted.status===200,'complete new wizard application submits');
 const receipt=(await api('applications/'+appId,{who:client})).data.pricingSnapshot;check(receipt.signupOption.id===offer.id&&receipt.priceList.id===staged.data.id,'submission preserves signup offer and exact price-list document');
 const replacement=await upload('synthetic-prices-v2.csv');await save({priceList:replacement.data,signupOptions:config.signupOptions.filter(o=>o.id!==offer.id),fees:config.fees.filter(f=>f.name!=='Synthetic service')});
 check(!(await api('session',{who:client})).data.config.signupOptions.some(o=>o.id===offer.id),'deleted signup option removed from new selections');
 const historical=(await api('applications/'+appId,{who:client})).data.pricingSnapshot;check(historical.signupOption.id===offer.id&&historical.fees.some(f=>f.name==='Synthetic service'),'past signup and rate snapshot unchanged after deletion');
 check((await api('price-lists/'+staged.data.id,{who:client})).status===200,'client retains access to their acknowledged old price list');
 check((await api('price-lists/'+staged.data.id,{who:other})).status===403,'unrelated client cannot download old price lists');
 await save({signupOptions:[...config.signupOptions,{...offer,enabled:false}]});check(!(await api('session',{who:client})).data.config.signupOptions.some(o=>o.id===offer.id),'hidden signup options absent from client response');
}finally{const latest=(await api('session')).data.config;const r=await api('config',{method:'PUT',body:{...original,pricingVersion:latest.pricingVersion}});assert.equal(r.status,200,'restore local settings');}
console.log(`${checks} catalog API checks passed. Synthetic application: ${appId}`);
