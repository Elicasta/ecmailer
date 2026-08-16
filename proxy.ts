import { NextResponse, type NextRequest } from 'next/server'
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname
  if (path.startsWith('/api/webhooks/resend') || path.startsWith('/api/unsubscribe') || path.startsWith('/unsubscribe')) return NextResponse.next()
  const user = process.env.ADMIN_USER
  const pass = process.env.ADMIN_PASSWORD
  if (!user || !pass) return new NextResponse('EC Mailer admin credentials are not configured.', { status: 503 })
  const auth = request.headers.get('authorization')
  if (auth?.startsWith('Basic ')) {
    try { const decoded = atob(auth.slice(6)); const split = decoded.indexOf(':'); if (split >= 0 && decoded.slice(0, split) === user && decoded.slice(split + 1) === pass) return NextResponse.next() } catch {}
  }
  return new NextResponse('Authentication required', { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="EC Mailer"' } })
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] }
