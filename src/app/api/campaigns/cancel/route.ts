import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { getResend } from '@/lib/resend'

export async function POST(request:Request){
  try{
    const {campaignId}=await request.json();if(!campaignId)return NextResponse.json({error:'Campaign is required.'},{status:400})
    const db=getSupabaseAdmin();const {data:campaign,error}=await db.from('ecm_campaigns').select('id,status,resend_broadcast_id').eq('id',campaignId).single();if(error||!campaign)return NextResponse.json({error:'Campaign not found.'},{status:404})
    if(campaign.status!=='scheduled'||!campaign.resend_broadcast_id)return NextResponse.json({error:'Only a scheduled Broadcast can be cancelled.'},{status:409})
    const result=await getResend().broadcasts.remove(campaign.resend_broadcast_id);if(result.error)throw new Error(result.error.message)
    const {error:updateError}=await db.from('ecm_campaigns').update({status:'tested',resend_broadcast_id:null,send_token:null,updated_at:new Date().toISOString()}).eq('id',campaignId).eq('status','scheduled');if(updateError)throw updateError
    return NextResponse.json({ok:true})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not cancel scheduled Broadcast'},{status:500})}
}
