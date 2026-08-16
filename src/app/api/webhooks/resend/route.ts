import { NextResponse } from 'next/server'
import { getResend } from '@/lib/resend'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const secret=process.env.RESEND_WEBHOOK_SECRET;if(!secret)return NextResponse.json({error:'Webhook secret not configured.'},{status:503})
    const payload=await request.text();const headers={id:request.headers.get('svix-id')||'',timestamp:request.headers.get('svix-timestamp')||'',signature:request.headers.get('svix-signature')||''}
    const resend=getResend();const event=await resend.webhooks.verify({payload,headers,webhookSecret:secret}) as any
    const db=getSupabaseAdmin();const emailId=event?.data?.email_id||event?.data?.id||null;const recipient=Array.isArray(event?.data?.to)?event.data.to[0]:event?.data?.to||null;const type=String(event?.type||'unknown')
    const {error:insertError}=await db.from('ecm_email_events').insert({resend_email_id:emailId,event_type:type,contact_email:recipient,payload:event});if(insertError)throw insertError
    if(emailId){await db.from('ecm_campaign_recipients').update({status:type.replace('email.',''),last_event_at:new Date().toISOString()}).eq('resend_email_id',emailId)}
    if(recipient&&(type==='email.bounced'||type==='email.complained')){await db.from('ecm_contacts').update({marketing_status:type==='email.bounced'?'bounced':'complained',updated_at:new Date().toISOString()}).eq('email',String(recipient).toLowerCase())}
    return NextResponse.json({ok:true})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Webhook rejected'},{status:400})}
}
