import { cookies } from 'next/headers'

export async function getUsuarioLogado() {
  const cookieStore = await cookies() 
  const raw = cookieStore.get('usuario')?.value
  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}
