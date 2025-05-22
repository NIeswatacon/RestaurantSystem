import { prisma } from '@/lib/prisma'
import { hash } from 'bcrypt'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { nome, email, senha } = await req.json()

  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) {
    return NextResponse.json({ erro: 'E-mail já está em uso.' }, { status: 400 })
  }

  const senhaCriptografada = await hash(senha, 10)

  const novoUsuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      senha: senhaCriptografada,
      role: 'cliente' // por padrão
    }
  })

  return NextResponse.json({ sucesso: true, usuario: { id: novoUsuario.id, nome: novoUsuario.nome } })
}
