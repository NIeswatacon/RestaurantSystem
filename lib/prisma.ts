// lib/prisma.ts
import { PrismaClient } from '../app/generated/prisma'; // Caminho relativo de lib/ para app/generated/prisma/

// Ou usando o alias, se o problema não for o alias para este arquivo:
// import { PrismaClient } from '@/app/generated/prisma';

let prisma: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Em desenvolvimento, reutilize a instância para evitar muitas conexões
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = new PrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}

export default prisma;