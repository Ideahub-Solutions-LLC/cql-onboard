/** @typedef {Record<string, unknown>} RecordData */
/** @typedef {{title: string, fields: string[]}} Section */
/** @type {Section[]} */
export const briefSections = [
  {title:'01 / Your account',fields:['alreadyHaveAccount','signupId','plan','signupDone']},
  {title:'02 / Your business',fields:['friendlyBusinessName','legalName','contactName','contactEmail','contactPhone','website','services','businessNiche','businessCurrency','businessType','businessIndustry','registrationIdType','taxId','businessNotRegistered','businessRegions','address','city','postalCode','region','country','timezone','platformLanguage','outboundLanguage','representativeFirstName','representativeLastName','representativeEmail','representativeJobPosition','representativePhone']},
  {title:'03 / Branding',fields:['primaryColor1','primaryColor2','primaryColor3','secondaryColor1','secondaryColor2','secondaryColor3']},
  {title:'04 / Domain and email',fields:['domain','domainProvider','businessEmailProvider','emailSetupPreference','preferredAccessMethod','accessNotes']},
  {title:'05 / Phone & calendar',fields:['phonePreference','preferredAreaCodes','forwardCallsTo','calendarAppointmentOwner','appointmentDuration','bookingBuffer','bookingNotice','availabilityDays','availabilityHours']},
  {title:'06 / Contacts & follow-up',fields:['contactsPreference','contactListNotes','contactImportPermission','followupPlaybookPreference','followupGoal','followupFrequency','followupStyle']},
  {title:'07 / AI receptionist',fields:['aiReceptionistPreference','aiDiscussServices','aiCallerQuestions','aiBookingRules','aiPreferredLanguage','aiToneOfVoice','aiHumanHandoff','aiAdditionalInstructions']},
  {title:'08 / Review & acknowledgment',fields:['requestedFeatures','reviewAccuracy','reviewAuthority','reviewUsage','signature']},
];
/** @type {Record<string,string>} */
const labels = {
  alreadyHaveAccount:'Existing CQL account',signupId:'Subscription option',signupDone:'Account signup confirmed',
  legalName:'Legal business name',contactName:'Contact name',contactEmail:'Business email',contactPhone:'Business phone',
  services:'Services / offer',taxId:'Business registration number',registrationIdType:'Business registration ID type',
  businessRegions:'Regions of operation',region:'State / province / region',postalCode:'Postal / ZIP code',
  calendarAppointmentOwner:'Calendar owner',bookingBuffer:'Buffer between appointments',bookingNotice:'Minimum booking notice',
  contactImportPermission:'Permission to import and contact confirmed',aiDiscussServices:'Services to discuss',
  aiCallerQuestions:'Questions to ask callers',aiHumanHandoff:'When to hand off to a person',
  reviewAccuracy:'Details accurate and setup authorized',reviewAuthority:'Authority to share information confirmed',
  reviewUsage:'Additional charges and separate quote requirements acknowledged',signature:'Acknowledged by',
  requestedFeatures:'Extra feature requests',fees:'Service rates',signupOption:'Subscription option',
  acknowledgedAt:'Acknowledged at',pricingTier:'Pricing tier',primaryColor1:'Primary color 1',primaryColor2:'Primary color 2',primaryColor3:'Primary color 3',
  secondaryColor1:'Secondary color 1',secondaryColor2:'Secondary color 2',secondaryColor3:'Secondary color 3',
};
const excluded = /password|secret|token|cardnumber|cvv/i;
const internal = new Set(['flowVersion','businessProfileVersion','completedSteps']);
/** @param {string} key */
export const briefLabel = (key) => labels[key] || key.replace(/[_-]/g,' ').replace(/([a-z\d])([A-Z])/g,'$1 $2').replace(/\b(ai|sms|sop|id|rgb|dns)\b/gi,s=>s.toUpperCase()).replace(/^./,s=>s.toUpperCase());

// Flatten every retained value into readable rows, including nested pricing snapshots.
/** @param {RecordData} data @param {string} [prefix] @returns {[string,string][]} */
export function briefRows(data, prefix='') {
  return Object.entries(data).flatMap(([key,value]) => {
    if(excluded.test(key) || internal.has(key)) return [];
    const label = prefix ? `${prefix} / ${briefLabel(key)}` : briefLabel(key);
    if(value && typeof value==='object' && !Array.isArray(value)) return briefRows(value,label);
    if(Array.isArray(value) && value.some(item=>item && typeof item==='object')) return value.flatMap((item,index)=>item && typeof item==='object' ? briefRows(item,`${label} ${index+1}`) : [[`${label} ${index+1}`,String(item)]]);
    return [[label,typeof value==='boolean' ? (value?'Yes':'No') : Array.isArray(value) ? value.join(', ')||'None selected' : value===0 ? '0' : String(value??'').trim()||'Not provided']];
  });
}
