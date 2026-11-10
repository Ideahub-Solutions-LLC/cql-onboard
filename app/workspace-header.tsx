'use client';
import {useEffect,useRef,useState} from 'react';
import {LockKeyhole,Mail,LogOut} from 'lucide-react';

const zones={PST:'Etc/GMT+8',PDT:'Etc/GMT+7',PHT:'Asia/Manila'};
export function WorkspaceClock(){
 const [zone,setZone]=useState<keyof typeof zones>('PST');
 const [now,setNow]=useState<Date|null>(null);
 useEffect(()=>{const frame=requestAnimationFrame(()=>{try{const saved=localStorage.getItem('cql-time-zone');if(saved&&saved in zones)setZone(saved as keyof typeof zones);}catch{}setNow(new Date());});const timer=setInterval(()=>setNow(new Date()),1000);return()=>{cancelAnimationFrame(frame);clearInterval(timer);};},[]);
 return <div className="workspace-clock"><time dateTime={now?.toISOString()}>{now?<><span>{new Intl.DateTimeFormat('en-US',{timeZone:zones[zone],month:'short',day:'numeric',year:'numeric'}).format(now)}</span><span>{new Intl.DateTimeFormat('en-US',{timeZone:zones[zone],hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now)}</span></>:'Loading time…'}</time><select aria-label="Display time zone" value={zone} onChange={event=>{const value=event.target.value as keyof typeof zones;setZone(value);try{localStorage.setItem('cql-time-zone',value);}catch{}}}>{Object.keys(zones).map(value=><option key={value}>{value}</option>)}</select></div>;
}
export function ProfileMenu({user,supportEmail,onPassword,onSignOut}:{user:{name?:string;email?:string;username?:string;imageUrl?:string;picture?:string};supportEmail:string;onPassword:()=>void;onSignOut:()=>void}){
 const menu=useRef<HTMLDetailsElement>(null);const [failedSource,setFailedSource]=useState<string>();
 const image=user.imageUrl||user.picture;
 useEffect(()=>{const close=(event:PointerEvent)=>{if(!menu.current?.contains(event.target as Node))menu.current?.removeAttribute('open');};document.addEventListener('pointerdown',close);return()=>document.removeEventListener('pointerdown',close);},[]);
 return <details ref={menu} className="profile-menu" onKeyDown={event=>{if(event.key==='Escape'){menu.current?.removeAttribute('open');menu.current?.querySelector('summary')?.focus();}}}><summary className="avatar" aria-label="Open account navigation" title={user.email}>{image&&failedSource!==image?<img src={image} alt="" onError={()=>setFailedSource(image)}/>:((user.username||user.email||user.name||'C').trim().charAt(0).toUpperCase())}</summary><nav aria-label="Account navigation" onClick={()=>menu.current?.removeAttribute('open')}><button onClick={onPassword}><LockKeyhole size={16}/>My Password</button><a href={'mailto:'+supportEmail}><Mail size={16}/>Contact Team</a><button onClick={onSignOut}><LogOut size={16}/>Sign out</button></nav></details>;
}
