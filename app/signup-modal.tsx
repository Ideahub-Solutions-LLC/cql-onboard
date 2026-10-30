'use client';

import {useState, type RefObject} from 'react';
import {Dialog} from 'radix-ui';
import {ArrowRight,ExternalLink,LoaderCircle,X} from 'lucide-react';
import type {SignupOption} from '../lib/catalog';

type Props={
 option:SignupOption|null;
 onClose:()=>void;
 onComplete:()=>void;
 returnFocusRef:RefObject<HTMLButtonElement|null>;
};

export default function SignupModal({option,onClose,onComplete,returnFocusRef}:Props){
 const [loading,setLoading]=useState(true);
 return <Dialog.Root open={!!option} onOpenChange={open=>{if(!open)onClose();}}>
  <Dialog.Portal>
   <Dialog.Overlay className="signup-modal-overlay"/>
   <Dialog.Content className="signup-modal" onOpenAutoFocus={()=>setLoading(true)} onCloseAutoFocus={event=>{event.preventDefault();returnFocusRef.current?.focus();}} onInteractOutside={event=>event.preventDefault()}>
    <div className="signup-modal-header">
     <div><span className="account-path-label">CREATE YOUR CQL ACCOUNT</span><Dialog.Title>{option?.name} signup</Dialog.Title><Dialog.Description>Complete the signup form here, then confirm below to return to onboarding.</Dialog.Description></div>
     <Dialog.Close className="signup-modal-close" aria-label="Close signup and return to onboarding"><X size={21}/></Dialog.Close>
    </div>
    <div className="signup-modal-frame">
     {loading&&<div className="signup-modal-loading" role="status"><LoaderCircle size={21} aria-hidden="true"/> Loading your signup form…</div>}
     {option&&<iframe key={option.id} src={option.url} title={option.name+' secure signup form'} onLoad={()=>setLoading(false)} onError={()=>setLoading(false)} referrerPolicy="strict-origin-when-cross-origin"/>}
    </div>
    <div className="signup-modal-help"><span>Form not displaying?</span><button type="button" onClick={()=>{if(option)window.open(option.url,'_blank','popup,width=980,height=820,noopener,noreferrer');}}>Open secure signup window <ExternalLink size={14}/></button></div>
    <div className="signup-modal-footer"><div><strong>Finished creating your account?</strong><p>Confirm only after signup is complete. Your CQL team will verify your account.</p></div><div className="signup-modal-actions"><Dialog.Close className="btn secondary">Return without confirming</Dialog.Close><button type="button" className="btn primary" onClick={onComplete}>I’ve completed signup <ArrowRight size={17}/></button></div></div>
   </Dialog.Content>
  </Dialog.Portal>
 </Dialog.Root>;
}
