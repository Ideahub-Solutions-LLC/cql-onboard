import {DOMAIN_EMAIL_STEP,domainEmailFields,emailSetupOptions,accessMethodOptions,validDomainName} from './domain-email.mjs';
import {BRANDING_STEP,REVIEW_STEP,brandColors,colorHex} from './branding.mjs';
import type {SignupOption} from './catalog';

export type Answers=Record<string,unknown>;
type Config={signupOptions:SignupOption[]};
export const FLOW_VERSION=3;
export const steps=[
 {title:'Your account',subtitle:'New or existing account',heading:'Let’s start with your CQL account.',description:'Already with CQL? Use your existing account. New here? Choose a subscription and complete signup in the popup.'},
 {title:'Your business',subtitle:'Just the essentials',heading:'Tell us the basics.',description:'A few details so your setup specialist can get started. You can leave the technical work to us.'},
 {title:'Your setup',subtitle:'Choose what you need',heading:'What would you like help with?',description:'Choose your services, or let your specialist recommend a setup. Detailed settings and documents can come later.'},
 {title:'Review & send',subtitle:'We’ll take it from here',heading:'Ready for your setup team.',description:'Check your details and send your brief. Your specialist will follow up on anything still needed before launch.'},
 {title:'Branding',subtitle:'Colors & logos',heading:'Make it your brand.',description:'Share your brand colors and upload your logos so your setup team can create a consistent look.'},
 {title:'Domain and Email Reference',subtitle:'Domain & email preferences',heading:'Domain and Email Reference',description:'Share your domain, email provider, and preferred way for your setup team to arrange access.'}
];
// Temporarily pause setup choices while retaining their saved answers and stable step IDs.
export const setupStepEnabled=false;
export const activeStepIndices=[0,1,...(setupStepEnabled?[2]:[]),BRANDING_STEP,DOMAIN_EMAIL_STEP,REVIEW_STEP];
export const setupServices=['Website / landing page','Business email','Phone & SMS','Booking calendar','Follow-up automation','Contact import','AI receptionist'];
export const initialData:Answers={flowVersion:FLOW_VERSION,completedSteps:[],requestedFeatures:[],signupId:'',signupDone:false,alreadyHaveAccount:false,plan:'',setupMode:'Help me choose',launchTasks:[],country:'United States',brandType:'Registered business',domainStatus:'Help me decide',domainAccess:'Later with my setup team',siteType:'Landing page',numberType:'New local number',phoneCountry:'United States',differentRoutingPhone:false,differentCalendarOwner:false,differentRepresentative:false,customizeCalendar:false,provideVerificationNow:false,timezone:'',duration:'30',buffer:'15',notice:'24',days:['Monday','Tuesday','Wednesday','Thursday','Friday'],startTime:'09:00',endTime:'17:00',meetingType:'Video call',calendarProvider:'Google Calendar',importMode:'Later with my setup team',sopMode:'Build a playbook for me',channels:['Email','SMS'],cadence:'Immediately, 1 day, 3 days, 7 days',tone:'Friendly & professional',sendingWindow:'Confirm with my setup team',aiMode:'Discuss with my setup team',aiBilling:'AI Pay-Per-Use',aiLanguage:'English'};
export const answer=(d:Answers,key:string)=>typeof d[key]==='string'?(d[key] as string).trim():'';
export const list=(d:Answers,key:string)=>Array.isArray(d[key])?(d[key] as unknown[]).filter((v):v is string=>typeof v==='string'):[];
export const hasService=(d:Answers,service:string)=>d.setupMode==='Choose my services'&&list(d,'launchTasks').includes(service);
const validEmail=(value:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// Reuse contact details, preserve old answers, and translate old completion markers.
export function normalizeOnboarding(raw:Answers):Answers{
 const legacy=raw.flowVersion!==FLOW_VERSION;
 const d:Answers={...initialData,...raw,flowVersion:FLOW_VERSION};
 if(legacy){
  d.setupMode=list(raw,'launchTasks').length?'Choose my services':'Help me choose';
  d.differentRoutingPhone=!!answer(raw,'routingPhone')&&answer(raw,'routingPhone')!==answer(raw,'contactPhone');
  d.differentCalendarOwner=!!answer(raw,'calendarOwner')&&answer(raw,'calendarOwner')!==answer(raw,'contactEmail');
  d.differentRepresentative=(!!answer(raw,'representative')&&answer(raw,'representative')!==answer(raw,'contactName'))||(!!answer(raw,'representativeEmail')&&answer(raw,'representativeEmail')!==answer(raw,'contactEmail'));
  d.provideVerificationNow=['address','city','region','postalCode','campaign','consentMethod','sampleMessage'].every(k=>!!answer(raw,k));
  d.customizeCalendar=!!answer(raw,'timezone')&&!!answer(raw,'calendarOwner');
  const old=list(raw,'completedSteps');
  d.completedSteps=[...(old.includes('0')?['0']:[]),...(old.includes('1')?['1']:[]),...(old.includes('6')?['2']:[])];
 }
 if(!d.differentRoutingPhone)d.routingPhone=answer(d,'contactPhone');
 if(!d.differentCalendarOwner)d.calendarOwner=answer(d,'contactEmail');
 if(d.businessProfileVersion===1){
  const fullName=answer(raw,'representative')||answer(raw,'contactName');
  const names=fullName.split(/\s+/);
  d.representativeFirstName=typeof raw.representativeFirstName==='string'?raw.representativeFirstName:(names[0]||'');
  d.representativeLastName=typeof raw.representativeLastName==='string'?raw.representativeLastName:names.slice(1).join(' ');
  d.contactName=[answer(d,'representativeFirstName'),answer(d,'representativeLastName')].filter(Boolean).join(' ');
  d.representative=d.contactName;
  d.differentRepresentative=true;
 }
 if(!d.differentRepresentative){d.representative=answer(d,'contactName');d.representativeEmail=answer(d,'contactEmail');d.representativePhone=answer(d,'contactPhone');}
 return d;
}
export function requiredFields(d:Answers):[number,string,string][]{
 const fields:[number,string,string][]=[[1,'legalName','Business name'],[1,'contactName','Your name'],[1,'contactEmail','Contact email'],[1,'contactPhone','Contact phone']];
 for(const [name,label] of domainEmailFields)fields.push([DOMAIN_EMAIL_STEP,name,label]);
 for(const color of brandColors)if(color.required)fields.push([BRANDING_STEP,color.name,color.label]);
 if(d.businessProfileVersion===1){
  const profileFields=[['friendlyBusinessName','Friendly Business Name'],['businessNiche','Business Niche'],['businessType','Business Type'],['businessIndustry','Business Industry'],['registrationIdType','Business Registration ID Type'],['address','Street Address'],['city','City'],['postalCode','Postal/Zip Code'],['region','State / Prov / Region'],['country','Country'],['representativeFirstName','First Name'],['representativeLastName','Last Name'],['representativeEmail','Representative Email'],['representativeJobPosition','Job Position'],['representativePhone','Phone Number (With Country Code)'],['timezone','Time zone']];
  for(const [name,label] of profileFields)fields.push([1,name,label]);
 }
 if(hasService(d,'Phone & SMS')&&d.numberType==='Port an existing number')fields.push([2,'existingNumber','Number to transfer']);
 if(hasService(d,'Phone & SMS')&&d.differentRoutingPhone)fields.push([2,'routingPhone','Call forwarding number']);
 if(hasService(d,'Booking calendar')&&d.customizeCalendar){fields.push([2,'timezone','Business timezone']);if(d.differentCalendarOwner)fields.push([2,'calendarOwner','Calendar owner email']);}
 if(hasService(d,'Phone & SMS')&&d.provideVerificationNow){
  for(const [key,label] of [['address','Registered address'],['city','City'],['region','State / region'],['postalCode','ZIP / postal code'],['campaign','Messaging purpose'],['consentMethod','How contacts opt in'],['sampleMessage','Sample message']])fields.push([2,key,label]);
  if(d.brandType==='Registered business')fields.push([2,'taxId','Business registration / tax ID']);
  if(d.differentRepresentative)fields.push([2,'representative','Authorized representative'],[2,'representativeEmail','Representative email']);
 }
 return fields;
}
export const missingFields=(d:Answers)=>requiredFields(d).filter(([,key])=>!answer(d,key));
export function stepErrors(step:number,d:Answers,config:Config):string[]{
 const errors=missingFields(d).filter(([i])=>i===step).map(([, ,label])=>'Add '+label.toLowerCase()+'.');
 if(step===0){if(!d.alreadyHaveAccount&&!config.signupOptions.some(o=>o.id===d.signupId&&o.enabled))errors.push('Choose an available signup option.');if(!d.signupDone)errors.push(d.alreadyHaveAccount?'Confirm that you already have a CQL account.':'Finish signup in the popup, then choose “I’ve completed signup”.');}
 if(step===1&&answer(d,'contactEmail')&&!validEmail(answer(d,'contactEmail')))errors.push('Enter a valid contact email.');
 if(step===1){
  if(d.businessProfileVersion===1&&!list(d,'businessRegions').some(region=>['Africa','Asia','Europe','Latin America','USA and Canada'].includes(region)))errors.push('Choose at least one business region of operations.');
  if(answer(d,'representativeEmail')&&!validEmail(answer(d,'representativeEmail')))errors.push('Enter a valid representative email.');
  if(answer(d,'website')){try{const url=new URL(answer(d,'website'));if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error();}catch{errors.push('Enter a valid business website beginning with https:// or http://.');}}
  if(answer(d,'timezone')){try{new Intl.DateTimeFormat('en',{timeZone:answer(d,'timezone')});}catch{errors.push('Choose a valid time zone.');}}
 }
 if(step===DOMAIN_EMAIL_STEP){
  if(answer(d,'domain')&&!validDomainName(answer(d,'domain')))errors.push('Enter a valid domain name such as yourcompany.com, without https:// or a page path.');
  if(answer(d,'emailSetupPreference')&&!emailSetupOptions.includes(answer(d,'emailSetupPreference')))errors.push('Choose an available email setup preference.');
  if(answer(d,'preferredAccessMethod')&&!accessMethodOptions.includes(answer(d,'preferredAccessMethod')))errors.push('Choose an available access method.');
 }
 if(step===BRANDING_STEP){for(const color of brandColors){const value=answer(d,color.name);if(value&&!colorHex(value))errors.push('Enter a valid Hex or RGB value for '+color.label+'.');}}
 if(step===2){
  if(!['Help me choose','Choose my services'].includes(answer(d,'setupMode')))errors.push('Choose how you would like to plan your setup.');
  if(d.setupMode==='Choose my services'&&(!list(d,'launchTasks').length||list(d,'launchTasks').some(s=>!setupServices.includes(s))))errors.push('Choose at least one service, or let your specialist help you choose.');
  if(hasService(d,'Booking calendar')&&d.customizeCalendar){if(d.differentCalendarOwner&&answer(d,'calendarOwner')&&!validEmail(answer(d,'calendarOwner')))errors.push('Enter a valid calendar owner email.');if(!list(d,'days').length)errors.push('Choose at least one available day.');if(!/^\d{2}:\d{2}$/.test(answer(d,'startTime'))||!/^\d{2}:\d{2}$/.test(answer(d,'endTime'))||answer(d,'startTime')>=answer(d,'endTime'))errors.push('Choose an end time after the start time.');}
  if(hasService(d,'Phone & SMS')&&d.provideVerificationNow){if(d.differentRepresentative&&answer(d,'representativeEmail')&&!validEmail(answer(d,'representativeEmail')))errors.push('Enter a valid representative email.');if(d.brandType==='Registered business'&&d.country==='United States'&&answer(d,'taxId')&&!/^\d{2}-?\d{7}$/.test(answer(d,'taxId')))errors.push('Enter your nine-digit EIN.');}
  if(hasService(d,'Contact import')&&d.importMode==='I have contacts to import'&&!d.importConsent)errors.push('Confirm permission to share your contact records.');
 }
 return errors;
}
export function submissionErrors(d:Answers,config:Config){const errors=activeStepIndices.flatMap(i=>stepErrors(i,d,config));if(!d.reviewAccuracy||!d.reviewUsage||!d.reviewAuthority||!answer(d,'signature'))errors.push('Complete the acknowledgments and type your name.');return errors;}
export function unlockedStep(d:Answers,config:Config){let position=0;while(position<activeStepIndices.length-1&&list(d,'completedSteps').includes(String(activeStepIndices[position]))&&!stepErrors(activeStepIndices[position],d,config).length)position++;return activeStepIndices[position];}
export function resumeStep(raw:Answers,storedStep:number,config:Config){const mapped=raw.flowVersion===FLOW_VERSION?storedStep:storedStep===0?0:storedStep===1?1:storedStep===7?3:2;return activeStepIndices[Math.max(0,Math.min(activeStepIndices.indexOf(!setupStepEnabled&&mapped===2?BRANDING_STEP:mapped),activeStepIndices.indexOf(unlockedStep(normalizeOnboarding(raw),config))))];}
export function deferredSetupItems(d:Answers):string[]{
 if(d.flowVersion!==FLOW_VERSION)return [];
 if(d.setupMode==='Help me choose')return ['Confirm services and setup scope','Collect technical settings and account access'];
 const items:string[]=[];
 if(hasService(d,'Website / landing page'))items.push('Domain access, content, and publishing');
 if(hasService(d,'Business email'))items.push('Email setup and DNS connection');
 if(hasService(d,'Phone & SMS')&&!d.provideVerificationNow)items.push('Business verification and A2P preparation');
 if(hasService(d,'Booking calendar')&&!d.customizeCalendar)items.push('Calendar connection and availability');
 if(hasService(d,'Contact import')&&d.importMode!=='Starting fresh')items.push('Contact import and consent review');
 if(hasService(d,'Follow-up automation'))items.push('Follow-up playbook and approval');
 if(hasService(d,'AI receptionist'))items.push('AI receptionist details, testing, and approval');
 return items;
}
export const onboardingTasks=(d:Answers)=>deferredSetupItems(d).map(item=>'Follow up · '+item);
