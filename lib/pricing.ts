import type {Fee} from './catalog';
export const pricingTiers=['Startup','Business','Scale'] as const;
export const pricingSections=['Messaging','Phone & calls','Email','AI & automation','Setup & subscriptions','Other'] as const;
export type PricingTier=typeof pricingTiers[number];
const row=(name:string,description:string,unit:string,section:string,billing:string,values:string[],note='',group='Usage'):Fee=>({name,description,unit,section,billing,group,rate:'',rates:{Startup:values[0]||'',Business:values[1]||'',Scale:values[2]||''},note});
// Customer-facing rates only. Internal supplier costs and margin data are intentionally absent.
export const customerRates:Fee[]=[
 row('SMS — outbound','Send follow-ups, reminders, and replies.','per segment','Messaging','usage',['0.014940','0.011205','0.008964'],'US/Canada reference. Carrier fees are additional. Long messages may use more than one segment.'),
 row('SMS — inbound','Receive incoming text messages.','per segment','Messaging','usage',['0.014940','0.011205','0.008964'],'US/Canada reference. Carrier fees are additional.'),
 row('MMS — outbound','Send picture and media messages.','per segment','Messaging','usage',['0.044000','0.033000','0.026400'],'US/Canada reference; carrier fees are additional.'),
 row('MMS — inbound local','Receive media messages on a local number.','per segment','Messaging','usage',['0.033000','0.024750','0.019800'],'US/Canada reference; carrier fees are additional.'),
 row('MMS — inbound toll-free','Receive media messages on a toll-free number.','per segment','Messaging','usage',['0.040000','0.030000','0.024000'],'US/Canada reference; carrier fees are additional.'),
 row('WhatsApp activation','Enable a WhatsApp channel for your business.','per enabled location / month','Messaging','monthly',['20.000000','15.000000','12.000000'],'Message charges are separate from this recurring subscription.','Setup'),
 row('WhatsApp — marketing','Send delivered marketing templates.','per delivered template','Messaging','usage',['0.052600','0.039450','0.031560'],'US/Canada reference. The listed rate excludes a 5% payment fee; confirm the final charge before activation.'),
 row('WhatsApp — utility','Send delivered transactional templates.','per delivered template','Messaging','usage',['0.007200','0.005400','0.004320'],'US/Canada reference. Rates depend on destination and message category.'),
 row('WhatsApp — service','Handle service conversations.','per billable delivered message','Messaging','quote',[],'Your team confirms the applicable allowance, destination rate, and any additional fees.'),
 row('WhatsApp — authentication','Send authentication templates.','per delivered template','Messaging','quote',[],'Destination-specific rate requires confirmation.'),
 row('Phone — outbound calls','Make outbound calls to leads and customers.','per minute','Phone & calls','usage',['0.041500','0.033200','0.024900'],'US reference. Destination, forwarding, and transfer legs may add charges.'),
 row('Phone — inbound calls','Answer calls in the web, mobile, or desk app.','per minute','Phone & calls','usage',['0.029125','0.023300','0.017475'],'US answered-app reference. Call forwarding routes can have different charges.'),
 row('Phone number — local','Keep a local business number.','per number / month','Phone & calls','monthly',['2.300000','1.725000','1.380000'],'Number availability is confirmed during setup.','Setup'),
 row('Phone number — toll-free','Keep a toll-free business number.','per number / month','Phone & calls','monthly',['4.300000','3.225000','2.580000'],'Number availability is confirmed during setup.','Setup'),
 row('Call recording','Record calls for your business process.','per minute','Phone & calls','usage',['0.005000','0.003750','0.003000'],'Recording storage is billed separately. Your team confirms recording notices and consent settings.'),
 row('Call recording storage','Retain recorded calls.','per recorded minute / month','Phone & calls','monthly',['0.001000','0.000750','0.000600'],'Recurring storage charge is separate from recording and call minutes.'),
 row('Call transcription','Turn recorded conversations into text.','per minute','Phone & calls','usage',['0.048000','0.036000','0.028800'],'Additional to the underlying phone call and other selected services.'),
 row('Answering machine detection','Detect voicemail on outbound calls.','per call','Phone & calls','usage',['0.015000','0.011250','0.009000'],'Additional to the phone call.'),
 row('Voicemail drop','Deliver a prerecorded voicemail.','per minute','Phone & calls','usage',['0.036000','0.027000','0.021600'],'Additional phone-system charges may apply.'),
 row('Email','Send business follow-ups and reminders.','per email','Email','usage',['0.001688','0.001350','0.001013']),
 row('Email verification','Check contact email addresses before sending.','per verification','Email','usage',['0.006250','0.005000','0.003750']),
 row('Workflow — premium features','Run advanced automation actions.','per execution','AI & automation','usage',['0.020000','0.015000','0.015000'],'This is the standard execution rate. Applicable allowances and separate workflow plans can change the charge.'),
 row('Content AI — text','Generate written content.','per confirmed usage unit','AI & automation','quote',[],'Rate and included usage depend on the enabled feature and AI plan.','AI'),
 row('Content AI — image','Generate images for your content.','per image','AI & automation','usage',['0.157500','0.126000','0.094500'],'Pay-per-use reference. Included usage may differ with an AI subscription.','AI'),
 row('Workflow AI — external models','Use AI model actions in your workflows.','per selected model / usage','AI & automation','quote',[],'The workflow AI builder has no platform charge in this schedule. External model usage is additional and must be confirmed.','AI'),
 row('Conversation AI','Handle chat conversations and responses.','per selected model / usage','AI & automation','quote',[],'Model usage and subscription allowances determine the charge.','AI'),
 row('Voice AI engine','Power the AI voice receptionist.','per engine minute','AI & automation','usage',['0.112500','0.090000','0.067500'],'ENGINE ONLY — voice generation, model usage, and phone charges are additional. This is not the total receptionist cost.','AI'),
 row('Reviews AI','Assist with review responses.','per review','AI & automation','usage',['0.025000','0.020000','0.015000'],'Pay-per-use reference. Included usage may differ with an AI subscription.','AI'),
 row('Funnel & website AI','Assist with building funnels and pages.','subject to fair use','AI & automation','included',['0.000000','0.000000','0.000000'],'No metered AI charge in this schedule. Hosting, domains, and other services are separate.','AI'),
 row('Ask AI','Get help from the AI assistant.','per confirmed usage unit','AI & automation','quote',[],'Your team confirms included usage or a pay-per-use rate.','AI'),
 row('AI Studio','Use AI generation tools.','per selected model / usage','AI & automation','quote',[],'Your team confirms the model and applicable usage rate.','AI'),
 row('AI Employee Growth','Choose a monthly AI package.','per enabled location / month','Setup & subscriptions','quote',[],'CQL subscription price and included usage require a quote. This is separate from your CQL pricing tier.','AI'),
 row('AI Employee Unlimited','Choose a monthly AI package for frequent use.','per enabled location / month','Setup & subscriptions','quote',[],'CQL subscription price and included usage require a quote. Separate usage charges may still apply.','AI'),
 row('Domain registration & renewal','Register or renew your business domain.','per domain / renewal term','Setup & subscriptions','quote',[],'Your team confirms the domain, renewal term, and final price before purchase.','Setup'),
 row('A2P registration','Prepare your business for application-to-person messaging.','registration / recurring fees as quoted','Setup & subscriptions','quote',[],'Your team confirms registration and recurring campaign fees before submission.','Setup')
];
export function displayRate(fee:Fee,tier:string){const value=fee.rates?fee.rates[tier as PricingTier]:fee.rate;return value&&/^\d+(\.\d+)?$/.test(value)?'$'+Number(value).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:6}):value||'Confirm with CQL';}
export function applicationTasks(data:any){return (data?.requestedFeatures||[]).filter((x:any)=>typeof x==='string').map((x:string)=>'Activate · '+x);}
