import Link from 'next/link'
import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'

export const dynamic='force-dynamic'

async function getStats(){
  if(!isSupabaseConfigured()) return {total:0,eligible:0,suppressed:0,campaigns:0}
  const db=getSupabaseAdmin()
  const [total,eligible,campaigns]=await Promise.all([
    db.from('ecm_contacts').select('*',{count:'exact',head:true}),
    db.from('ecm_contacts').select('*',{count:'exact',head:true}).eq('marketing_status','eligible'),
    db.from('ecm_campaigns').select('*',{count:'exact',head:true})
  ])
  return {total:total.count??0,eligible:eligible.count??0,suppressed:(total.count??0)-(eligible.count??0),campaigns:campaigns.count??0}
}

export default async function Home(){
  const stats=await getStats()
  const supabaseReady=isSupabaseConfigured()
  const resendReady=Boolean(process.env.RESEND_API_KEY&&process.env.RESEND_FROM&&process.env.RESEND_SEGMENT_ID)
  const addressReady=Boolean(process.env.BUSINESS_POSTAL_ADDRESS)
  const adminReady=Boolean(process.env.ADMIN_USER&&process.env.ADMIN_PASSWORD)
  return <>
    <section className="hero">
      <div className="hero-card"><div className="eyebrow">EC Creative Studios</div><h1>Campaign mail without the bloat.</h1><p>Import the Pixieset list, build a branded email, test it, schedule or send once, and permanently honor every opt-out.</p><div className="toolbar"><Link className="button" href="/campaigns">Build campaign</Link><Link className="button secondary" href="/contacts">Manage contacts</Link></div></div>
      <aside className="setup"><div className="eyebrow" style={{color:'#dce8df'}}>System status</div><h2>{supabaseReady&&resendReady&&addressReady&&adminReady?'Ready to send':'Setup still required'}</h2><p>Supabase: <strong>{supabaseReady?'configured':'blocked'}</strong></p><p>Resend domain + segment: <strong>{resendReady?'configured':'blocked'}</strong></p><p>Postal address: <strong>{addressReady?'configured':'required'}</strong></p><p>Admin lock: <strong>{adminReady?'configured':'required'}</strong></p></aside>
    </section>
    <section className="stats"><div className="stat"><strong>{stats.total.toLocaleString()}</strong><span>Contacts</span></div><div className="stat"><strong>{stats.eligible.toLocaleString()}</strong><span>Eligible</span></div><div className="stat"><strong>{stats.suppressed.toLocaleString()}</strong><span>Suppressed</span></div><div className="stat"><strong>{stats.campaigns.toLocaleString()}</strong><span>Campaigns</span></div></section>
    <section className="panel"><h2>Safety rules</h2><p>CSV re-imports never overwrite the local suppression state. Resend keeps its own broadcast unsubscribe state. Campaign submissions require a successful test first, a typed <strong>SEND</strong> confirmation, and a campaign lock so a double click cannot create a second blast.</p></section>
  </>
}
