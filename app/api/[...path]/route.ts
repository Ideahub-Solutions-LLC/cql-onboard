import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { defaultConfig, initialData, taskNames, steps, unlockedStep, normalizeOnboarding, submissionErrors, onboardingTasks } from '../../../lib/shared';
import { applicationTasks } from '../../../lib/pricing';
import { catalogConfig, validateSignupOptions, validateFees } from '../../../lib/catalog';
export const dynamic='force-dynamic';
const json=(data:any,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
const email=(s:any)=>typeof s==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const clean=(d:any)=>{if(!d||typeof d!=='object'||Array.isArray(d))fail('Invalid form'); const out:any={};for(const [k,v]of Object.entries(d)){if(!/^[a-zA-Z][a-zA-Z0-9]{0,50}$/.test(k)||/password|secret|token|cardnumber|cvv/i.test(k))continue;if(typeof v==='string'){if(v.length>20000)fail('An answer is too long');out[k]=v;}else if(typeof v==='boolean'||typeof v==='number')out[k]=v;else if(Array.isArray(v))out[k]=v.filter(x=>typeof x==='string').slice(0,50).map(x=>x.slice(0,200));}if(JSON.stringify(out).length>150000)fail('Form is too large');return out;};
const parseRow=(r:any)=>({...r,data:JSON.parse(r.data),checklist:JSON.parse(r.checklist||'{}'),pricingSnapshot:r.pricing_snapshot?JSON.parse(r.pricing_snapshot):null});
async function handler(req:Request){try{
 const user=await getChatGPTUser();if(!user) return json({error:'Sign in to access your onboarding workspace.'},401);
 const db=env.DB!;if(!db)return json({error:'Storage is not configured.'},503);
 if(req.method!=='GET'){const origin=req.headers.get('origin');if(!origin||origin!==new URL(req.url).origin)return json({error:'Invalid request origin.'},403);}
 const owner=await db.prepare('SELECT value FROM settings WHERE id = ?').bind('owner').first<{value:string}>();
 // Vercel deployments are public by default, so the configured owner must claim
 // the empty database before the normal Sites first-visitor bootstrap is allowed.
 if(!owner&&process.env.VERCEL){const ownerEmail=process.env.CQL_OWNER_EMAIL?.trim().toLowerCase();if(!ownerEmail)return json({error:'Set CQL_OWNER_EMAIL before using this deployment.'},503);if(user.email.toLowerCase()!==ownerEmail)return json({error:'This workspace has not been initialized by its configured owner.'},403);}
 if(!owner)await db.prepare('INSERT OR IGNORE INTO settings (id,value) VALUES (?,?)').bind('owner',user.userId).run();
 const ownerNow=owner||await db.prepare('SELECT value FROM settings WHERE id = ?').bind('owner').first<{value:string}>();
 const cfgRow=await db.prepare('SELECT value FROM settings WHERE id = ?').bind('config').first<{value:string}>();
 const config=catalogConfig({...defaultConfig,...catalogConfig(cfgRow?JSON.parse(cfgRow.value):{})});
 const admin=ownerNow?.value===user.userId||config.teamEmails.some((e:string)=>e.toLowerCase()===user.email?.toLowerCase());
 const path=new URL(req.url).pathname.slice(5).split('/').filter(Boolean);const id=path[1];
 const validateRequests=(d:any,previous:any={})=>{if(d.requestedFeatures!==undefined&&(!Array.isArray(d.requestedFeatures)||d.requestedFeatures.some((name:string)=>!config.fees.some((f:any)=>f.name===name)&&!(previous.requestedFeatures||[]).includes(name))))fail('A requested feature is no longer on the menu. Review Pricing & features before saving.');};
 const visibleRow=(r:any)=>{const result=parseRow(r);if(!admin){delete result.notes;delete result.owner_id;}return result;};
 const getApp=async(id:string)=>{const r:any=await db.prepare('SELECT * FROM applications WHERE id = ?').bind(id).first();if(!r)fail('Application not found',404);if(!admin&&r.owner_id!==user.userId&&r.assigned_email?.toLowerCase()!==user.email?.toLowerCase())fail('Access denied',403);return r;};
 const assertEdit=(r:any)=>{if(!admin&&r.status!=='draft'&&r.status!=='changes_requested')fail('Your application is with our team. Request changes before editing.',409);};
 if(path[0]==='session'&&req.method==='GET')return json({user:{name:user.displayName||user.email,email:user.email},admin,config:admin?config:{...config,teamEmails:undefined,signupOptions:config.signupOptions.filter((o:any)=>o.enabled),vaultInstructions:config.vaultInstructions}});
 if(path[0]==='config'&&req.method==='PUT'){
  if(!admin)fail('Team access required',403);const c=await req.json() as any;
  if(!c.brandName||!/^#[0-9a-f]{6}$/i.test(c.accent)||!email(c.supportEmail))fail('Check the brand name, color, and support email.');
  if(c.logo&&!c.logo.startsWith('/')&&!/^https:\/\//.test(c.logo)&&!/^data:image\/(png|jpeg|webp);base64,/.test(c.logo))fail('Use an HTTPS image URL or PNG/JPG/WebP logo.');
  if(c.logo?.length>1800000)fail('Logo is too large.');
  if(!Array.isArray(c.teamEmails)||c.teamEmails.some((x:any)=>!email(x)))fail('Enter valid team email addresses.');
  if(c.pricingVersion!==config.pricingVersion)fail('Settings changed in another session. Reload before saving your changes.',409);
  let signupOptions,fees;try{signupOptions=validateSignupOptions(c.signupOptions);fees=validateFees(c.fees);}catch(e:any){fail(e.message);}
  let priceList=null;if(c.priceList){const file:any=await db.prepare('SELECT id,name,size,created_at FROM attachments WHERE id=? AND application_id=?').bind(String(c.priceList.id),'__price_list__').first();if(!file)fail('Price-list file was not found. Upload it again.');priceList=file;}

  const saved={...defaultConfig,brandName:c.brandName.slice(0,80),accent:c.accent,logo:c.logo,supportEmail:c.supportEmail,teamEmails:c.teamEmails,signupOptions,priceList,fees,pricingNote:String(c.pricingNote||'').slice(0,2000),pricingVersion:String(Date.now()),vaultInstructions:String(c.vaultInstructions||'').slice(0,2000)};
  const written=cfgRow?await db.prepare('UPDATE settings SET value=? WHERE id=? AND value=?').bind(JSON.stringify(saved),'config',cfgRow.value).run():await db.prepare('INSERT OR IGNORE INTO settings (id,value) VALUES (?,?)').bind('config',JSON.stringify(saved)).run();
  if(!written.meta.changes)fail('Settings changed in another session. Reload before saving your changes.',409);return json(saved);
 }
 if(path[0]==='price-lists'){
  if(req.method==='POST'&&!id){
   if(!admin)fail('Team access required',403);
   if(Number(req.headers.get('content-length')||0)>11*1024*1024)fail('Price-list files must be 10 MB or smaller.');
   const f=await req.formData();const file=f.get('file');if(!(file instanceof File)||file.size>10*1024*1024||!file.size)fail('Choose a file between 1 byte and 10 MB.');
   if(!/\.(pdf|xlsx?|csv)$/i.test(file.name))fail('Use a PDF, Excel, or CSV price list.');
   if(!env.BUCKET)fail('File storage unavailable',503);
   const fileId=crypto.randomUUID(),objectKey='price-lists/'+fileId,name=file.name.replace(/[\r\n"\\/]/g,'_').slice(0,180),createdAt=new Date().toISOString();
   await env.BUCKET.put(objectKey,await file.arrayBuffer(),{httpMetadata:{contentType:'application/octet-stream'}});
   try{await db.prepare('INSERT INTO attachments (id,application_id,name,category,size,type,object_key,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(fileId,'__price_list__',name,'Price list',file.size,file.type||'application/octet-stream',objectKey,createdAt).run();}catch(e){await env.BUCKET.delete(objectKey);throw e;}
   return json({id:fileId,name,size:file.size,created_at:createdAt},201);
  }
  if(req.method==='GET'&&id){
   const file:any=await db.prepare('SELECT * FROM attachments WHERE id=? AND application_id=?').bind(id,'__price_list__').first();if(!file)fail('Price list not found',404);
   if(!admin&&config.priceList?.id!==id){const receipt=await db.prepare("SELECT id FROM applications WHERE (owner_id=? OR lower(assigned_email)=?) AND json_extract(pricing_snapshot,'$.priceList.id')=? LIMIT 1").bind(user.userId,user.email.toLowerCase(),id).first();if(!receipt)fail('This price list is not available for your application.',403);}
   const object=await env.BUCKET!.get(file.object_key);if(!object)fail('Price list not found',404);return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(file.name),'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
  }
 }
 if(path[0]==='applications'&&!id){
  if(req.method==='GET'){const rows=admin?await db.prepare('SELECT * FROM applications ORDER BY updated_at DESC LIMIT 250').all():await db.prepare('SELECT * FROM applications WHERE owner_id=? OR lower(assigned_email)=? ORDER BY updated_at DESC LIMIT 100').bind(user.userId,user.email?.toLowerCase()||'').all();return json(rows.results.map(visibleRow));}
  if(req.method==='POST'){const b:any=await req.json();const appId=crypto.randomUUID();const now=new Date().toISOString();if(b.assignedEmail&&!email(b.assignedEmail))fail('Enter a valid client email.');const data=normalizeOnboarding({...initialData,...clean(b.data||{})});if(!admin){if(!data.contactEmail)data.contactEmail=user.email;if(!data.contactName&&user.fullName)data.contactName=user.fullName;}validateRequests(data);const assigned=admin?String(b.assignedEmail||'').toLowerCase():user.email?.toLowerCase();await db.prepare('INSERT INTO applications (id,owner_id,assigned_email,data,status,step,checklist,notes,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(appId,user.userId,assigned||null,JSON.stringify(data),'draft',0,'{}','',now,now).run();return json(parseRow(await getApp(appId)),201);}
 }
 if(path[0]==='applications'&&id){const r=await getApp(id);
  if(path.length===2&&req.method==='GET'){const files=await db.prepare('SELECT id,name,category,size,type,created_at FROM attachments WHERE application_id=? ORDER BY created_at').bind(id).all();const secret=await db.prepare('SELECT updated_at FROM secrets WHERE application_id=?').bind(id).first();return json({...visibleRow(r),files:files.results,hasSecret:!!secret});}
  if(path.length===2&&req.method==='PUT'){assertEdit(r);const b:any=await req.json();const d=normalizeOnboarding(clean(b.data));validateRequests(d,parseRow(r).data);const step=Number.isInteger(b.step)?Math.max(0,Math.min(steps.length-1,b.step)):0;if(step>unlockedStep(d,config))fail('Finish the current onboarding step before continuing.',409);const now=new Date().toISOString();await db.prepare('UPDATE applications SET data=?,step=?,updated_at=? WHERE id=?').bind(JSON.stringify(d),step,now,id).run();return json({savedAt:now});}
  if(path[2]==='submit'&&req.method==='POST'){assertEdit(r);const b:any=await req.json();const d=normalizeOnboarding(clean(b.data));validateRequests(d,parseRow(r).data);if(b.pricingVersion!==config.pricingVersion)fail('The price list changed. Review the updated prices before submitting.',409);const errors=submissionErrors(d,config);if(errors.length)fail(errors.join(' '));const chosen=config.signupOptions.find((o:any)=>o.id===d.signupId&&o.enabled);d.plan=d.alreadyHaveAccount?'I already have an account':chosen.name;const now=new Date().toISOString();const snapshot={version:config.pricingVersion,fees:config.fees,priceList:config.priceList,signupOption:d.alreadyHaveAccount?{name:"Existing account"}:chosen,note:config.pricingNote,selectedPlan:d.plan,pricingTier:chosen?.pricingTier||null,requestedFeatures:d.requestedFeatures||[],aiBilling:d.aiBilling,acknowledgedAt:now,signature:d.signature};await db.prepare('UPDATE applications SET data=?,status=?,step=?,submitted_at=?,updated_at=?,pricing_snapshot=? WHERE id=?').bind(JSON.stringify(d),'submitted',steps.length-1,now,now,JSON.stringify(snapshot),id).run();return json({submittedAt:now});}
  if(path[2]==='team'&&req.method==='PUT'){if(!admin)fail('Team access required',403);const b:any=await req.json();if(!['draft','submitted','in_progress','changes_requested','ready','launched'].includes(b.status))fail('Invalid status');const tasks=[...taskNames,...applicationTasks(parseRow(r).data),...onboardingTasks(parseRow(r).data)];const checklist:any={};for(const k of tasks)checklist[k]=['Pending','In progress','Blocked','Complete','Not needed'].includes(b.checklist?.[k])?b.checklist[k]:'Pending';if(b.status==='launched'&&tasks.some(k=>!['Complete','Not needed'].includes(checklist[k])))fail('Complete or mark each launch task not needed before marking launched.');await db.prepare('UPDATE applications SET status=?,checklist=?,notes=?,updated_at=? WHERE id=?').bind(b.status,JSON.stringify(checklist),String(b.notes||'').slice(0,20000),new Date().toISOString(),id).run();return json({saved:true});}
  if(path[2]==='secret'){
   const secretKey=(env as any).VAULT_KEY;if(!secretKey)fail('The encrypted vault is not configured. Use a provider invitation instead.',503);
   const bytes=Uint8Array.from(atob(secretKey),(x:string)=>x.charCodeAt(0));const key=await crypto.subtle.importKey('raw',bytes,'AES-GCM',false,['encrypt','decrypt']);
   if(req.method==='PUT'){assertEdit(r);const b:any=await req.json();if(typeof b.password!=='string'||!b.password||b.password.length>2000)fail('Enter a password of up to 2,000 characters.');const iv=crypto.getRandomValues(new Uint8Array(12));const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},key,new TextEncoder().encode(b.password)));const ciphertext=btoa(String.fromCharCode(...iv))+'.'+btoa(String.fromCharCode(...encrypted));await db.prepare('INSERT INTO secrets (application_id,ciphertext,updated_at) VALUES (?,?,?) ON CONFLICT(application_id) DO UPDATE SET ciphertext=excluded.ciphertext,updated_at=excluded.updated_at').bind(id,ciphertext,new Date().toISOString()).run();return json({saved:true});}
   if(req.method==='GET'){if(!admin)fail('Team access required',403);const s:any=await db.prepare('SELECT ciphertext FROM secrets WHERE application_id=?').bind(id).first();if(!s)fail('No password saved',404);const [iv,ct]=s.ciphertext.split('.').map((x:string)=>Uint8Array.from(atob(x),(c:string)=>c.charCodeAt(0)));const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(id)},key,ct);return json({password:new TextDecoder().decode(decrypted)});}
   if(req.method==='DELETE'){if(!admin)fail('Team access required',403);await db.prepare('DELETE FROM secrets WHERE application_id=?').bind(id).run();return json({deleted:true});}
  }
  if(path[2]==='files'&&req.method==='POST'){assertEdit(r);if(Number(req.headers.get('content-length')||0)>11*1024*1024)fail('Files must be 10 MB or smaller.');const f=await req.formData();const file=f.get('file');const category=String(f.get('category')||'Other');if(!(file instanceof File)||file.size>10*1024*1024||!file.size)fail('Choose a file between 1 byte and 10 MB.');if(!/\.(pdf|png|jpe?g|webp|csv|tsv|xlsx?|docx?|txt)$/i.test(file.name))fail('Use PDF, image, CSV, Excel, Word, or text files.');const count:any=await db.prepare('SELECT count(*) as n FROM attachments WHERE application_id=?').bind(id).first();if(count.n>=30)fail('Maximum 30 files per application.');if(!env.BUCKET)fail('File storage unavailable',503);const fileId=crypto.randomUUID(),objectKey=id+'/'+fileId;const name=file.name.replace(/[\r\n"\\/]/g,'_').slice(0,180);await env.BUCKET.put(objectKey,await file.arrayBuffer(),{httpMetadata:{contentType:'application/octet-stream'}});try{await db.prepare('INSERT INTO attachments (id,application_id,name,category,size,type,object_key,created_at) VALUES (?,?,?,?,?,?,?,?)').bind(fileId,id,name,category.slice(0,80),file.size,file.type||'application/octet-stream',objectKey,new Date().toISOString()).run();}catch(e){await env.BUCKET.delete(objectKey);throw e;}return json({id:fileId,name,category,size:file.size,type:file.type},201);}
 }
 if(path[0]==='files'&&id){const file:any=await db.prepare('SELECT * FROM attachments WHERE id=?').bind(id).first();if(!file)fail('File not found',404);const a=await getApp(file.application_id);if(req.method==='GET'){const object=await env.BUCKET!.get(file.object_key);if(!object)fail('File not found',404);return new Response(object.body,{headers:{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${file.name}"`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});}if(req.method==='DELETE'){assertEdit(a);await env.BUCKET!.delete(file.object_key);await db.prepare('DELETE FROM attachments WHERE id=?').bind(id).run();return json({deleted:true});}}
 return json({error:'Not found'},404);
 }catch(e:any){return json({error:e.status?e.message:'We couldn’t complete that request. Please try again.'},e.status||500);}}
export const GET=handler,POST=handler,PUT=handler,DELETE=handler;
