import { prisma } from '@/lib/prisma'
import { compare } from 'bcrypt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { email, senha } = await req.json()


  const user = await prisma.usuario.findUnique({ where: { email } })

  if (!user || !(await compare(senha, user.senha))) {
    return NextResponse.json({ erro: 'Credenciais inválidas' }, { status: 401 })
  }


  const response = NextResponse.json({ sucesso: true })

  response.cookies.set('usuario', JSON.stringify({
    id: user.id,
    nome: user.nome,
    role: user.role,
  }), {
    httpOnly: true,
    maxAge: 60 * 60 * 24, 
    path: '/',
  })

  return response
}
