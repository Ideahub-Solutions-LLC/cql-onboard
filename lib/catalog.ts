export type SignupOption={id:string;name:string;description:string;url:string;badge:string;buttonLabel:string;enabled:boolean;features?:string[];pricingTier?:'Startup'|'Business'|'Scale'|''};
export type Fee={name:string;description:string;rate:string;unit:string;group:string;rates?:Record<string,string>;section?:string;billing?:string;note?:string};
export const signupDefaults:SignupOption[]=[
 {id:'cql-startup',pricingTier:'Startup',name:'CQL Startup',description:'A starting point for small teams building their CRM and follow-up system.',url:'https://subscribe.corequantumleads.com/cql-startup',badge:'14-day trial',buttonLabel:'Start Startup signup',enabled:true,features:['CRM and customer records','Pipelines and opportunities','Forms, funnels, and websites','Calendars and workflow automation']},
 {id:'cql-business',pricingTier:'Business',name:'CQL Business',description:'For growing teams that need broader customer engagement tools.',url:'https://subscribe.corequantumleads.com/cql-business',badge:'14-day trial',buttonLabel:'Start Business signup',enabled:true,features:['Startup tools plus expanded business features','Review and reputation tools','Invoices and payment tools','Campaigns and reporting']},
 {id:'cql-enterprise',name:'CQL Enterprise',description:'For larger operations with advanced requirements. Your team confirms the setup scope.',url:'https://subscribe.corequantumleads.com/cql-enterprise',badge:'14-day trial',buttonLabel:'Start Enterprise signup',enabled:true,features:['Business tools plus advanced capabilities','Documents and e-contracts','Affiliate management','AI options with separate usage review']}
];
export function isSafeSignupUrl(value:unknown){try{const u=new URL(String(value));return u.protocol==='https:'&&!u.username&&!u.password&&!!u.hostname;}catch{return false;}}
export function validateSignupOptions(options:unknown):SignupOption[]{
 if(!Array.isArray(options)||options.length>30)throw new Error('Add up to 30 signup options.');
 const seen=new Set();return options.map((o:any,i:number)=>{
  if(!o||typeof o.id!=='string'||!o.id||o.id.length>80||seen.has(o.id))throw new Error('Each signup option needs a unique ID.');seen.add(o.id);
  if(typeof o.name!=='string'||!o.name.trim()||o.name.length>100)throw new Error(`Signup option ${i+1} needs a name (up to 100 characters).`);
  if(typeof o.url!=='string'||((o.enabled||o.url.trim())&&!isSafeSignupUrl(o.url)))throw new Error(`“${o.name}” needs a complete HTTPS signup link before you show it to clients.`);
  if(o.features!==undefined&&(!Array.isArray(o.features)||o.features.length>12||o.features.some((f:any)=>typeof f!=='string'||f.length>180)))throw new Error('Add up to 12 features, with up to 180 characters each.');
  for(const [key,max]of [['description',500],['badge',40],['buttonLabel',50]] as const)if(typeof o[key]!=='string'||o[key].length>max)throw new Error(`Check the ${key} for “${o.name}”.`);
  if(o.pricingTier!==undefined&&!['','Startup','Business','Scale'].includes(o.pricingTier))throw new Error('Choose a valid CQL pricing tier.');
  if(typeof o.enabled!=='boolean')throw new Error('Choose whether each signup option is shown.');
  return {id:o.id,name:o.name.trim(),description:o.description.trim(),url:o.url.trim(),badge:o.badge.trim(),buttonLabel:o.buttonLabel.trim()||'Open signup',enabled:o.enabled,features:(o.features||[]).map((f:string)=>f.trim()).filter(Boolean),pricingTier:o.pricingTier||''};
 });
}
export function validateFees(fees:unknown):Fee[]{
 if(!Array.isArray(fees)||fees.length>100)throw new Error('Your price list can contain up to 100 services.');
 const seen=new Set();return fees.map((f:any,i:number)=>{
  if(!f||typeof f.name!=='string'||!f.name.trim()||f.name.length>100)throw new Error(`Row ${i+1}: add a service name (up to 100 characters).`);
  const key=f.name.trim().toLowerCase();if(seen.has(key))throw new Error(`Duplicate service: “${f.name}”. Use a unique name for each service.`);seen.add(key);
  for(const [k,max]of [['description',500],['rate',100],['unit',100]] as const)if(typeof f[k]!=='string'||f[k].length>max)throw new Error(`Row ${i+1}: check ${k}.`);
  if(!f.unit.trim())throw new Error(`Row ${i+1}: add a billing unit, such as per message or per month.`);
  const group=['Usage','Setup','AI'].find(g=>g.toLowerCase()===String(f.group).trim().toLowerCase());if(!group)throw new Error(`Row ${i+1}: category must be Usage, Setup, or AI.`);
  const extra:any={};
  if(f.rates!==undefined){if(!f.rates||typeof f.rates!=='object'||Array.isArray(f.rates))throw new Error(`Row ${i+1}: check tier rates.`);extra.rates={};for(const t of ['Startup','Business','Scale']){const v=f.rates[t]??'';if(typeof v!=='string'||(v.trim()&&!/^\d+(\.\d{1,6})?$/.test(v.trim())))throw new Error(`Row ${i+1}: ${t} rate must be a non-negative number with up to six decimals, or blank.`);extra.rates[t]=v.trim();}}
  if(f.section!==undefined){if(!['Messaging','Phone & calls','Email','AI & automation','Setup & subscriptions','Other'].includes(f.section))throw new Error(`Row ${i+1}: check pricing section.`);extra.section=f.section;}
  if(f.billing!==undefined){if(!['usage','monthly','one_time','quote','included'].includes(f.billing))throw new Error(`Row ${i+1}: check billing type.`);extra.billing=f.billing;}
  if(f.note!==undefined){if(typeof f.note!=='string'||f.note.length>1000)throw new Error(`Row ${i+1}: keep billing details under 1,000 characters.`);extra.note=f.note.trim();}
  return {name:f.name.trim(),description:f.description.trim(),rate:f.rate.trim(),unit:f.unit.trim(),group,...extra};
 });
}
export function parsePriceCsv(text:string):Fee[]{
 if(text.length>1_000_000)throw new Error('Use a CSV smaller than 1 MB.');
 text=text.replace(/^\uFEFF/,'');const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=c;continue;}
  if(c==='"'){if(cell||closed)throw new Error('Invalid CSV quotation. Export the sheet as CSV and try again.');quoted=true;continue;}
  if(c===','||c==='\r'||c==='\n'){row.push(cell);cell='';closed=false;if(c!==','){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(x=>x.trim()))rows.push(row);row=[];}continue;}
  if(closed){if(c===' '||c==='\t')continue;throw new Error('Unexpected text after a quoted value.');}cell+=c;
 }
 if(quoted)throw new Error('A quoted CSV value is unfinished.');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw new Error('The CSV needs a header row and at least one service.');
 const headers=rows.shift()!.map(h=>h.trim().toLowerCase());
 if(new Set(headers).size!==headers.length)throw new Error('The CSV has duplicate column headings.');
 for(const h of ['service','rate','unit','category'])if(!headers.includes(h))throw new Error(`Missing “${h}” column. Download the template for the correct headings.`);
 const get=(r:string[],h:string)=>r[headers.indexOf(h)]||'';
 return validateFees(rows.map((r,i)=>{if(r.length!==headers.length)throw new Error(`CSV row ${i+2} has the wrong number of columns.`);return {name:get(r,'service'),description:get(r,'description'),rate:get(r,'rate'),unit:get(r,'unit'),group:get(r,'category'),...(headers.includes('startup_rate')&&(['startup_rate','business_rate','scale_rate'].some(t=>get(r,t))||!get(r,'rate'))?{rates:{Startup:get(r,'startup_rate'),Business:get(r,'business_rate'),Scale:get(r,'scale_rate')}}:{}),...(get(r,'section')?{section:get(r,'section')}:{}),...(get(r,'billing')?{billing:get(r,'billing')}:{}),...(get(r,'details')?{note:get(r,'details')}:{} )};}));
}
export function feesToCsv(fees:Fee[]){const q=(s:string)=>'"'+String(s).replace(/"/g,'""')+'"';const extended=fees.some(f=>f.rates||f.section||f.billing||f.note);return '\uFEFF'+[['service','description','rate','unit','category',...(extended?['startup_rate','business_rate','scale_rate','section','billing','details']:[])],...fees.map(f=>[f.name,f.description,f.rate,f.unit,f.group,...(extended?[f.rates?.Startup||'',f.rates?.Business||'',f.rates?.Scale||'',f.section||'',f.billing||'',f.note||'']:[])])].map(r=>r.map(q).join(',')).join('\r\n')+'\r\n';}
export function mergeFees(current:Fee[],incoming:Fee[]){const rows=[...current];for(const fee of incoming){const i=rows.findIndex(f=>f.name.toLowerCase()===fee.name.toLowerCase());if(i<0)rows.push(fee);else rows[i]=fee;}return validateFees(rows);}
export function catalogConfig(raw:any){
 let signupOptions=Array.isArray(raw.signupOptions)?raw.signupOptions:null;
 if(!signupOptions&&raw.signupLinks){signupOptions=Object.entries(raw.signupLinks).filter(([,url])=>!!url&&isSafeSignupUrl(url)).map(([name,url],i)=>({id:signupDefaults.find(o=>o.name===name)?.id||'migrated-'+i,name,url,description:'',badge:'',buttonLabel:'Open signup',enabled:true}));}
 return {...raw,signupOptions:(signupOptions||signupDefaults).map((o:any)=>({...o,features:(o.features??signupDefaults.find(d=>d.id===o.id)?.features??[]).map((f:string)=>f.trim()).filter(Boolean),pricingTier:o.pricingTier??signupDefaults.find(d=>d.id===o.id)?.pricingTier??''})),priceList:raw.priceList||null};
}
