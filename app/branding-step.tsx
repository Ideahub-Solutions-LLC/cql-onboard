'use client';

import { useContext, useId, useState } from 'react';
import { UploadCloud, Trash2 } from 'lucide-react';
import { FormContext, Section } from './form-parts';
import { brandColors, colorHex, colorRgb, logoCategories } from '../lib/branding.mjs';

function BrandColor({ name, label, required }: typeof brandColors[number]) {
  const { data, set } = useContext(FormContext);
  const id = useId();
  const value = String(data[name] || '');
  const valid = colorHex(value);
  const [editing, setEditing] = useState<{ kind: string; text: string } | null>(null);
  const invalid = !!value.trim() && !valid;
  const update = (text: string, kind: string) => {
    setEditing({ kind, text });
    set(name, colorHex(text) || text);
  };
  return <div className="brand-color-row">
    <div className="brand-color-label">{label}{required ? <b className="required">*</b> : <small>Optional</small>}</div>
    <label className="brand-color-picker"><span>Color picker</span><input type="color" aria-label={`${label} color picker`} value={valid || '#000000'} onChange={event => { setEditing(null); set(name, event.target.value.toUpperCase()); }}/></label>
    <label className="field"><span>Hex</span><input aria-label={`${label} Hex`} aria-required={required || undefined} aria-invalid={invalid || undefined} aria-describedby={invalid ? id : undefined} placeholder="#1677D2" maxLength={32} value={editing?.kind === 'hex' ? editing.text : valid || (editing?.kind === 'rgb' ? '' : value)} onChange={event => update(event.target.value, 'hex')} onBlur={() => { if (valid) setEditing(null); }}/></label>
    <label className="field"><span>RGB</span><input aria-label={`${label} RGB`} aria-invalid={invalid || undefined} aria-describedby={invalid ? id : undefined} placeholder="22, 119, 210" maxLength={32} value={editing?.kind === 'rgb' ? editing.text : colorRgb(value)} onChange={event => update(event.target.value, 'rgb')} onBlur={() => { if (valid) setEditing(null); }}/></label>
    <button type="button" className="text-link" disabled={!value} aria-label={`Clear ${label}`} onClick={() => { setEditing(null); set(name, ''); }}>Clear</button>
    {invalid && <p className="brand-color-error" id={id} role="alert">Use a Hex color such as #1677D2 or RGB values from 0 to 255.</p>}
  </div>;
}

function LogoUpload({ category, title }: { category: string; title: string }) {
  const { files, upload, remove, uploading } = useContext(FormContext);
  const [error, setError] = useState('');
  const [working, setWorking] = useState(false);
  const [failedPreviews, setFailedPreviews] = useState<string[]>([]);
  const id = useId();
  const logos = files.filter((file: { category: string }) => file.category === category);
  return <section className="brand-logo-card"><h4>{title} <small>Optional</small></h4>
    <p>PNG, JPG, or WebP · Up to 10 MB per file</p>
    <label className="brand-logo-upload" htmlFor={id}><UploadCloud size={20}/><span>{uploading ? 'Uploading…' : 'Upload logo'}</span><input id={id} aria-label={`Upload ${title}`} type="file" accept=".png,.jpg,.jpeg,.webp" disabled={uploading || working} onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = ''; setError('');
      if (!file) return;
      if (!/\.(png|jpe?g|webp)$/i.test(file.name)) { setError('Choose a PNG, JPG, or WebP image.'); return; }
      if (!file.size || file.size > 10 * 1024 * 1024) { setError('Choose an image between 1 byte and 10 MB.'); return; }
      if (!await upload([file], category)) setError('Your logo could not be uploaded. Check the message above and try again.');
    }}/></label>
    {!logos.length && <div className="brand-logo-empty">Your uploaded logo will appear here.</div>}
    {logos.map((file: { id: string; name: string }) => <div className="brand-logo-file" key={file.id}>
      {!failedPreviews.includes(file.id) ? <div className="brand-logo-preview"><img src={`/api/files/${file.id}?preview=1`} alt={`${title}: ${file.name}`} onError={() => setFailedPreviews(current => [...current, file.id])}/></div> : <p>Preview unavailable. You can download the logo below.</p>}
      <div><a href={`/api/files/${file.id}`}>{file.name}</a><button type="button" disabled={uploading || working} aria-label={`Remove ${file.name}`} onClick={async () => { setWorking(true); setError(''); try { if (!await remove(file.id)) setError('Your logo could not be removed. Try again.'); } finally { setWorking(false); } }}><Trash2 size={16}/> Remove</button></div>
    </div>)}
    {error && <p className="signin-error" role="alert">{error}</p>}
  </section>;
}

export default function BrandingStep() {
  return <>
    <Section title="Colors" description="Choose colors using the picker or enter a Hex or RGB value. Primary Color 1 and Secondary Color 1 are required.">
      <div className="brand-color-group"><h4>Primary colors</h4>{brandColors.slice(0, 3).map(color => <BrandColor key={color.name} {...color}/>)}</div>
      <div className="brand-color-group"><h4>Secondary colors</h4>{brandColors.slice(3).map(color => <BrandColor key={color.name} {...color}/>)}</div>
    </Section>
    <Section title="Logos" description="Upload either or both logo formats. You can save and continue without a logo."><div className="brand-logo-grid"><LogoUpload category={logoCategories[0]} title="Logo Square/Portrait Size"/><LogoUpload category={logoCategories[1]} title="Logo Landscape Size"/></div></Section>
  </>;
}
