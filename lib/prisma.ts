// lib/prisma.ts - VERSÃO CORRIGIDA SUGERIDA
import { PrismaClient } from '@prisma/client'; // Caminho relativo de 'lib/' para 'app/generated/prisma/'
                                                     // Ou use '@/app/generated/prisma' se o alias estiver funcionando bem aqui.

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Em desenvolvimento, evite criar múltiplas instâncias do PrismaClient
  // devido ao Hot Module Replacement (HMR) do Next.js.
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}

export default prisma;