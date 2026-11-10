import {PHONE_CALENDAR_STEP,CONTACTS_FOLLOWUP_STEP,AI_RECEPTIONIST_STEP,aiOptions} from '../lib/setup-preferences.mjs';
import assert from 'node:assert/strict';
import {activeStepIndices,steps,initialData,normalizeOnboarding,submissionErrors,stepErrors,requiredFields,unlockedStep,resumeStep,deferredSetupItems,onboardingTasks} from '../lib/onboarding.ts';
import {BRANDING_STEP,colorHex,colorRgb} from '../lib/branding.mjs';
import {DOMAIN_EMAIL_STEP,validDomainName} from '../lib/domain-email.mjs';
import {signupDefaults} from '../lib/catalog.ts';
const config={signupOptions:signupDefaults};
const brief=()=>normalizeOnboarding({...initialData,alreadyHaveAccount:true,signupDone:true,phonePreference:'New local number',calendarAppointmentOwner:'Test Client',availabilityDays:'Monday-Friday',availabilityHours:'9 AM-5 PM',contactsPreference:'Not yet',followupPlaybookPreference:'No',followupGoal:'Book appointments',followupFrequency:'Within one business day',aiReceptionistPreference:'Not right now',domain:'synthetic.example',domainProvider:'Example registrar',businessEmailProvider:'Example mail',emailSetupPreference:'Set up new email',preferredAccessMethod:'Provider invitation (recommended)',primaryColor1:'#1677D2',secondaryColor1:'#FFCC00',legalName:'Synthetic Services',services:'Home cleaning',contactName:'Test Client',contactEmail:'client@example.test',contactPhone:'+15555550100',reviewAccuracy:true,reviewAuthority:true,reviewUsage:true,signature:'Test Client'});
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
check('eight active steps finish with review',()=>{assert.deepEqual(activeStepIndices,[0,1,4,5,6,7,8,3]);assert.equal(steps[activeStepIndices[2]].title,'Branding');assert.equal(requiredFields(brief()).length,20);});
check('essential brief can submit without EIN, SOP, optional calendar settings, or AI details',()=>assert.deepEqual(submissionErrors(brief(),config),[]));
check('each required client detail is still enforced',()=>{for(const [,key] of requiredFields(brief()))assert.ok(submissionErrors({...brief(),[key]:''},config).length);});
check('contact email syntax is validated',()=>assert.match(submissionErrors({...brief(),contactEmail:'bad'},config).join(),/valid contact email/));
check('all checkbox acknowledgments remain explicit',()=>{for(const key of ['reviewAccuracy','reviewAuthority','reviewUsage'])assert.ok(submissionErrors({...brief(),[key]:''},config).length);});
check('submission does not require a typed signature',()=>assert.deepEqual(submissionErrors({...brief(),signature:''},config),[]));
check('signup remains required',()=>assert.ok(stepErrors(0,{...brief(),signupDone:false},config).length));
check('custom setup requires recognized services',()=>{for(const launchTasks of [[],['Unknown service']])assert.ok(stepErrors(2,{...brief(),setupMode:'Choose my services',launchTasks},config).length);});
check('irrelevant old details do not block a specialist-led brief',()=>assert.deepEqual(submissionErrors({...brief(),taxId:'invalid',calendarOwner:'invalid',startTime:'bad',importMode:'I have contacts to import'},config),[]));
check('phone and calendar reuse main contact details',()=>{const d=brief();assert.equal(d.routingPhone,d.contactPhone);assert.equal(d.calendarOwner,d.contactEmail);assert.equal(d.representative,d.contactName);});
check('changing the main contact updates reused values',()=>{const d=normalizeOnboarding({...brief(),contactEmail:'updated@example.test',contactPhone:'+15555550200'});assert.equal(d.calendarOwner,'updated@example.test');assert.equal(d.routingPhone,'+15555550200');});
check('explicit different contact preferences are retained',()=>{const d=normalizeOnboarding({...brief(),differentRoutingPhone:true,routingPhone:'+15555550300',differentCalendarOwner:true,calendarOwner:'calendar@example.test'});assert.equal(d.routingPhone,'+15555550300');assert.equal(d.calendarOwner,'calendar@example.test');});
check('porting requires the number only when phone is selected',()=>{const d={...brief(),setupMode:'Choose my services',launchTasks:['Phone & SMS'],numberType:'Port an existing number'};assert.match(stepErrors(2,d,config).join(),/number to transfer/);assert.deepEqual(stepErrors(2,{...d,launchTasks:['Business email']},config),[]);});
check('verification can be deferred and becomes team follow-up',()=>{const d={...brief(),setupMode:'Choose my services',launchTasks:['Phone & SMS']};assert.deepEqual(submissionErrors(d,config),[]);assert.ok(deferredSetupItems(d).some(s=>s.includes('A2P')));});
check('opting into verification now requires the details and a valid EIN',()=>{const d={...brief(),setupMode:'Choose my services',launchTasks:['Phone & SMS'],provideVerificationNow:true,taxId:'invalid'};assert.match(stepErrors(2,d,config).join(),/registered address/);assert.match(stepErrors(2,d,config).join(),/nine-digit EIN/);});
check('optional calendar customization requires timezone and valid hours',()=>{const d={...brief(),setupMode:'Choose my services',launchTasks:['Booking calendar'],customizeCalendar:true,timezone:'',startTime:'17:00',endTime:'09:00'};assert.match(stepErrors(2,d,config).join(),/business timezone/);assert.match(stepErrors(2,d,config).join(),/end time/);});
check('contact permission is required for selected imports now',()=>{const d={...brief(),setupMode:'Choose my services',launchTasks:['Contact import'],importMode:'I have contacts to import'};assert.match(stepErrors(2,d,config).join(),/permission/);assert.deepEqual(stepErrors(2,{...d,importConsent:true},config),[]);assert.deepEqual(stepErrors(2,{...d,importMode:'Later with my setup team'},config),[]);});
check('legacy draft answers and credentials metadata are preserved',()=>{const d=normalizeOnboarding({...brief(),flowVersion:2,completedSteps:['0','1','2','3','4','5','6'],domain:'old.example.test',accessNotes:'Existing invitation',generatedSop:'Existing draft',routingPhone:'+15555550999'});assert.equal(d.domain,'old.example.test');assert.equal(d.accessNotes,'Existing invitation');assert.equal(d.generatedSop,'Existing draft');assert.equal(d.routingPhone,'+15555550999');assert.deepEqual(d.completedSteps,['0','1','2']);});
check('legacy review step maps to the new review',()=>{const d={...brief(),flowVersion:2,completedSteps:['0','1','2','3','4','5','6']};assert.equal(resumeStep(d,7,config),BRANDING_STEP);});
check('incomplete migrated business details cannot unlock setup',()=>{const d=normalizeOnboarding({...brief(),flowVersion:2,legalName:'',completedSteps:['0','1','2','3','4','5','6']});assert.equal(unlockedStep(d,config),1);});
check('new drafts unlock sequentially',()=>{const d=brief();assert.equal(unlockedStep(d,config),0);assert.equal(unlockedStep({...d,completedSteps:['0']},config),1);assert.equal(unlockedStep({...d,completedSteps:['0','1','2']},config),BRANDING_STEP);});
check('business completion unlocks branding without completing hidden setup',()=>{
 const d={...brief(),completedSteps:['0','1']};
 assert.equal(unlockedStep(d,config),BRANDING_STEP);
 assert.equal(resumeStep(d,2,config),BRANDING_STEP);
 assert.equal(resumeStep(d,3,config),BRANDING_STEP);
 assert.equal(resumeStep({...d,contactEmail:''},2,config),1);
});
check('hidden setup requirements do not block sending a brief or erase saved answers',()=>{
 const d=normalizeOnboarding({...brief(),completedSteps:['0','1'],setupMode:'Choose my services',launchTasks:['Phone & SMS'],numberType:'Port an existing number',existingNumber:'',domain:'saved.example.test'});
 assert.ok(stepErrors(2,d,config).length);
 assert.deepEqual(submissionErrors(d,config),[]);
 assert.equal(d.domain,'saved.example.test');
 assert.equal(d.setupMode,'Choose my services');
 assert.deepEqual(d.launchTasks,['Phone & SMS']);
});
check('deferred work yields launch checklist tasks, without changing old submissions',()=>{assert.ok(onboardingTasks(brief()).length);assert.deepEqual(onboardingTasks({...brief(),flowVersion:2}),[]);});
check('tabbed business profile preserves independent representative details and all tab answers',()=>{
 const profile=normalizeOnboarding({...brief(),businessProfileVersion:1,representativeFirstName:'Casey',representativeLastName:'Example',representativeEmail:'representative@example.test',representativePhone:'+15555550999',friendlyBusinessName:'Friendly business',businessNiche:'Dental',businessCurrency:'USD',businessType:'Corporation',businessIndustry:'Healthcare',registrationIdType:'EIN',taxId:'123456789',businessNotRegistered:false,businessRegions:['USA and Canada'],address:'123 Test Street',city:'Test City',region:'California',postalCode:'90001',country:'United States',timezone:'America/Los_Angeles',platformLanguage:'English (United States)',outboundLanguage:'Spanish',representativeJobPosition:'Owner'});
 assert.equal(profile.contactName,'Casey Example');
 assert.equal(profile.representativeEmail,'representative@example.test');
 assert.equal(profile.contactEmail,'client@example.test');
 assert.deepEqual(submissionErrors(profile,config),[]);
 for(const name of ['friendlyBusinessName','businessNiche','businessType','businessIndustry','registrationIdType','address','city','postalCode','region','country','representativeFirstName','representativeLastName','representativeEmail','representativeJobPosition','representativePhone']){
  assert.ok(stepErrors(1,{...profile,[name]:''},config).length,`${name} must be required`);
  assert.ok(submissionErrors({...profile,[name]:''},config).length,`${name} must block submission`);
 }
 assert.ok(stepErrors(1,{...profile,businessRegions:[]},config).some(error=>/region of operations/.test(error)));
 assert.ok(stepErrors(1,{...profile,businessRegions:['invalid']},config).length);
 assert.deepEqual(stepErrors(1,{...profile,businessNotRegistered:true,businessIndustry:'',registrationIdType:'',taxId:''},config),[]);
 assert.deepEqual(submissionErrors({...profile,businessNotRegistered:true,businessIndustry:'',registrationIdType:'',taxId:''},config),[]);
 assert.ok(stepErrors(1,{...profile,businessNotRegistered:false,businessIndustry:'',registrationIdType:''},config).length);
 assert.deepEqual(stepErrors(1,{...profile,businessNotRegistered:true,registrationIdType:'Not registered'},config),[]);

 const saved=normalizeOnboarding(JSON.parse(JSON.stringify(profile)));
 assert.deepEqual(saved,profile);
 assert.equal(saved.friendlyBusinessName,'Friendly business');
 assert.deepEqual(saved.businessRegions,['USA and Canada']);
 assert.equal(saved.representativePhone,'+15555550999');
 assert.equal(saved.outboundLanguage,'Spanish');
 assert.ok(stepErrors(1,{...profile,timezone:''},config).some(error=>/time zone/i.test(error)));
 assert.ok(stepErrors(1,{...profile,timezone:'invalid'},config).some(error=>/time zone/i.test(error)));
 assert.ok(stepErrors(1,{...profile,representativeEmail:'invalid'},config).some(error=>/representative email/.test(error)));
 assert.ok(stepErrors(1,{...profile,website:'javascript:alert(1)'},config).some(error=>/website/.test(error)));
 assert.deepEqual(submissionErrors({...profile,services:'',businessNotRegistered:true,taxId:''},config),[]);
});
check('branding requires two main colors and validates optional colors',()=>{
 const d=brief();
 assert.deepEqual(stepErrors(BRANDING_STEP,d,config),[]);
 for(const name of ['primaryColor1','secondaryColor1'])assert.ok(stepErrors(BRANDING_STEP,{...d,[name]:''},config).length);
 for(const name of ['primaryColor2','primaryColor3','secondaryColor2','secondaryColor3']){
  assert.deepEqual(stepErrors(BRANDING_STEP,{...d,[name]:''},config),[]);
  assert.ok(stepErrors(BRANDING_STEP,{...d,[name]:'invalid'},config).length);
 }
 assert.equal(colorHex('#abc'),'#AABBCC');assert.equal(colorHex('rgb(255, 0, 22)'),'#FF0016');
 assert.equal(colorHex('255, 0, 22'),'#FF0016');assert.equal(colorRgb('#FF0016'),'255, 0, 22');
 for(const value of ['rgb(256,0,0)','-1,0,0','#12345','rgb(1,2,3','1,2,3)'])assert.equal(colorHex(value),null);
 assert.equal(unlockedStep({...d,completedSteps:['0','1','4']},config),DOMAIN_EMAIL_STEP);
 assert.equal(resumeStep({...d,completedSteps:['0','1','4']},3,config),DOMAIN_EMAIL_STEP);
 assert.equal(unlockedStep({...d,primaryColor1:'',completedSteps:['0','1','4']},config),BRANDING_STEP);
 assert.ok(submissionErrors({...d,secondaryColor1:''},config).length);
});
check('domain and email fields gate review and preserve optional instructions',()=>{
 const d={...brief(),completedSteps:['0','1','4','5','6','7','8'],accessNotes:'Invite the setup specialist using the provider portal.'};
 assert.deepEqual(stepErrors(DOMAIN_EMAIL_STEP,d,config),[]);
 assert.equal(unlockedStep(d,config),3);
 assert.equal(resumeStep(d,3,config),3);
 for(const name of ['domain','domainProvider','businessEmailProvider','emailSetupPreference','preferredAccessMethod']){
  assert.ok(stepErrors(DOMAIN_EMAIL_STEP,{...d,[name]:''},config).length);
  assert.equal(unlockedStep({...d,[name]:''},config),DOMAIN_EMAIL_STEP);
  assert.ok(submissionErrors({...d,[name]:''},config).length);
 }
 for(const value of ['https://example.com','example.com/page','name@example.com','localhost','127.0.0.1','bad_domain.com'])assert.equal(validDomainName(value),false);
 for(const value of ['example.com','mail.example.co.uk','xn--bcher-kva.example'])assert.equal(validDomainName(value),true);
 assert.ok(stepErrors(DOMAIN_EMAIL_STEP,{...d,emailSetupPreference:'invalid'},config).length);
 assert.ok(stepErrors(DOMAIN_EMAIL_STEP,{...d,preferredAccessMethod:'invalid'},config).length);
 assert.deepEqual(stepErrors(DOMAIN_EMAIL_STEP,{...d,accessNotes:''},config),[]);
 assert.equal(normalizeOnboarding(JSON.parse(JSON.stringify(d))).accessNotes,d.accessNotes);
});
check('phone and calendar require essential preferences but optional settings stay optional',()=>{
 const d=brief();assert.deepEqual(stepErrors(PHONE_CALENDAR_STEP,d,config),[]);
 for(const name of ['phonePreference','calendarAppointmentOwner','availabilityDays','availabilityHours'])assert.ok(stepErrors(PHONE_CALENDAR_STEP,{...d,[name]:''},config).length);
 for(const name of ['appointmentDuration','bookingBuffer','bookingNotice']){
  assert.deepEqual(stepErrors(PHONE_CALENDAR_STEP,{...d,[name]:''},config),[]);
  assert.ok(stepErrors(PHONE_CALENDAR_STEP,{...d,[name]:'invalid'},config).length);
 }
 assert.ok(stepErrors(PHONE_CALENDAR_STEP,{...d,phonePreference:'invalid'},config).length);
});
check('contacts require explicit permission only when the client has contacts',()=>{
 const d=brief();assert.deepEqual(stepErrors(CONTACTS_FOLLOWUP_STEP,d,config),[]);
 assert.ok(stepErrors(CONTACTS_FOLLOWUP_STEP,{...d,contactsPreference:'Yes, I have contacts'},config).length);
 assert.deepEqual(stepErrors(CONTACTS_FOLLOWUP_STEP,{...d,contactsPreference:'Yes, I have contacts',contactImportPermission:true},config),[]);
 assert.ok(stepErrors(CONTACTS_FOLLOWUP_STEP,{...d,contactsPreference:'Yes, I have contacts',contactImportPermission:'true'},config).length);
 for(const name of ['contactsPreference','followupPlaybookPreference','followupGoal','followupFrequency'])assert.ok(stepErrors(CONTACTS_FOLLOWUP_STEP,{...d,[name]:''},config).length);
 assert.ok(stepErrors(CONTACTS_FOLLOWUP_STEP,{...d,followupPlaybookPreference:'invalid'},config).length);
});
check('AI is optional but its opt-in decision is explicit; hidden details do not block declining',()=>{
 const d=brief();assert.deepEqual(stepErrors(AI_RECEPTIONIST_STEP,d,config),[]);
 assert.deepEqual(stepErrors(AI_RECEPTIONIST_STEP,{...d,aiReceptionistPreference:aiOptions[0]},config),[]);
 assert.deepEqual(stepErrors(AI_RECEPTIONIST_STEP,{...d,aiToneOfVoice:'old unrecognized value'},config),[]);
 assert.ok(stepErrors(AI_RECEPTIONIST_STEP,{...d,aiReceptionistPreference:''},config).length);
 assert.ok(stepErrors(AI_RECEPTIONIST_STEP,{...d,aiReceptionistPreference:'invalid'},config).length);
 assert.ok(stepErrors(AI_RECEPTIONIST_STEP,{...d,aiReceptionistPreference:aiOptions[0],aiToneOfVoice:'invalid'},config).length);
 assert.equal(unlockedStep({...d,completedSteps:['0','1','4','5']},config),PHONE_CALENDAR_STEP);
 assert.equal(unlockedStep({...d,completedSteps:['0','1','4','5','6']},config),CONTACTS_FOLLOWUP_STEP);
 assert.equal(unlockedStep({...d,completedSteps:['0','1','4','5','6','7']},config),AI_RECEPTIONIST_STEP);
 assert.equal(unlockedStep({...d,completedSteps:['0','1','4','5','6','7','8']},config),3);
 assert.equal(resumeStep({...d,completedSteps:['0','1','4','5']},3,config),PHONE_CALENDAR_STEP);
 const saved=normalizeOnboarding({...d,contactsPreference:'Not yet',contactListNotes:'Retained notes',aiReceptionistPreference:'Not right now',aiDiscussServices:'Retained services'});
 assert.equal(saved.contactListNotes,'Retained notes');assert.equal(saved.aiDiscussServices,'Retained services');
});
console.log(`${count} onboarding checks passed.`);
