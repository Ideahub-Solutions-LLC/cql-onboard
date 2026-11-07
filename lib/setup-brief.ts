import {jsPDF} from 'jspdf';
import {briefSections,briefLabel,briefRows} from './setup-summary.mjs';
export {briefRows} from './setup-summary.mjs';

type RecordData = Record<string, unknown>;
export type SetupBrief = {
  applicationId: string;
  status: string;
  answers: RecordData;
  files?: RecordData[];
  checklist?: RecordData;
  pricing?: RecordData;
  brandName?: string;
  submittedAt?: string;
  generatedAt?: Date;
};
export function createSetupBrief(brief: SetupBrief, logo?: Uint8Array) {
  const doc = new jsPDF({unit:'mm',format:'a4',compress:true});
  const brand = brief.brandName || 'Core Quantum Leads';
  const generated = brief.generatedAt || new Date();
  const date = generated.toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'});
  const navy = '#142B49', blue = '#1677D2', muted = '#62738A';
  const logoProperties = logo ? doc.getImageProperties(logo) : null;
  let y=0;
  let sectionTitle='Setup overview';
  // Native PDF text remains searchable. Browser-rendered fallback preserves names
  // and answers outside the standard PDF font's character set without external fonts.
  const normalize = (value:string)=>value.replace(/[\u2010-\u2015]/g,'-').replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/\u2026/g,'...').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'');
  const unicode = (value:string)=>/[^\x20-\x7E\xA0-\xFF\n\r\t]/.test(value);
  const canvasFor = (size:number,bold:boolean)=>{
    const canvas=document.createElement('canvas');
    const context=canvas.getContext('2d');
    if(!context) throw new Error('Your browser could not create the PDF. Please try again.');
    context.font=`${bold?'600':'400'} ${size*3}px Arial, sans-serif`;
    return {canvas,context};
  };
  function lines(value:string,width:number,size:number,bold=false):string[]{
    value=normalize(value);
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);
    if(!unicode(value)) return doc.splitTextToSize(value,width);
    const {context}=canvasFor(size,bold);
    const result:string[]=[];
    for(const paragraph of value.split(/\r?\n/)) {
      let line='';
      for(const char of Array.from(paragraph)) {
        if(line && context.measureText(line+char).width>width*72/25.4*3){result.push(line);line='';}
        line+=char;
      }
      result.push(line);
    }
    return result;
  }
  function text(value:string,x:number,top:number,size=10,color=navy,bold=false){
    value=normalize(value);
    doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(color);
    if(!unicode(value)){doc.text(value,x,top);return;}
    const {canvas,context}=canvasFor(size,bold);
    const font=context.font;
    canvas.width=Math.ceil(context.measureText(value).width)+6;canvas.height=Math.ceil(size*4.5);
    context.font=font;context.fillStyle=color;context.textBaseline='alphabetic';
    context.fillText(value,0,size*3.3);
    doc.addImage(canvas.toDataURL('image/png'),'PNG',x,top-size*3.3/3*25.4/72,canvas.width/3*25.4/72,canvas.height/3*25.4/72);
  }
  function page(first=false,continuation=true){
    if(!first) doc.addPage();
    const headerHeight=logoProperties?(first?68:32):(first?46:25);
    doc.setFillColor(navy);doc.rect(0,0,210,headerHeight,'F');
    if(logo && logoProperties){
      const width=first?70:44;
      const height=width*logoProperties.height/logoProperties.width;
      doc.addImage(logo,'PNG',(210-width)/2,0,width,height,'cql-logo');
    }else text(brand,18,first?16:15,11,'#FFFFFF',true);
    if(first){
      const titleY=logoProperties?51:29;
      const title='CLIENT SETUP BRIEF';
      const subtitle='Your onboarding details & implementation reference';
      doc.setFont('helvetica','bold');doc.setFontSize(20);
      const titleX=logoProperties?(210-doc.getTextWidth(title))/2:18;
      text(title,titleX,titleY,20,'#FFFFFF',true);
      doc.setFont('helvetica','normal');doc.setFontSize(9);
      const subtitleX=logoProperties?(210-doc.getTextWidth(subtitle))/2:18;
      text(subtitle,subtitleX,titleY+9,9,'#C5DAF1');
    }
    y=headerHeight+10;
    if(!first && continuation){text(`${sectionTitle} / continued`,18,y,10,blue,true);y+=10;}
  }
  function heading(title:string){
    sectionTitle=title;
    if(y>214) page(false,false);
    y+=6;doc.setFillColor('#EAF2FB');doc.roundedRect(18,y-6,174,12,2,2,'F');text(title,22,y+2,12,navy,true);y+=14;
  }
  function row(label:string,value:string){
    const labelLines=lines(label,52,8.5,true), valueLines=lines(value,112,10);
    const count=Math.max(labelLines.length,valueLines.length);
    // Break at line boundaries, including unusually long notes and unbroken URLs.
    if(y+Math.min(count,8)*5>274) page();
    for(let i=0;i<count;i++){
      if(y>274) page();
      if(labelLines[i]) text(labelLines[i],18,y,8.5,muted,true);
      if(valueLines[i]) text(valueLines[i],78,y,10);
      y+=5;
    }
    y+=3;doc.setDrawColor('#E6ECF2');doc.line(18,y-2,192,y-2);y+=2;
  }
  doc.setProperties({title:`Setup brief - ${brief.answers.legalName||'Client'}`,author:brand,subject:'Client onboarding and setup reference'});
  page(true);
  row('Prepared for',String(brief.answers.legalName||brief.answers.friendlyBusinessName||'Client'));
  row('Application reference',brief.applicationId);
  row('Status',briefLabel(brief.status));
  row('Generated',date);
  if(brief.submittedAt) row('Submitted',new Date(brief.submittedAt).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short'}));
  const used = new Set<string>();
  for(const section of briefSections){
    heading(section.title);
    const values:RecordData={};
    for(const key of section.fields){used.add(key);values[key]=brief.answers[key];}
    briefRows(values).forEach(([label,value])=>row(label,value));
  }
  const extra=briefRows(Object.fromEntries(Object.entries(brief.answers).filter(([key])=>!used.has(key))));
  if(extra.length){heading('Additional saved setup details');extra.forEach(([label,value])=>row(label,value));}
  heading('Uploaded documents');
  if(!brief.files?.length) row('Documents','No documents uploaded.');
  for(const file of brief.files||[]){
    // Include the document inventory, never signed URLs or storage credentials.
    const values=Object.fromEntries(['name','category','size','type','mime_type','created_at','id'].filter(key=>file[key]!==undefined).map(key=>[key,file[key]]));
    briefRows(values).forEach(([label,value])=>row(label,value));
  }
  heading('Launch checklist');
  const tasks=briefRows(brief.checklist||{});
  if(!tasks.length) row('Checklist','No launch tasks recorded yet.');
  tasks.forEach(([label,value])=>row(label,value));
  heading('Subscription & pricing reference');
  row('Pricing basis',brief.pricing?.acknowledgedAt?'Saved pricing at submission':'Current reference rates; confirm with your setup team');
  const {fees,...pricingDetails}=brief.pricing||{};
  briefRows(pricingDetails).forEach(([label,value])=>row(label,value));
  if(Array.isArray(fees)) for(const fee of fees){
    if(!fee || typeof fee!=='object') continue;
    const {name,...details}=fee as RecordData;
    row(String(name||'Service rate'),briefRows(details).map(([label,value])=>`${label}: ${value}`).join('\n'));
  }
  heading('Handling & next steps');
  row('Private information','For the client and authorized setup team. Account passwords are stored separately and excluded from this document.');
  row('Before activation','The setup team confirms missing items, pricing, account access, and launch timing. Submission does not activate billing, submit an A2P registration, or switch on automations.');
  const total=doc.getNumberOfPages();
  for(let i=1;i<=total;i++){
    doc.setPage(i);doc.setDrawColor('#D8E3EE');doc.line(18,283,192,283);
    text('PRIVATE / CLIENT & AUTHORIZED SETUP TEAM',18,289,7,muted);
    text(`${i} / ${total}`,177,289,8,muted);
  }
  return doc;
}

export async function downloadSetupBrief(brief: SetupBrief){
  const name=String(brief.answers.legalName||'draft').replace(/[^a-z0-9]/gi,'-').replace(/-+/g,'-').slice(0,100)||'client';
  const response=await fetch('/cql-logo.png');
  if(!response.ok) throw new Error('The PDF logo could not be loaded. Please try downloading again.');
  const logo=new Uint8Array(await response.arrayBuffer());
  createSetupBrief(brief,logo).save(`cql-setup-${name}.pdf`);
}
