import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe'
import { getResend } from '@/lib/resend'

async function unsubscribe(token:string|null){
  if(!token)return NextResponse.json({error:'Missing unsubscribe token.'},{status:400})
  const data=verifyUnsubscribeToken(token);if(!data)return NextResponse.json({error:'Invalid unsubscribe token.'},{status:400})
  const db=getSupabaseAdmin();const {error}=await db.from('ecm_contacts').update({marketing_status:'unsubscribed',updated_at:new Date().toISOString()}).eq('id',data.contactId).eq('email',data.email)
  if(error)return NextResponse.json({error:'Could not update subscription.'},{status:500})
  if(process.env.RESEND_API_KEY){const result=await getResend().contacts.update({email:data.email,unsubscribed:true});if(result.error)return NextResponse.json({error:'Unsubscribed locally, but Resend preference sync failed.'},{status:502})}
  return new NextResponse(null,{status:200})
}
export async function GET(request:Request){return unsubscribe(new URL(request.url).searchParams.get('token'))}
export async function POST(request:Request){const url=new URL(request.url);let token=url.searchParams.get('token');if(!token){try{const body=await request.json();token=body.token??null}catch{}}return unsubscribe(token)}
