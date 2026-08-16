import Link from 'next/link'

export function Nav(){
  return <header className="topbar"><div className="topbar-inner"><Link href="/" className="brand"><span>EC</span> Mailer</Link><nav><Link href="/">Dashboard</Link><Link href="/contacts">Contacts</Link><Link href="/campaigns">Campaigns</Link></nav></div></header>
}
