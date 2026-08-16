'use client'
import { useState } from 'react'

export function CampaignForm(){
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('')
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setMessage('Saving…');const form=new FormData(e.currentTarget);const payload=Object.fromEntries(form.entries()) as Record<string,string>;if(payload.scheduledAt){const scheduled=new Date(payload.scheduledAt);if(Number.isNaN(scheduled.getTime())){setMessage('Choose a valid schedule time.');setBusy(false);return}payload.scheduledAt=scheduled.toISOString()}try{const res=await fetch('/api/campaigns',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const data=await res.json();if(!res.ok)throw new Error(data.error||'Could not save campaign');setMessage('Campaign saved.');e.currentTarget.reset();setTimeout(()=>location.reload(),500)}catch(err){setMessage(err instanceof Error?err.message:'Could not save campaign')}finally{setBusy(false)}}
  return <form onSubmit={submit} className="form-grid">
    <div className="field"><label>Campaign name</label><input name="name" defaultValue="Greetings From Christmas 2026" required/></div>
    <div className="field"><label>Subject</label><input name="subject" placeholder="A little Christmas, just for you" required/></div>
    <div className="field wide"><label>Preview text</label><input name="previewText" placeholder="Past clients get first access to our 2026 collection."/></div>
    <div className="field wide"><label>Email body HTML</label><textarea name="bodyHtml" defaultValue={'<p style="margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#332f2a;">Christmas is coming a little early this year.</p><p style="margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:26px;color:#332f2a;">Before we share our holiday collection publicly, we wanted to give you the first look.</p>'} required/></div>
    <div className="field wide"><label>Plain text fallback</label><textarea name="bodyText" defaultValue={'Christmas is coming a little early this year.\n\nBefore we share our holiday collection publicly, we wanted to give you the first look.'} required/></div>
    <div className="field"><label>CTA label</label><input name="ctaLabel" defaultValue="Explore Christmas"/></div>
    <div className="field"><label>CTA URL</label><input name="ctaUrl" type="url" placeholder="https://holiday.eccreativestudios.com"/></div>
    <div className="field wide"><label>Schedule send (optional, your local time)</label><input name="scheduledAt" type="datetime-local"/><small>Leave blank to send immediately after the test and final SEND confirmation.</small></div>
    <div className="wide toolbar"><button disabled={busy}>{busy?'Saving…':'Save campaign'}</button>{message&&<span>{message}</span>}</div>
  </form>
}
