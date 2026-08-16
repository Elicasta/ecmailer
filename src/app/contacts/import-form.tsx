'use client'
import { useState } from 'react'

export function ImportForm({disabled=false}:{disabled?:boolean}){
  const [message,setMessage]=useState('')
  const [busy,setBusy]=useState(false)
  async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;const file=(form.elements.namedItem('file') as HTMLInputElement).files?.[0];if(!file)return;setBusy(true);setMessage('Importing…');try{const fd=new FormData();fd.append('file',file);const res=await fetch('/api/import',{method:'POST',body:fd});const data=await res.json();if(!res.ok)throw new Error(data.error||'Import failed');setMessage(`${data.unique} unique contacts processed. ${data.skipped} skipped.`);form.reset();setTimeout(()=>location.reload(),700)}catch(err){setMessage(err instanceof Error?err.message:'Import failed')}finally{setBusy(false)}}
  return <form onSubmit={submit} className="toolbar"><input name="file" type="file" accept=".csv,text/csv" disabled={disabled||busy} required style={{maxWidth:420}}/><button disabled={disabled||busy}>{busy?'Importing…':'Import Pixieset CSV'}</button>{message&&<span>{message}</span>}</form>
}
