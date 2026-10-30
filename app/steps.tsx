'use client';
import React,{useContext} from 'react';
import {Field,CheckField,Choices,Multi,Section,Note,Upload,FeeMenu,FormContext} from './form-parts';
import {ArrowRight,FileDown,Clock3} from 'lucide-react';
import SignupStep from './signup-step';
import {deferredSetupItems,missingFields} from '../lib/shared';
import {setupServices,hasService} from '../lib/onboarding';

export default function StepContent({step,config,exportBrief,jump}:any){
 const {data}=useContext(FormContext);
 const service=(name:string)=>hasService(data,name);
 const later=deferredSetupItems(data);
 return <>
  {step===0&&<SignupStep config={config}/>}
  {step===1&&<>
   <Section title="Your business" description="A short description is enough. Your specialist will work through the details with you.">
    <div className="form-grid"><Field name="legalName" label="Business name" placeholder="Your registered business name" required autoComplete="organization"/><Field name="services" label="What does your business offer?" placeholder="e.g. Home cleaning for families in Los Angeles" required rows={2} wide/></div>
   </Section>
   <Section title="Who should we work with?" description="We’ll reuse these details for your setup so you don’t have to enter them again.">
    <div className="form-grid"><Field name="contactName" label="Your name" required autoComplete="name"/><Field name="contactEmail" label="Contact email" type="email" required autoComplete="email"/><Field name="contactPhone" label="Contact phone" type="tel" required autoComplete="tel"/></div>
   </Section>
   <details className="quick-details"><summary>Add a website or a note <span>Optional</span></summary><div className="quick-details-body form-grid"><Field name="website" label="Existing website" type="url" placeholder="https://yourbusiness.com"/><Field name="goal" label="Your main goal" placeholder="e.g. Book more appointments"/><Field name="finalNotes" label="Anything your specialist should know?" rows={2} wide/></div></details>
  </>}
  {step===2&&<>
   <Section title="How would you like to get started?">
    <Choices name="setupMode" options={[{value:'Help me choose',description:'Tell us your business basics. Your specialist will recommend the right setup.',tag:'Quickest path'},{value:'Choose my services',description:'Pick what you need. Add any preferences you already know.'}]}/>
   </Section>
   {data.setupMode==='Help me choose'?<div className="specialist-handoff"><Clock3 size={22}/><div><h3>That’s enough to get started.</h3><p>Your specialist will confirm your services, account access, documents, and settings with you. Continue to review your brief.</p></div></div>:<>
    <Section title="What would you like us to set up?" description="Choose only what you need. Every detail below is optional unless you choose to provide it now."><Multi name="launchTasks" options={setupServices}/></Section>
    {(service('Website / landing page')||service('Business email'))&&<Section title="Your domain & email">
     <Choices name="domainStatus" compact options={['I have a domain','I need a new domain','Help me decide']}/>
     {data.domainStatus!=='Help me decide'&&<div className="form-grid"><Field name="domain" label={data.domainStatus==='I have a domain'?'Your domain':'Domain you would like'} placeholder="yourbusiness.com" hint="Leave blank if you would like a recommendation."/>{service('Business email')&&<Field name="senderEmail" label="Preferred business email" placeholder="hello@yourbusiness.com" type="email" hint="Optional — your specialist can recommend one."/>}</div>}
     <p className="setup-later-note">Your team will arrange domain access, DNS, and content with you after this brief. No passwords needed here.</p>
    </Section>}
    {service('Phone & SMS')&&<Section title="Your business phone">
     <Choices name="numberType" compact options={['New local number','Port an existing number','Toll-free — please advise']}/>
     <div className="form-grid">{data.numberType==='Port an existing number'?<Field name="existingNumber" label="Number you would like to transfer" type="tel" required/>:<Field name="areaCode" label="Preferred area code" placeholder="e.g. 661" hint="Optional and subject to availability."/>}</div>
     <p className="setup-default-summary">Calls will forward to <strong>{data.contactPhone||'your contact phone'}</strong> unless you choose another number.</p>
     <CheckField name="differentRoutingPhone">Use a different number for call forwarding</CheckField>{data.differentRoutingPhone&&<Field name="routingPhone" label="Forward calls to" type="tel" required/>}
     <details className="quick-details"><summary>Business verification & A2P details <span>Optional today</span></summary><div className="quick-details-body">
      <Note>Your specialist will collect and review the required business and messaging details before submitting an A2P application. Sending this brief does not register or activate SMS.</Note>
      <CheckField name="provideVerificationNow">I have my business details ready and want to add them now</CheckField>
      {data.provideVerificationNow&&<>
       <Choices name="brandType" compact options={['Registered business','Sole proprietor']}/>
       <div className="form-grid"><Field name="country" label="Country of registration" options={['United States','Canada','United Kingdom','Australia','New Zealand','Other']}/>{data.brandType==='Registered business'&&<Field name="taxId" label="EIN / business registration number" placeholder="12-3456789" hint="Use a business registration number, never a personal SSN." required/>}<Field name="address" label="Registered street address" required wide autoComplete="street-address"/><Field name="city" label="City" required autoComplete="address-level2"/><Field name="region" label="State / region" required autoComplete="address-level1"/><Field name="postalCode" label="ZIP / postal code" required autoComplete="postal-code"/></div>
       <p className="setup-default-summary">We’ll use <strong>{data.contactName}</strong> as your business representative.</p><CheckField name="differentRepresentative">Use a different authorized representative</CheckField>
       {data.differentRepresentative&&<div className="form-grid"><Field name="representative" label="Representative’s name" required/><Field name="representativeEmail" label="Representative’s email" type="email" required/></div>}
       <div className="form-grid"><Field name="campaign" label="What will your SMS messages be used for?" rows={2} wide required placeholder="e.g. Appointment reminders and service updates"/><Field name="consentMethod" label="How do customers agree to receive messages?" rows={2} wide required/><Field name="sampleMessage" label="An example message" rows={2} wide required/></div>
       <Upload category="Verification" title="Add supporting documents (optional)" description="Only upload ID if your specialist or provider has requested it."/>
      </>}
     </div></details>
    </Section>}
    {service('Booking calendar')&&<Section title="Your booking calendar">
     <p className="setup-default-summary">We’ll use <strong>{data.contactEmail||'your contact email'}</strong> for the calendar. Your specialist can help with connection and availability.</p>
     <CheckField name="customizeCalendar">Set my booking preferences now</CheckField>
     {data.customizeCalendar&&<>
      <div className="form-grid"><Field name="timezone" label="Business timezone" options={['America/Los_Angeles','America/Denver','America/Chicago','America/New_York','America/Phoenix','America/Anchorage','Pacific/Honolulu','America/Toronto','Europe/London','Asia/Manila','Australia/Sydney','UTC']} required/><Field name="duration" label="Appointment length (minutes)" options={['15','20','30','45','60','90']}/></div>
      <div className="field-label">Available days</div><Multi name="days" options={['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']}/><div className="form-grid"><Field name="startTime" label="From" type="time"/><Field name="endTime" label="Until" type="time"/></div>
      <CheckField name="differentCalendarOwner">Use a different calendar owner</CheckField>{data.differentCalendarOwner&&<Field name="calendarOwner" label="Calendar owner email" type="email" required/>}
     </>}
    </Section>}
    {service('Contact import')&&<Section title="Your contacts">
     <Choices name="importMode" compact options={['Later with my setup team','Starting fresh','I have contacts to import']}/>
     {data.importMode==='I have contacts to import'&&<><CheckField name="importConsent">I have permission to share these records for setup. Marketing requires the appropriate channel consent.</CheckField>{data.importConsent?<><Upload category="Contacts" title="Upload a contact list" description="CSV, TSV, Excel · Up to 10 MB per file"/><a className="text-link" href="/contact-import-template.csv" download><FileDown size={15}/> Download a CSV template</a></>:<p className="setup-later-note">Confirm permission above to upload, or choose to provide your contacts later.</p>}</>}
    </Section>}
    {service('Follow-up automation')&&<Section title="Your follow-up process">
     <Choices name="sopMode" compact options={['Build a playbook for me','I have an existing SOP']}/>
     <Field name="leadGoal" label="What should happen after a new inquiry?" placeholder="e.g. Book a consultation" hint="Optional — your specialist can help you decide."/>
     {data.sopMode==='I have an existing SOP'&&<details className="quick-details"><summary>Upload your existing process <span>Optional</span></summary><div className="quick-details-body"><Upload category="Follow-up SOP" title="Add your SOP or templates"/></div></details>}
     <p className="setup-later-note">We already have your services and contact details. Your specialist will prepare the timing, messages, and handoff rules for your approval.</p>
    </Section>}
    {service('AI receptionist')&&<Section title="AI receptionist">
     <Choices name="aiMode" options={['Discuss with my setup team','After hours & missed calls','All inbound inquiries']}/>
     <p className="setup-later-note">Your specialist will collect FAQs, greetings, transfer rules, and billing preferences before testing and activation.</p>
    </Section>}
   </>}
  </>}
  {step===3&&<>
   <div className="quick-review-grid">
    {[['Your account',data.plan||'Account confirmation needed',0],['Your business',[data.legalName,data.services,data.contactName,data.contactEmail,data.contactPhone].filter(Boolean).join(' · '),1],['Your setup',data.setupMode==='Help me choose'?'Your specialist will recommend the right setup.':(data.launchTasks||[]).join(' · '),2]].map(([title,value,index])=><button type="button" className="quick-review-card" key={String(title)} onClick={()=>jump(Number(index))}><div><strong>{title}</strong><p>{value}</p></div><span>Edit <ArrowRight size={15}/></span></button>)}
   </div>
   {missingFields(data).length>0&&<Note>There are {missingFields(data).length} required details to complete. Select Edit above to add them.</Note>}
   {!!later.length&&<div className="specialist-handoff"><Clock3 size={22}/><div><h3>With your setup specialist</h3><p>You can send this brief now. Your team will follow up on:</p><ul>{later.map(item=><li key={item}>{item}</li>)}</ul><p>These items still need to be resolved before the relevant services go live.</p></div></div>}
   <details className="quick-details"><summary>Your subscription & usage rates <span>Review pricing</span></summary><div className="quick-details-body"><Note>Your account and billing arrangement will be verified by the team. Items marked Confirm with CQL need a quote before activation.</Note><FeeMenu config={config}/></div></details>
   {!!data.requestedFeatures?.length&&<Section title="Extra feature requests"><p>{data.requestedFeatures.join(' · ')}</p><p className="setup-later-note">Requests are for team review and do not activate services or charge your card.</p></Section>}
   <Section title="Confirm & send">
    <CheckField name="reviewAccuracy">The details in this brief are accurate, and I authorize the CQL team to use them for the setup requested.</CheckField>
    <CheckField name="reviewAuthority">I’m authorized to provide this business information and any documents, contacts, or account access shared.</CheckField>
    <CheckField name="reviewUsage">I understand that subscription, usage, and optional services may have additional charges. Unconfirmed rates need a separate quote and acceptance before activation. Sending this brief does not charge my card.</CheckField>
    <Field name="signature" label="Your full name to acknowledge" required placeholder="Type your name"/>
   </Section>
   <button type="button" className="btn secondary" onClick={exportBrief}><FileDown size={16}/> Download my setup brief</button>
  </>}
 </>;
}
