import type { Metadata } from 'next'
import './globals.css'
import { Nav } from '@/components/nav'

export const metadata: Metadata = { title: 'EC Mailer', description: 'Private campaign mailer for EC Creative Studios' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><Nav /><main className="shell">{children}</main></body></html>
}
