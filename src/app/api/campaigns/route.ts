import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(request:Request){
  try{
    const body=await request.json();
    const name=String(body.name||'').trim(),subject=String(body.subject||'').trim(),bodyHtml=String(body.bodyHtml||'').trim(),bodyText=String(body.bodyText||'').trim()
    if(!name||!subject||!bodyHtml||!bodyText)return NextResponse.json({error:'Name, subject, HTML body, and plain text body are required.'},{status:400})
    const db=getSupabaseAdmin();const {data,error}=await db.from('ecm_campaigns').insert({name,subject,preview_text:String(body.previewText||'').trim()||null,body_html:bodyHtml,body_text:bodyText,cta_label:String(body.ctaLabel||'').trim()||null,cta_url:String(body.ctaUrl||'').trim()||null,status:'draft'}).select('id').single()
    if(error)throw error;return NextResponse.json({id:data.id})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Could not create campaign'},{status:500})}
}
