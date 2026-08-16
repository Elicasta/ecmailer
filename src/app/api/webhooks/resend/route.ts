import { NextResponse } from 'next/server'
import { getResend } from '@/lib/resend'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const secret=process.env.RESEND_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Webhook secret not configured.'},{status:503})
    const payload=await request.text();const webhookId=request.headers.get('svix-id')||'';const headers={id:webhookId,timestamp:request.headers.get('svix-timestamp')||'',signature:request.headers.get('svix-signature')||''}
    const resend=getResend();const event=await resend.webhooks.verify({payload,headers,webhookSecret:secret}) as any
    const type=String(event?.type||'unknown');const isEmailEvent=type.startsWith('email.');const emailId=isEmailEvent?(event?.data?.email_id||event?.data?.id||null):null;const broadcastId=isEmailEvent?(event?.data?.broadcast_id||null):null;const recipient=Array.isArray(event?.data?.to)?event.data.to[0]:event?.data?.email||event?.data?.to||null
    const db=getSupabaseAdmin();const {error:insertError}=await db.from('ecm_email_events').upsert({webhook_id:webhookId||null,resend_email_id:emailId,broadcast_id:broadcastId,event_type:type,contact_email:recipient,payload:event},{onConflict:'webhook_id',ignoreDuplicates:true});if(insertError)throw insertError

    if(type==='contact.updated'&&recipient&&event?.data?.unsubscribed===true){await db.from('ecm_contacts').update({marketing_status:'unsubscribed',updated_at:new Date().toISOString()}).eq('email',String(recipient).toLowerCase())}
    if(recipient&&['email.bounced','email.complained','email.suppressed'].includes(type)){const status=type==='email.bounced'?'bounced':type==='email.complained'?'complained':'suppressed';await db.from('ecm_contacts').update({marketing_status:status,updated_at:new Date().toISOString()}).eq('email',String(recipient).toLowerCase())}

    if(broadcastId&&recipient&&emailId){
      const [{data:campaign},{data:contact}]=await Promise.all([db.from('ecm_campaigns').select('id,status').eq('resend_broadcast_id',broadcastId).maybeSingle(),db.from('ecm_contacts').select('id').eq('email',String(recipient).toLowerCase()).maybeSingle()])
      if(campaign?.id&&contact?.id){await db.from('ecm_campaign_recipients').update({resend_email_id:emailId,status:type.replace('email.',''),last_event_at:new Date().toISOString()}).eq('campaign_id',campaign.id).eq('contact_id',contact.id)}
      if(campaign?.id&&campaign.status==='scheduled'&&['email.sent','email.delivered'].includes(type)){await db.from('ecm_campaigns').update({status:'sent',sent_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',campaign.id).eq('status','scheduled')}
    }
    return NextResponse.json({ok:true})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Webhook rejected'},{status:400})}
}
