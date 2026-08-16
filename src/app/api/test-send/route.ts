import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getResend, getSender } from '@/lib/resend'
import { renderEmailHtml, renderPlainText } from '@/lib/email'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const {campaignId,email}=await request.json();if(!campaignId||!email)return NextResponse.json({error:'Campaign and test email are required.'},{status:400})
    const postalAddress=process.env.BUSINESS_POSTAL_ADDRESS;if(!postalAddress)return NextResponse.json({error:'BUSINESS_POSTAL_ADDRESS must be configured before sending.'},{status:503})
    const db=getSupabaseAdmin();const {data:campaign,error}=await db.from('ecm_campaigns').select('*').eq('id',campaignId).single();if(error||!campaign)return NextResponse.json({error:'Campaign not found.'},{status:404})
    const appUrl=process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3000';const unsubscribeUrl=`${appUrl}/unsubscribe?token=test-preview`
    const html=renderEmailHtml({firstName:'Test Client',bodyHtml:campaign.body_html,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl,previewText:campaign.preview_text,postalAddress})
    const text=renderPlainText({firstName:'Test Client',text:campaign.body_text,ctaLabel:campaign.cta_label,ctaUrl:campaign.cta_url,unsubscribeUrl,postalAddress})
    const resend=getResend();const result=await resend.emails.send({from:getSender(),to:[String(email).trim()],replyTo:process.env.RESEND_REPLY_TO||undefined,subject:`[TEST] ${campaign.subject}`,html,text})
    if(result.error)throw new Error(result.error.message)
    await db.from('ecm_campaigns').update({status:'tested',updated_at:new Date().toISOString()}).eq('id',campaignId)
    return NextResponse.json({ok:true,id:result.data?.id})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Test send failed'},{status:500})}
}
