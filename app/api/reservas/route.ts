import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const data = await prisma.cardapioItem.findMany()
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const body = await req.json()
  const prato = await prisma.cardapioItem.create({ data: body })
  return NextResponse.json(prato)
}
