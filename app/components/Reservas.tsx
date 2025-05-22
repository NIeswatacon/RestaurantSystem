'use client'
import { useState } from 'react'

export default function Reservas() {
  const [nome, setNome] = useState('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [pessoas, setPessoas] = useState(1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/reservas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, data, hora, pessoas })
    })

    if (res.ok) {
      alert('Reserva feita com sucesso!')
      setNome('')
      setData('')
      setHora('')
      setPessoas(1)
    } else {
      alert('Erro ao enviar reserva.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome" required />
      <input type="date" value={data} onChange={e => setData(e.target.value)} required />
      <input type="time" value={hora} onChange={e => setHora(e.target.value)} required />
      <input type="number" min="1" value={pessoas} onChange={e => setPessoas(Number(e.target.value))} required />
      <button type="submit">Reservar</button>
    </form>
  )
}
