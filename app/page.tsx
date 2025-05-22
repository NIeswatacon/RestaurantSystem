import Link from 'next/link'

export default function HomePublica() {
  return (
    <main>
      <h1>Bem-vindo ao restaurante</h1>
      <p><Link href="/visualizar-cardapio">Ver Cardápio</Link></p>
      <p><Link href="/login">Fazer Login</Link></p>
    </main>
  )
}
