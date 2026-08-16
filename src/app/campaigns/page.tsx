import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { CampaignForm } from './campaign-form'
import { CampaignActions } from './campaign-actions'

export const dynamic='force-dynamic'

export default async function CampaignsPage(){
  if(!isSupabaseConfigured()) return <section className="panel"><h1>Campaigns</h1><div className="notice">Supabase is not configured yet. Campaign building becomes active after the dedicated EC Mailer project is connected.</div></section>
  const db=getSupabaseAdmin();const {data:campaigns}=await db.from('ecm_campaigns').select('*').order('created_at',{ascending:false}).limit(30)
  return <><section className="panel"><div className="eyebrow">Compose</div><h1>New campaign</h1><CampaignForm /></section><section className="panel"><h2>Campaigns</h2><div className="table-wrap"><table className="data"><thead><tr><th>Campaign</th><th>Subject</th><th>Status</th><th>Actions</th></tr></thead><tbody>{campaigns?.length?campaigns.map(c=><tr key={c.id}><td><strong>{c.name}</strong><br/><small>{new Date(c.created_at).toLocaleString()}</small></td><td>{c.subject}</td><td><span className={`badge ${c.status==='sent'?'good':c.status==='failed'?'warn':''}`}>{c.status}</span></td><td><CampaignActions campaignId={c.id} status={c.status}/></td></tr>):<tr><td colSpan={4} className="empty">No campaigns yet.</td></tr>}</tbody></table></div></section></>
}
