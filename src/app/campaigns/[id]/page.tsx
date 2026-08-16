import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getSupabaseAdmin } from '@/lib/supabase'
import { renderEmailHtml, renderPlainText } from '@/lib/email'
import { CampaignEditor } from './campaign-editor'
import { CampaignActions } from '../campaign-actions'

export const dynamic='force-dynamic'

export default async function CampaignPage({params}:{params:Promise<{id:string}>}){
  const {id}=await params;const db=getSupabaseAdmin();const {data:campaign,error}=await db.from('ecm_campaigns').select('*').eq('id',id).single();if(error||!campaign)notFound()
  const postalAddress=process.env.BUSINESS_POSTAL_ADDRESS||'Business postal address appears here once configured.'
  const html=renderEmailHtml({firstName:'Preview Client',bodyHtml:campaign.body_html,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl:'#',previewText:campaign.preview_text,postalAddress})
  const text=renderPlainText({firstName:'Preview Client',text:campaign.body_text,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl:'[managed unsubscribe link]',postalAddress})
  return <>
    <section className="panel"><div className="toolbar" style={{justifyContent:'space-between'}}><div><div className="eyebrow">Campaign detail</div><h1 style={{marginBottom:4}}>{campaign.name}</h1><span className="badge">{campaign.status}</span></div><Link href="/campaigns" className="button ghost">Back to campaigns</Link></div></section>
    <section className="panel"><h2>Edit</h2><CampaignEditor campaign={campaign}/></section>
    <section className="panel"><h2>Rendered email preview</h2><p>This iframe is sandboxed. It uses the same server renderer as test/live sends.</p><iframe title="Campaign email preview" sandbox="" srcDoc={html} style={{width:'100%',height:720,border:'1px solid var(--line)',background:'#fff'}}/></section>
    <section className="panel"><h2>Plain text fallback</h2><pre style={{whiteSpace:'pre-wrap',fontFamily:'Arial,Helvetica,sans-serif',lineHeight:1.5}}>{text}</pre></section>
    <section className="panel"><h2>Delivery</h2><CampaignActions campaignId={campaign.id} status={campaign.status} scheduledAt={campaign.scheduled_at}/></section>
  </>
}
