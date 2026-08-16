import { UnsubscribeClient } from './unsubscribe-client'

export default async function UnsubscribePage({searchParams}:{searchParams:Promise<{token?:string}>}){
  const params=await searchParams
  return <section className="panel" style={{maxWidth:620,margin:'60px auto'}}><div className="eyebrow">EC Creative Studios</div><h1>Email preferences</h1><UnsubscribeClient token={params.token??null}/></section>
}
