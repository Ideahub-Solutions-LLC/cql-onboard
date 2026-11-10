'use client';

import { useContext } from 'react';
import { Field as BaseField, Choices, CheckField, FormContext, Section, Note, Upload } from './form-parts';
import { phoneOptions, contactOptions, playbookOptions, aiOptions, durationOptions, bufferOptions, noticeOptions, voiceOptions } from '../lib/setup-preferences.mjs';

const Field = (props: Parameters<typeof BaseField>[0]) => <BaseField {...props} requiredLabel="* Required"/>;
function ChoiceLabel({ children }: { children: React.ReactNode }) { return <div className="field-label">{children} <b className="required">* Required</b></div>; }

export function PhoneCalendarStep() {
  return <div className="preference-card">
    <Section title="Phone preferences" description="Saving a preference does not purchase or port a number.">
      <ChoiceLabel>Choose one option</ChoiceLabel>
      <Choices name="phonePreference" options={phoneOptions.map((value, index) => ({ value, description: ['Get a local number for your business.', 'Use a toll-free number for callers.', 'Discuss porting or call forwarding.'][index] }))}/>
      <div className="form-grid"><Field name="preferredAreaCodes" label="Preferred area code(s) (optional)" placeholder="e.g. 212, 646"/><Field name="forwardCallsTo" label="Forward calls to (optional)" type="tel" placeholder="Mobile or office number"/></div>
    </Section>
    <Section title="Calendar availability" description="Help us configure a booking calendar that works for you.">
      <div className="form-grid">
        <Field name="calendarAppointmentOwner" label="Calendar owner" required placeholder="Who will receive appointments?"/>
        <Field name="appointmentDuration" label="Appointment duration (optional)" options={durationOptions}/>
        <Field name="bookingBuffer" label="Buffer between appointments (optional)" options={bufferOptions}/>
        <Field name="bookingNotice" label="Minimum booking notice (optional)" options={noticeOptions}/>
        <Field name="availabilityDays" label="Business days" required placeholder="e.g. Monday–Friday"/>
        <Field name="availabilityHours" label="Business hours" required placeholder="e.g. 9:00 AM–5:00 PM"/>
      </div>
    </Section>
  </div>;
}

export function ContactsFollowupStep() {
  const { data } = useContext(FormContext);
  return <div className="preference-card">
    <Section title="Contacts and follow-up" description="Your setup team will review contact files before importing anything.">
      <ChoiceLabel>Choose one option</ChoiceLabel>
      <Choices name="contactsPreference" options={contactOptions.map((value, index) => ({ value, description: ["I’d like help importing my contacts.", "I’m starting with a new contact list."][index] }))}/>
      {data.contactsPreference === contactOptions[0] && <div className="conditional-preferences">
        <Field name="contactListNotes" label="Anything we should know about your contacts? (optional)" rows={3} placeholder="List source, approximate size, tags, or other context."/>
        <Upload category="Contacts" title="Upload your contact files" description="Select multiple CSV, TSV, or Excel files · Up to 10 MB per file"/>
        <CheckField name="contactImportPermission" required>I confirm I have permission to import these contacts and contact them in accordance with applicable law.</CheckField>
      </div>}
    </Section>
    <Section title="Your follow-up playbook" description="Upload an existing process or tell us how you want leads handled.">
      <ChoiceLabel>Do you have an existing follow-up playbook?</ChoiceLabel>
      <Choices name="followupPlaybookPreference" options={playbookOptions}/>
      {data.followupPlaybookPreference === 'Yes' && <Upload category="Follow-up SOP" title="Upload an existing SOP (optional)" description="PDF, Word, or text · Up to 10 MB per file"/>}
      <div className="form-grid">
        <Field name="followupGoal" label="What should follow-up help you accomplish?" required rows={3} wide placeholder="e.g. Respond quickly, qualify leads, and book a consultation."/>
        <Field name="followupFrequency" label="How often should your team follow up?" required wide placeholder="e.g. Call within 5 minutes, then follow up over 7 days."/>
        <Field name="followupStyle" label="Preferred communication style (optional)" placeholder="e.g. Helpful, personal, and concise"/>
      </div>
    </Section>
  </div>;
}

export function AiReceptionistStep() {
  const { data } = useContext(FormContext);
  return <div className="preference-card"><Section title="AI receptionist preferences" description="This is an optional request. Nothing will be activated until you approve the final setup.">
    <ChoiceLabel>Choose one option</ChoiceLabel>
    <Choices name="aiReceptionistPreference" options={aiOptions.map((value, index) => ({ value, description: ["I’d like an AI receptionist configured.", "I’ll decide later or handle calls myself."][index] }))}/>
    {data.aiReceptionistPreference === aiOptions[0] && <div className="conditional-preferences"><div className="form-grid">
      <Field name="aiDiscussServices" label="Which services should it discuss? (optional)" rows={3} wide placeholder="List services and any important details."/>
      <Field name="aiCallerQuestions" label="What should it ask callers? (optional)" rows={3} wide placeholder="Share the questions that help you qualify a lead."/>
      <Field name="aiBookingRules" label="Booking rules (optional)" rows={3} wide placeholder="Availability, booking limits, or situations to avoid."/>
      <Field name="aiPreferredLanguage" label="Language (optional)" placeholder="e.g. English"/>
      <Field name="aiToneOfVoice" label="Tone of voice (optional)" options={voiceOptions}/>
      <Field name="aiHumanHandoff" label="When should it hand off to a person? (optional)" rows={3} wide placeholder="Urgent situations, complex questions, or specific requests."/>
      <Field name="aiAdditionalInstructions" label="Anything else it should know? (optional)" rows={3} wide placeholder="Additional instructions or special situations."/>
    </div><Note>Your team confirms pricing and tests the AI receptionist with you before activation.</Note></div>}
  </Section></div>;
}
