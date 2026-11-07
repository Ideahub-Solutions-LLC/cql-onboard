import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSetupBrief,briefRows} from '../lib/setup-brief.ts';

// Long free-form answers must span pages without dropping text or exposing vault data.
const longAnswer='Follow up with every qualified inquiry. '.repeat(450)+'END OF LONG ANSWER';
const sample={
  applicationId:'synthetic-pdf-test',status:'draft',brandName:'Core Quantum Leads',generatedAt:new Date('2026-11-07T01:00:00Z'),
  answers:{legalName:'Synthetic Services',contactEmail:'client@example.test',alreadyHaveAccount:false,signupDone:true,
    primaryColor1:'#1677D2',secondaryColor1:'#FFCC00',domain:'synthetic.example',phonePreference:'New local number',
    contactsPreference:'Not yet',followupGoal:longAnswer,aiReceptionistPreference:'Not right now',reviewAccuracy:true,
    signature:'Test Client',customSavedAnswer:'Retained additional detail',password:'DO-NOT-EXPORT',completedSteps:['0','1'],flowVersion:3},
  files:[{name:'brand-logo.png',category:'Logo Landscape',size:1024,storageKey:'PRIVATE-STORAGE'}],
  checklist:{'Review onboarding':'Complete'},
  pricing:{note:'Confirm with your setup team',fees:[{name:'Example service',rate:'0.025',rates:{Startup:'0.03',Business:'0.025'},unit:'per minute'}],nested:{token:'DO-NOT-EXPORT',approved:false}},
};
assert.deepEqual(briefRows({password:'secret',nested:{accessToken:'secret',approved:false},zero:0,blank:'',items:['A','B']}),[
  ['Nested / Approved','No'],['Zero','0'],['Blank','Not provided'],['Items','A, B'],
]);
const logo=new Uint8Array(readFileSync(new URL('../public/cql-logo.png',import.meta.url)));
const pdf=createSetupBrief(sample,logo);
assert.equal(Object.keys(pdf.internal.collections.addImage_images).length,1,'The PDF embeds one reusable CQL logo');
for(const page of pdf.internal.pages.slice(1)) assert.ok(page.join('\n').includes('/I0 Do'),'Every page includes the CQL logo');
const content=pdf.output();
assert.ok(content.startsWith('%PDF-'));
assert.ok(pdf.getNumberOfPages()>8,'Long answers should paginate');
// Test text before stream compression, across every page.
const streams=Object.values(pdf.internal.pages).flat().join('\n');
for(const value of ['Your account','Your business','Branding','Domain and email','Phone & calendar','Contacts & follow-up','AI receptionist','Review & acknowledgment','END OF LONG ANSWER','Retained additional detail','brand-logo.png','Example service','0.025','Complete']) assert.ok(streams.includes(value),`Missing ${value}`);
for(const value of ['DO-NOT-EXPORT','PRIVATE-STORAGE','Flow version','Completed steps']) assert.ok(!streams.includes(value),`Leaked ${value}`);
assert.equal(briefRows(sample.answers).find(([label])=>label==='Existing CQL account')[1],'No');
if(process.env.SETUP_BRIEF_SAMPLE){
  const {writeFileSync}=await import('node:fs');
  const preview=createSetupBrief({...sample,answers:{...sample.answers,followupGoal:'Respond quickly, qualify leads, and book a consultation.'}},logo);
  writeFileSync(process.env.SETUP_BRIEF_SAMPLE,Buffer.from(preview.output('arraybuffer')));
}
console.log(`PASS PDF export: all steps, retained data, pricing, privacy, and ${pdf.getNumberOfPages()}-page long-answer layout`);
