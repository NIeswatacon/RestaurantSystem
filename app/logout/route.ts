import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'))

  // Limpar o cookie do usuário
  response.cookies.set('usuario', '', {
    maxAge: 0,
    path: '/',
  })

  return response
}
