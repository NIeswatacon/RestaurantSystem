'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CadastroPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function cadastrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const res = await fetch('/api/auth/cadastro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha })
    })

    if (res.ok) {
      router.push('/login')
    } else {
      const data = await res.json()
      setErro(data.erro || 'Erro ao cadastrar.')
    }
  }

  return (
    <form onSubmit={cadastrar} style={{ padding: '2rem' }}>
      <h1>Cadastro</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <input placeholder="Nome" value={nome} onChange={e => setNome(e.target.value)} required />
      <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required type="email" />
      <input placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required type="password" />
      <button type="submit">Cadastrar</button>
    </form>
  )
}
