import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
  try{
    const {id}=await params;const body=await request.json();const db=getSupabaseAdmin()
    const {data:existing,error:lookupError}=await db.from('ecm_campaigns').select('status').eq('id',id).single();if(lookupError||!existing)return NextResponse.json({error:'Campaign not found.'},{status:404})
    if(['preparing','scheduled','sending','sent'].includes(existing.status))return NextResponse.json({error:'Submitted campaigns cannot be edited. Cancel a scheduled Broadcast first.'},{status:409})
    const name=String(body.name||'').trim(),subject=String(body.subject||'').trim(),bodyHtml=String(body.bodyHtml||'').trim(),bodyText=String(body.bodyText||'').trim();if(!name||!subject||!bodyHtml||!bodyText)return NextResponse.json({error:'Name, subject, HTML body, and plain text body are required.'},{status:400})
    let scheduledAt:string|null=null;if(body.scheduledAt){const date=new Date(String(body.scheduledAt));if(Number.isNaN(date.getTime()))return NextResponse.json({error:'Schedule time is invalid.'},{status:400});if(date.getTime()<=Date.now())return NextResponse.json({error:'Schedule time must be in the future.'},{status:400});scheduledAt=date.toISOString()}
    const {error}=await db.from('ecm_campaigns').update({name,subject,preview_text:String(body.previewText||'').trim()||null,body_html:bodyHtml,body_text:bodyText,cta_label:String(body.ctaLabel||'').trim()||null,cta_url:String(body.ctaUrl||'').trim()||null,scheduled_at:scheduledAt,status:'draft',send_token:null,resend_broadcast_id:null,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error
    return NextResponse.json({ok:true})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not update campaign'},{status:500})}
}
