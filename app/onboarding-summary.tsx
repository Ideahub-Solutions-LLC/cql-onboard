'use client';

import {useContext} from 'react';
import {FormContext} from './form-parts';
import {briefSections,briefRows} from '../lib/setup-summary.mjs';
import {aiOptions,contactOptions} from '../lib/setup-preferences.mjs';

export default function OnboardingSummary({config}: {config: {signupOptions: {id:string;name:string}[]}}) {
  const {data,files=[]}=useContext(FormContext);
  return <div className="quick-review-grid">{briefSections.slice(0,-1).map((section,index)=>{
    const values:Record<string,unknown>={};
    for(const field of section.fields) {
      if(index===6 && field!=='aiReceptionistPreference' && data.aiReceptionistPreference!==aiOptions[0]) continue;
      if(index===5 && ['contactListNotes','contactImportPermission'].includes(field) && data.contactsPreference!==contactOptions[0]) continue;
      values[field]=data.businessNotRegistered && ['businessIndustry','registrationIdType','taxId'].includes(field)?'Not applicable (business not registered)':data[field];
    }
    if(index===0) values.signupId=data.alreadyHaveAccount?'Existing CQL account':config.signupOptions.find(option=>option.id===data.signupId)?.name||data.signupId;
    const categories=index===2?['Logo Square/Portrait','Logo Landscape']:index===5?['Contacts','Follow-up SOP']:[];
    const attachments=files.filter((file:{category:string})=>categories.includes(file.category));
    const title=section.title.replace(/^\d+ \/ /,'');
    return <details className="onboarding-summary" key={title}>
      <summary><strong>{title}</strong></summary>
      <div className="onboarding-summary-body"><dl>{briefRows(values).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        {attachments.length>0 && <div className="onboarding-summary-files"><strong>Uploaded documents</strong><ul>{attachments.map((file:{id:string;name:string;category:string})=><li key={file.id}>{file.name} <small>({file.category})</small></li>)}</ul></div>}
      </div>
    </details>;
  })}</div>;
}
