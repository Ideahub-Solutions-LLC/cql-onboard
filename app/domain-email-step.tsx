'use client';

import { useContext } from 'react';
import { Field, FormContext, Note, Section } from './form-parts';
import { accessMethodOptions, emailSetupOptions } from '../lib/domain-email.mjs';

export default function DomainEmailStep() {
  const { data } = useContext(FormContext);
  return <div className="domain-email-card"><Section title="Domain and email preferences" description="Never put passwords in these answers. Your setup team will provide a secure way to share access if needed.">
    <div className="form-grid">
      <Field name="domain" label="Domain name" required placeholder="yourcompany.com" hint="Enter the domain only, without https:// or a page path."/>
      <Field name="domainProvider" label="Domain provider" required placeholder="e.g. GoDaddy, Cloudflare"/>
      <Field name="businessEmailProvider" label="Business email provider" required placeholder="e.g. Google Workspace, Microsoft 365"/>
      <Field name="emailSetupPreference" label="Email setup preference" required options={emailSetupOptions}/>
      <Field name="preferredAccessMethod" label="Preferred access method" required options={accessMethodOptions}/>
      <Field name="accessNotes" label="Access instructions (optional)" rows={3} wide placeholder="Share any details that will help your setup team. Do not include passwords."/>
    </div>
    {data.preferredAccessMethod === 'Secure password vault' && <Note>Your setup team will arrange secure vault access. Keep passwords out of the access instructions above.</Note>}
  </Section></div>;
}
