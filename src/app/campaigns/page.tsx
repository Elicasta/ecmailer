import { getSupabaseAdmin, isSupabaseConfigured } from '@/lib/supabase'
import { CampaignForm } from './campaign-form'
import { CampaignActions } from './campaign-actions'

export const dynamic='force-dynamic'

type Metrics={sent:number;delivered:number;opened:number;clicked:number;bounced:number;complained:number}
function blankMetrics():Metrics{return{sent:0,delivered:0,opened:0,clicked:0,bounced:0,complained:0}}

export default async function CampaignsPage(){
  if(!isSupabaseConfigured()) return <section className="panel"><h1>Campaigns</h1><div className="notice">Supabase is not configured yet. Campaign building becomes active after the dedicated EC Mailer project is connected.</div></section>
  const db=getSupabaseAdmin();const {data:campaigns}=await db.from('ecm_campaigns').select('*').order('created_at',{ascending:false}).limit(30)
  const broadcastIds=(campaigns??[]).map(c=>c.resend_broadcast_id).filter(Boolean) as string[]
  const metricsByBroadcast=new Map<string,Metrics>()
  if(broadcastIds.length){
    const {data:events}=await db.from('ecm_email_events').select('broadcast_id,resend_email_id,event_type').in('broadcast_id',broadcastIds)
    const sets=new Map<string,Record<string,Set<string>>>()
    for(const event of events??[]){if(!event.broadcast_id||!event.resend_email_id)continue;let group=sets.get(event.broadcast_id);if(!group){group={};sets.set(event.broadcast_id,group)};(group[event.event_type]??=new Set()).add(event.resend_email_id)}
    for(const id of broadcastIds){const group=sets.get(id)??{};metricsByBroadcast.set(id,{sent:group['email.sent']?.size??0,delivered:group['email.delivered']?.size??0,opened:group['email.opened']?.size??0,clicked:group['email.clicked']?.size??0,bounced:group['email.bounced']?.size??0,complained:group['email.complained']?.size??0})}
  }
  return <><section className="panel"><div className="eyebrow">Compose</div><h1>New campaign</h1><CampaignForm /></section><section className="panel"><h2>Campaigns</h2><div className="table-wrap"><table className="data"><thead><tr><th>Campaign</th><th>Subject</th><th>Status</th><th>Delivery</th><th>Actions</th></tr></thead><tbody>{campaigns?.length?campaigns.map(c=>{const m=c.resend_broadcast_id?(metricsByBroadcast.get(c.resend_broadcast_id)??blankMetrics()):blankMetrics();return <tr key={c.id}><td><strong>{c.name}</strong><br/><small>{new Date(c.created_at).toLocaleString()}{c.scheduled_at?<><br/>Schedule: {new Date(c.scheduled_at).toLocaleString()}</>:null}</small></td><td>{c.subject}</td><td><span className={`badge ${c.status==='sent'?'good':c.status==='failed'?'warn':''}`}>{c.status}</span></td><td><small>{m.delivered} delivered · {m.opened} opened · {m.clicked} clicked<br/>{m.bounced} bounced · {m.complained} complaints</small></td><td><CampaignActions campaignId={c.id} status={c.status} scheduledAt={c.scheduled_at}/></td></tr>}):<tr><td colSpan={5} className="empty">No campaigns yet.</td></tr>}</tbody></table></div></section></>
}
