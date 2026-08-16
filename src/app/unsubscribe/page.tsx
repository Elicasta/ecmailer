'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'

export default function UnsubscribePage(){
  const token=useSearchParams().get('token');const [state,setState]=useState<'idle'|'busy'|'done'|'error'>('idle')
  async function unsubscribe(){if(!token){setState('error');return}setState('busy');const res=await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token})});setState(res.ok?'done':'error')}
  return <section className="panel" style={{maxWidth:620,margin:'60px auto'}}><div className="eyebrow">EC Creative Studios</div><h1>Email preferences</h1>{state==='done'?<p>You’re unsubscribed. We won’t send you future EC Creative Studios marketing campaigns.</p>:<><p>If you no longer want marketing emails from EC Creative Studios, unsubscribe below.</p><button onClick={unsubscribe} disabled={state==='busy'||!token}>{state==='busy'?'Updating…':'Unsubscribe'}</button>{state==='error'&&<div className="notice">That unsubscribe link could not be verified.</div>}</>}</section>
}
