import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { ImportForm } from './import-form'

export const dynamic='force-dynamic'

export default async function ContactsPage(){
  if(!isSupabaseConfigured()) return <section className="panel"><h1>Contacts</h1><div className="notice">Supabase is not configured yet. The app is ready, but the dedicated EC Mailer project must exist before the Pixieset list can be imported.</div><ImportForm disabled /></section>
  const db=getSupabaseAdmin()
  const {data:contacts}=await db.from('ecm_contacts').select('id,email,first_name,last_name,source_type,marketing_status,updated_at').order('updated_at',{ascending:false}).limit(100)
  const {count}=await db.from('ecm_contacts').select('*',{count:'exact',head:true})
  return <>
    <section className="panel"><div className="eyebrow">Audience</div><h1>Contacts</h1><p>{(count??0).toLocaleString()} contacts in the master audience. Pixieset type is retained as metadata, not used to decide whether somebody can receive a campaign.</p><ImportForm /></section>
    <section className="panel"><h2>Recent contacts</h2><div className="table-wrap"><table className="data"><thead><tr><th>Name</th><th>Email</th><th>Pixieset type</th><th>Status</th></tr></thead><tbody>{contacts?.length?contacts.map(c=><tr key={c.id}><td>{[c.first_name,c.last_name].filter(Boolean).join(' ')||'—'}</td><td>{c.email}</td><td><span className="badge">{c.source_type||'unknown'}</span></td><td><span className={`badge ${c.marketing_status==='eligible'?'good':'warn'}`}>{c.marketing_status}</span></td></tr>):<tr><td colSpan={4} className="empty">No contacts imported yet.</td></tr>}</tbody></table></div></section>
  </>
}
