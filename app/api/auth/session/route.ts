import { NextResponse } from 'next/server';
import { getUsuarioLogado } from '@/lib/auth';

export async function GET() {
  const usuario = await getUsuarioLogado();
  return NextResponse.json({ usuario });
}
