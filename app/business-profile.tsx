'use client';

import { useContext, useId } from 'react';
import { CheckField, Field as BaseField, FormContext, Section } from './form-parts';

const Field = (props: Parameters<typeof BaseField>[0]) => <BaseField {...props} requiredLabel="* Required"/>;

const labels = ['General Information', 'Business information', 'Business Physical Address', 'Authorized Representative'];
const regions = ['Africa', 'Asia', 'Europe', 'Latin America', 'USA and Canada'];
const languages = ['English (United States)', 'English (United Kingdom)', 'Spanish', 'French', 'German', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic', 'Hindi', 'Other'];
const countries = ['United States', 'Canada', 'United Kingdom', 'Australia', 'New Zealand', 'Philippines', 'Taiwan', 'India', 'Singapore', 'Mexico', 'Other'];

// Suggested values remain editable for businesses outside the common categories.
function SuggestedField({ name, label, options, required = false, disabled = false }: { name: string; label: string; options: string[]; required?: boolean; disabled?: boolean }) {
  const { data, set } = useContext(FormContext);
  const id = useId();
  return <label className="field"><span>{label}{required && <b className="required">* Required</b>}</span><input disabled={disabled} list={id} value={data[name] || ''} aria-required={required || undefined} maxLength={2000} onChange={event => set(name, event.target.value)}/><datalist id={id}>{[...new Set(options)].map(option => <option key={option} value={option}/>)}</datalist></label>;
}

export default function BusinessProfile() {
  const context = useContext(FormContext);
  const name = String(context.data.representative || context.data.contactName || '').trim().split(/\s+/);
  const data = {
    ...context.data,
    representativeFirstName: context.data.representativeFirstName ?? name[0] ?? '',
    representativeLastName: context.data.representativeLastName ?? name.slice(1).join(' '),
  };
  const set = (field: string, value: unknown) => context.setMany({
    businessProfileVersion: 1,
    representativeFirstName: data.representativeFirstName,
    representativeLastName: data.representativeLastName,
    [field]: value,
  });
  const timezones = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : ['America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York', 'Europe/London', 'Asia/Taipei', 'Asia/Manila', 'UTC'];
  const currencies = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('currency') : ['USD', 'CAD', 'GBP', 'AUD', 'EUR', 'PHP', 'TWD'];
  return <FormContext.Provider value={{ ...context, data, set }}><div className="business-profile">
    <div className="business-profile-card"><Section title={labels[0]}>
      <div className="form-grid">
        <Field name="friendlyBusinessName" required label="Friendly Business Name" wide autoComplete="organization"/>
        <Field name="legalName" label="Legal Business Name" hint="Enter the exact legal business name, as registered with your business registration ID." required wide/>
        <Field name="contactEmail" label="Business Email" type="email" required autoComplete="email"/>
        <Field name="contactPhone" label="Business Phone" type="tel" required autoComplete="tel"/>
        <Field name="website" label="Business Website" type="url" placeholder="https://yourbusiness.com" wide autoComplete="url"/>
        <SuggestedField name="businessNiche" required label="Business Niche" options={['Marketing Agency', 'Dental Practice', 'Healthcare', 'Home Services', 'Real Estate', 'Professional Services', 'Retail', 'Other']}/>
        <Field name="businessCurrency" label="Business Currency" options={currencies}/>
      </div>
    </Section></div>
    <div className="business-profile-card"><Section title={labels[1]}>
      <div className="business-profile-stack">
        <SuggestedField name="businessType" required label="Business Type" options={['Limited Liability Company Or Sole-Proprietorship', 'Corporation', 'Partnership', 'Nonprofit', 'Cooperative', 'Other']}/>
        <SuggestedField name="businessIndustry" required={!data.businessNotRegistered} disabled={!!data.businessNotRegistered} label="Business Industry" options={['Technology', 'Healthcare', 'Finance', 'Education', 'Construction', 'Professional Services', 'Retail', 'Other']}/>
        <fieldset className="business-registration">
          <SuggestedField name="registrationIdType" required={!data.businessNotRegistered} disabled={!!data.businessNotRegistered} label="Business Registration ID Type" options={['USA: Employer Identification Number (EIN)', 'Canada: Business Number (BN)', 'UK: Company Registration Number', 'Australia: Australian Business Number (ABN)', 'Not registered', 'Other']}/>
          <Field name="taxId" label="Business Registration Number" disabled={!!data.businessNotRegistered}/>
        </fieldset>
        <CheckField name="businessNotRegistered">My business is Not registered</CheckField>
        <fieldset className="business-regions"><legend>Business Regions of Operations <b className="required">* Required</b></legend>{regions.map(region => <label className="check-field" key={region}><input type="checkbox" checked={(data.businessRegions || []).includes(region)} onChange={event => set('businessRegions', event.target.checked ? [...(data.businessRegions || []), region] : (data.businessRegions || []).filter((item: string) => item !== region))}/><span>{region}</span></label>)}</fieldset>
      </div>
    </Section></div>
    <div className="business-profile-card"><Section title={labels[2]}>
      <div className="form-grid">
        <Field name="address" required label="Street Address" wide autoComplete="street-address"/>
        <Field name="city" required label="City" autoComplete="address-level2"/>
        <Field name="postalCode" required label="Postal/Zip Code" autoComplete="postal-code"/>
        <div className="wide"><SuggestedField name="region" required label="State / Prov / Region" options={['California', 'New York', 'Texas', 'Florida', 'Ontario', 'British Columbia']}/></div>
        <div className="wide"><SuggestedField name="country" required label="Country" options={countries}/></div>
        <div className="wide"><SuggestedField name="timezone" label="Time Zone" options={['UTC', ...timezones]} required/></div>
        <Field name="platformLanguage" label="Platform Language" options={languages} wide/>
        <Field name="outboundLanguage" label="Outbound communication language for custom values" options={languages} wide/>
      </div>
    </Section></div>
    <div className="business-profile-card"><Section title={labels[3]}>
      <div className="form-grid">
        <Field name="representativeFirstName" label="First Name" required autoComplete="given-name"/>
        <Field name="representativeLastName" required label="Last Name" autoComplete="family-name"/>
        <Field name="representativeEmail" required label="Representative Email" type="email" wide/>
        <div className="wide"><SuggestedField name="representativeJobPosition" required label="Job Position" options={['CEO', 'Owner', 'President', 'Director', 'Manager', 'Other']}/></div>
        <Field name="representativePhone" required label="Phone Number (With Country Code)" type="tel" wide/>
      </div>
    </Section></div>

  </div></FormContext.Provider>;
}
