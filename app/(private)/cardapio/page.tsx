import { getUsuarioLogado } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default function CardapioAdmin() {
  const usuario = getUsuarioLogado()
  if (!usuario || usuario.role !== 'admin') return redirect('/')

  return (
    <div>
      <h1>Gerenciar Cardápio</h1>
      <p>Área restrita ao administrador.</p>
    </div>
  )
}