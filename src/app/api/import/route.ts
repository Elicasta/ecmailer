import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { normalizeEmail, parseCsv } from '@/lib/csv'

export const runtime='nodejs'

export async function POST(request:Request){
  try{
    const form=await request.formData();const file=form.get('file');
    if(!(file instanceof File))return NextResponse.json({error:'CSV file required'},{status:400})
    if(file.size>10_000_000)return NextResponse.json({error:'CSV is too large'},{status:413})
    const rows=parseCsv(await file.text());const seen=new Map<string,Record<string,string>>();let skipped=0
    for(const row of rows){const email=normalizeEmail(row.Email||row.email||'');if(!email||!email.includes('@')){skipped++;continue}if(seen.has(email)){skipped++;continue}seen.set(email,row)}
    const contacts=[...seen.entries()].map(([email,row])=>({email,first_name:row['First Name']||row.first_name||null,last_name:row['Last Name']||row.last_name||null,company:row.Company||row.company||null,phone:row.Phone||row.phone||null,address:row.Address||row.address||null,city:row.City||row.city||null,state:row.State||row.state||null,zip:row.Zip||row.ZIP||row.zip||null,country:row.Country||row.country||null,notes:row.Notes||row.notes||null,source:'pixieset',source_type:(row.Type||row.type||'other').toLowerCase(),updated_at:new Date().toISOString()}))
    const db=getSupabaseAdmin();const chunkSize=400
    for(let i=0;i<contacts.length;i+=chunkSize){const chunk=contacts.slice(i,i+chunkSize);const {error}=await db.from('ecm_contacts').upsert(chunk,{onConflict:'email',ignoreDuplicates:false});if(error)throw error}
    await db.from('ecm_imports').insert({filename:file.name,total_rows:rows.length,inserted_rows:contacts.length,updated_rows:0,skipped_rows:skipped})
    return NextResponse.json({rows:rows.length,unique:contacts.length,skipped})
  }catch(error){return NextResponse.json({error:error instanceof Error?error.message:'Import failed'},{status:500})}
}
