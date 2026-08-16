import { Resend } from 'resend'
export function getResend(){const key=process.env.RESEND_API_KEY;if(!key)throw new Error('RESEND_API_KEY is not configured');return new Resend(key)}
export function getSender(){const from=process.env.RESEND_FROM;if(!from)throw new Error('RESEND_FROM is not configured');return from}
