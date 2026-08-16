'use client'
import { useState } from 'react'

type Campaign={id:string;name:string;subject:string;preview_text:string|null;body_html:string;body_text:string;cta_label:string|null;cta_url:string|null;scheduled_at:string|null;status:string}

function localDateTime(value:string|null){if(!value)return'';const d=new Date(value);const offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60_000).toISOString().slice(0,16)}

export function CampaignEditor({campaign}:{campaign:Campaign}){
  const locked=['preparing','scheduled','sending','sent'].includes(campaign.status);const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const formElement=e.currentTarget;setBusy(true);setMessage('Saving…');const form=new FormData(formElement);const payload=Object.fromEntries(form.entries()) as Record<string,string>;if(payload.scheduledAt)payload.scheduledAt=new Date(payload.scheduledAt).toISOString();try{const res=await fetch(`/api/campaigns/${campaign.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not update campaign');setMessage('Saved. A new test is required before sending.');setTimeout(()=>location.reload(),600)}catch(err){setMessage(err instanceof Error?err.message:'Could not update campaign')}finally{setBusy(false)}}
  return <form onSubmit={submit} className="form-grid">
    {locked?<div className="wide notice">This campaign has been submitted to Resend and is locked. Cancel a scheduled Broadcast before editing it.</div>:null}
    <div className="field"><label>Campaign name</label><input name="name" defaultValue={campaign.name} disabled={locked} required/></div>
    <div className="field"><label>Subject</label><input name="subject" defaultValue={campaign.subject} disabled={locked} required/></div>
    <div className="field wide"><label>Preview text</label><input name="previewText" defaultValue={campaign.preview_text??''} disabled={locked}/></div>
    <div className="field wide"><label>Email body HTML</label><textarea name="bodyHtml" defaultValue={campaign.body_html} disabled={locked} required/></div>
    <div className="field wide"><label>Plain text fallback</label><textarea name="bodyText" defaultValue={campaign.body_text} disabled={locked} required/></div>
    <div className="field"><label>CTA label</label><input name="ctaLabel" defaultValue={campaign.cta_label??''} disabled={locked}/></div>
    <div className="field"><label>CTA URL</label><input name="ctaUrl" type="url" defaultValue={campaign.cta_url??''} disabled={locked}/></div>
    <div className="field wide"><label>Schedule send (optional, your local time)</label><input name="scheduledAt" type="datetime-local" defaultValue={localDateTime(campaign.scheduled_at)} disabled={locked}/></div>
    {!locked?<div className="wide toolbar"><button disabled={busy}>{busy?'Saving…':'Save changes'}</button>{message&&<span>{message}</span>}</div>:null}
  </form>
}
