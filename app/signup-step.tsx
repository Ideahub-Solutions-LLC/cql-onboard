'use client';
import {useContext,useRef,useState} from 'react';
import {ArrowRight,ArrowUpRight,Blocks,Building2,Check,CheckCircle2,Feather,UserRound} from 'lucide-react';
import {FormContext,Note} from './form-parts';
import type {SignupOption} from '../lib/catalog';
import SignupModal from './signup-modal';

export default function SignupStep({config}:{config:{signupOptions:SignupOption[];priceList?:{id:string;name:string}|null}}){
 const {data,set}=useContext(FormContext);
 const [signup,setSignup]=useState<SignupOption|null>(null);
 const signupTrigger=useRef<HTMLButtonElement|null>(null);
 const openSignup=(option:SignupOption,trigger:HTMLButtonElement)=>{signupTrigger.current=trigger;setSignup(option);set('signupOpened',true);};
 const available=config.signupOptions.filter(o=>o.enabled&&o.url);
 const selected=available.find(o=>o.id===data.signupId);
 const choose=(o:SignupOption)=>{set('signupId',o.id);set('plan',o.name);set('alreadyHaveAccount',false);set('signupDone',false);};
 const chooseExisting=()=>{set('alreadyHaveAccount',true);set('signupId','');set('plan','I already have an account');set('signupDone',true);};
 return <div className="signup-step">
  {config.priceList&&<a className="price-list-download" href={'/api/price-lists/'+config.priceList.id}><span><strong>View the current price list</strong><small>{config.priceList.name}</small></span><ArrowUpRight size={17}/></a>}
  <fieldset className="account-choice-group">
   <legend className="account-choice-legend">Choose your account option <span className="required">*</span></legend>
   <div className={'existing-account-panel '+(data.alreadyHaveAccount?'selected':'')}>
    <label className="existing-account-choice">
     <input type="radio" name="cql-account-option" value="existing" checked={!!data.alreadyHaveAccount} onChange={chooseExisting} aria-label="I already have a CQL account" aria-describedby="existing-account-description"/>
     <span className="existing-account-icon"><UserRound size={24} aria-hidden="true"/></span>
     <span className="existing-account-copy"><span className="account-path-label">ALREADY WITH CQL?</span><strong>I already have a CQL account</strong><span id="existing-account-description">Use your existing account and continue with your business details.</span></span>
     <span className="existing-account-action">{data.alreadyHaveAccount?'Selected':'Use my account'}{data.alreadyHaveAccount?<CheckCircle2 size={19}/>:<ArrowRight size={19}/>}</span>
    </label>
    {data.alreadyHaveAccount&&<div className="existing-account-confirm" aria-live="polite"><strong className="existing-account-ready"><CheckCircle2 size={18}/> You’re ready to continue</strong><p>Choose Continue with my account below to add your business details. Your team will verify your existing account during setup.</p><button type="button" className="text-link" onClick={()=>{set('alreadyHaveAccount',false);set('signupDone',false);set('plan','');}}>Compare subscriptions instead <ArrowRight size={15}/></button></div>}
   </div>
   {!!available.length&&!data.alreadyHaveAccount&&<>
    <div className="account-choice-divider"><span>New to CQL? Choose a subscription</span></div>
    <div className="signup-options">{available.map(o=>{
     const active=!data.alreadyHaveAccount&&selected?.id===o.id;
     const Icon=o.id==='cql-startup'?Feather:o.id==='cql-business'?Building2:Blocks;
     return <article key={o.id} className={'signup-option subscription-card '+(active?'selected':'')}>
      <div className="subscription-card-choice">
       <span className="signup-option-top"><span className="subscription-icon"><Icon size={23} aria-hidden="true"/></span>{o.badge&&<em>{o.badge}</em>}</span>
       <label className="subscription-title"><input type="radio" name="cql-account-option" value={o.id} checked={active} onChange={()=>choose(o)}/><span>{o.name}</span></label>
       <span className="subscription-description">{o.description||'Create your CQL account to get started.'}</span>
       {!!o.features?.length&&<ul className="account-features">{o.features.map((feature,i)=><li key={i}><Check size={15} aria-hidden="true"/><span>{feature}</span></li>)}</ul>}
      </div>
      <div className="subscription-card-footer"><p>Subscription and final inclusions are shown on the signup page. Usage and optional services may be additional.</p><button type="button" className="subscription-signup-link" aria-haspopup="dialog" onClick={event=>{if(!active)choose(o);openSignup(o,event.currentTarget);}}>{o.buttonLabel||'Start signup'} <ArrowRight size={15} aria-hidden="true"/></button></div>
     </article>;
    })}</div>
   </>}
  </fieldset>
  {!available.length&&!data.alreadyHaveAccount&&<Note>Contact your team for a signup link, or choose the existing-account option above.</Note>}
  {!data.alreadyHaveAccount&&selected&&<div className={'signup-confirm new-account-confirm '+(data.signupDone?'signup-complete':'')} aria-live="polite"><h3>{data.signupDone?<><CheckCircle2 size={21}/> Signup confirmed</>:'Your next step: create your account'}</h3><p>{data.signupDone?'Choose Save & continue below to add your business details. Your team will verify your account during setup.':'Start signup for '+selected.name+' above. The form opens in a popup, so your onboarding stays right here.'}</p><small>Account confirmation does not verify payment or activate a subscription.</small></div>}
  <SignupModal option={signup} onClose={()=>setSignup(null)} onComplete={()=>{set('signupDone',true);setSignup(null);}} returnFocusRef={signupTrigger}/>
 </div>;
}
