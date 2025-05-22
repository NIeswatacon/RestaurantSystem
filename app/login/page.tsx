'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const router = useRouter()

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setErro('')

    const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, senha })
    })


    if (res.ok) {
      router.push('/')
    } else {
      setErro('E-mail ou senha inválidos')
    }
  }

  return (
    <form onSubmit={login} style={{ padding: '2rem' }}>
      <h1>Login</h1>
      {erro && <p style={{ color: 'red' }}>{erro}</p>}
      <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} required />
      <input type="password" placeholder="Senha" value={senha} onChange={e => setSenha(e.target.value)} required />
      <button type="submit">Entrar</button>
      <p>Não tem conta? <a href="/cadastro">Crie uma agora</a></p>
    </form>
  )
}
