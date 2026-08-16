import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getResend, getSender } from '@/lib/resend'
import { renderEmailHtml, renderPlainText } from '@/lib/email'

export const runtime='nodejs'
export const maxDuration=300

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms))

export async function POST(request:Request){
  const db=getSupabaseAdmin();let campaignId='';let providerAccepted=false
  try{
    const body=await request.json();campaignId=String(body.campaignId||'')
    if(body.confirmation!=='SEND'||!campaignId)return NextResponse.json({error:'Typed SEND confirmation is required.'},{status:400})
    const postalAddress=process.env.BUSINESS_POSTAL_ADDRESS;if(!postalAddress)return NextResponse.json({error:'BUSINESS_POSTAL_ADDRESS must be configured before sending.'},{status:503})
    const segmentId=process.env.RESEND_SEGMENT_ID;if(!segmentId)return NextResponse.json({error:'RESEND_SEGMENT_ID must be configured before sending.'},{status:503})
    const {data:campaign,error}=await db.from('ecm_campaigns').select('*').eq('id',campaignId).single();if(error||!campaign)return NextResponse.json({error:'Campaign not found.'},{status:404})
    if(!['tested','ready'].includes(campaign.status))return NextResponse.json({error:['sent','scheduled'].includes(campaign.status)?'Campaign has already been submitted to Resend.':'Send a successful test first.'},{status:409})
    const sendToken=crypto.randomUUID();const {data:locked,error:lockError}=await db.from('ecm_campaigns').update({status:'preparing',send_token:sendToken,updated_at:new Date().toISOString()}).eq('id',campaignId).in('status',['tested','ready']).select('id').maybeSingle()
    if(lockError)throw lockError;if(!locked)return NextResponse.json({error:'Campaign is already preparing/sending or is no longer eligible to send.'},{status:409})

    const resend=getResend()
    const {data:latestImport}=await db.from('ecm_imports').select('id,resend_import_id,resend_import_status').not('resend_import_id','is',null).order('created_at',{ascending:false}).limit(1).maybeSingle()
    if(latestImport?.resend_import_id){
      let importStatus=latestImport.resend_import_status
      for(let attempt=0;attempt<45&&importStatus!=='completed';attempt++){
        const check=await resend.contacts.imports.get(latestImport.resend_import_id);if(check.error)throw new Error(`Could not verify Resend contact import: ${check.error.message}`)
        importStatus=check.data?.status??importStatus
        await db.from('ecm_imports').update({resend_import_status:importStatus}).eq('id',latestImport.id)
        if(importStatus==='failed')throw new Error('The latest Resend contact import failed. Fix the audience sync before sending.')
        if(importStatus!=='completed')await sleep(2000)
      }
      if(importStatus!=='completed')throw new Error('Resend is still importing the audience. Try the send again after the import completes.')
    }

    const {data:contacts,error:contactError}=await db.from('ecm_contacts').select('id,email').eq('marketing_status','eligible').order('email');if(contactError)throw contactError
    if(!contacts?.length)throw new Error('No eligible contacts.')
    const {error:snapshotError}=await db.from('ecm_campaign_recipients').upsert(contacts.map(c=>({campaign_id:campaignId,contact_id:c.id,status:'submitted'})),{onConflict:'campaign_id,contact_id'});if(snapshotError)throw snapshotError

    const html=renderEmailHtml({firstName:'{{{contact.first_name|there}}}',bodyHtml:campaign.body_html,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl:'{{{RESEND_UNSUBSCRIBE_URL}}}',previewText:campaign.preview_text,postalAddress})
    const text=renderPlainText({firstName:'{{{contact.first_name|there}}}',text:campaign.body_text,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl:'{{{RESEND_UNSUBSCRIBE_URL}}}',postalAddress})
    const scheduledAt=campaign.scheduled_at&&new Date(campaign.scheduled_at).getTime()>Date.now()?new Date(campaign.scheduled_at).toISOString():undefined
    const result=await resend.broadcasts.create({segmentId,from:getSender(),replyTo:process.env.RESEND_REPLY_TO?[process.env.RESEND_REPLY_TO]:undefined,name:campaign.name,subject:campaign.subject,previewText:campaign.preview_text||undefined,html,text,send:true,scheduledAt})
    if(result.error)throw new Error(result.error.message)
    providerAccepted=true
    const broadcastId=result.data?.id??null;const submittedAt=new Date().toISOString();const nextStatus=scheduledAt?'scheduled':'sent'
    const {error:updateError}=await db.from('ecm_campaigns').update({status:nextStatus,resend_segment_id:segmentId,resend_broadcast_id:broadcastId,sent_at:scheduledAt?null:submittedAt,updated_at:submittedAt}).eq('id',campaignId).eq('send_token',sendToken);if(updateError)throw updateError
    return NextResponse.json({ok:true,targeted:contacts.length,broadcastId,scheduledAt:scheduledAt??null,status:nextStatus})
  }catch(error){if(campaignId&&!providerAccepted)await db.from('ecm_campaigns').update({status:'failed',updated_at:new Date().toISOString()}).eq('id',campaignId).in('status',['preparing','sending']);return NextResponse.json({error:error instanceof Error?error.message:'Campaign send failed'},{status:500})}
}
