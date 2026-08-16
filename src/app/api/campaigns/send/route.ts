import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getResend, getSender } from '@/lib/resend'
import { renderEmailHtml, renderPlainText } from '@/lib/email'
import { createUnsubscribeToken } from '@/lib/unsubscribe'

export const runtime='nodejs'
export const maxDuration=300

export async function POST(request:Request){
  const db=getSupabaseAdmin()
  let campaignId=''
  try{
    const body=await request.json();campaignId=String(body.campaignId||'')
    if(body.confirmation!=='SEND'||!campaignId)return NextResponse.json({error:'Typed SEND confirmation is required.'},{status:400})
    const postalAddress=process.env.BUSINESS_POSTAL_ADDRESS;if(!postalAddress)return NextResponse.json({error:'BUSINESS_POSTAL_ADDRESS must be configured before sending.'},{status:503})
    const appUrl=process.env.NEXT_PUBLIC_APP_URL;if(!appUrl)return NextResponse.json({error:'NEXT_PUBLIC_APP_URL must be configured before sending.'},{status:503})
    const {data:campaign,error}=await db.from('ecm_campaigns').select('*').eq('id',campaignId).single();if(error||!campaign)return NextResponse.json({error:'Campaign not found.'},{status:404})
    if(!['tested','ready'].includes(campaign.status))return NextResponse.json({error:campaign.status==='sent'?'Campaign has already been sent.':'Send a successful test first.'},{status:409})
    const sendToken=crypto.randomUUID();const {data:locked,error:lockError}=await db.from('ecm_campaigns').update({status:'sending',send_token:sendToken,updated_at:new Date().toISOString()}).eq('id',campaignId).in('status',['tested','ready']).select('id').maybeSingle()
    if(lockError)throw lockError;if(!locked)return NextResponse.json({error:'Campaign is already sending or no longer eligible to send.'},{status:409})
    const {data:contacts,error:contactError}=await db.from('ecm_contacts').select('id,email,first_name').eq('marketing_status','eligible').order('email');if(contactError)throw contactError
    if(!contacts?.length){await db.from('ecm_campaigns').update({status:'failed'}).eq('id',campaignId);return NextResponse.json({error:'No eligible contacts.'},{status:400})}
    await db.from('ecm_campaign_recipients').upsert(contacts.map(c=>({campaign_id:campaignId,contact_id:c.id,status:'pending'})),{onConflict:'campaign_id,contact_id'})
    const resend=getResend();let sent=0;const batchSize=100
    for(let i=0;i<contacts.length;i+=batchSize){
      const chunk=contacts.slice(i,i+batchSize)
      const emails=chunk.map(contact=>{const token=createUnsubscribeToken(contact.id,contact.email);const unsubscribeUrl=`${appUrl}/unsubscribe?token=${encodeURIComponent(token)}`;const oneClickUrl=`${appUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;return {from:getSender(),to:[contact.email],replyTo:process.env.RESEND_REPLY_TO||undefined,subject:campaign.subject,html:renderEmailHtml({firstName:contact.first_name,bodyHtml:campaign.body_html,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl,previewText:campaign.preview_text,postalAddress}),text:renderPlainText({firstName:contact.first_name,text:campaign.body_text,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl,postalAddress}),headers:{'List-Unsubscribe':`<${oneClickUrl}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'},tags:[{name:'campaign_id',value:campaignId}]}}
      )
      const result=await resend.batch.send(emails,{idempotencyKey:`ecm-${campaignId}-${sendToken}-${Math.floor(i/batchSize)}`});if(result.error)throw new Error(result.error.message)
      const ids=result.data?.data??[]
      const recipientUpdates=chunk.map((contact,index)=>({campaign_id:campaignId,contact_id:contact.id,resend_email_id:ids[index]?.id??null,status:ids[index]?.id?'sent':'submitted',last_event_at:new Date().toISOString()}))
      const {error:updateError}=await db.from('ecm_campaign_recipients').upsert(recipientUpdates,{onConflict:'campaign_id,contact_id'});if(updateError)throw updateError
      sent+=chunk.length
    }
    await db.from('ecm_campaigns').update({status:'sent',sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',campaignId).eq('send_token',sendToken)
    return NextResponse.json({ok:true,sent})
  }catch(error){if(campaignId)await db.from('ecm_campaigns').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',campaignId).eq('status','sending');return NextResponse.json({error:error instanceof Error?error.message:'Campaign send failed'},{status:500})}
}
