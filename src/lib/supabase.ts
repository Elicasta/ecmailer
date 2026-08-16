import { createClient } from '@supabase/supabase-js'
export function isSupabaseConfigured(){return Boolean(process.env.SUPABASE_URL&&process.env.SUPABASE_SECRET_KEY)}
export function getSupabaseAdmin(){const url=process.env.SUPABASE_URL;const key=process.env.SUPABASE_SECRET_KEY;if(!url||!key)throw new Error('Supabase is not configured');return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}})}
