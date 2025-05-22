import { getUsuarioLogado } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PrivateLayout({ children }: { children: React.ReactNode }) {
  const usuario = await getUsuarioLogado()

  if (!usuario) return redirect('/login')

  return (
    <>
      <header style={{ marginBottom: '1rem' }}>
        <p>Olá, {usuario.nome} ({usuario.role})</p>
        <nav style={{ marginTop: '0.5rem' }}>
          <Link href="/visualizar-cardapio">Ver Cardápio</Link> |{' '}
          <Link href="/reservas">Reservar Mesa</Link>
          {usuario.role === 'admin' && (
            <> | <Link href="/cardapio">Editar Cardápio</Link></>
          )}
          <> | <a href="/logout">Sair</a></>
        </nav>
      </header>

      <main>{children}</main>
    </>
  )
}
