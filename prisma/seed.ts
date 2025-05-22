import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


async function main() {
  console.log('🔄 Inserindo dados de exemplo...')

  // CARDÁPIO
  await prisma.cardapioItem.createMany({
    data: [
      {
        nome: 'Pernil Assado do Dragão',
        descricao: 'Pernil suculento assado na brasa com especiarias medievais.',
        preco: 49.90,
        imagem: 'pernil.jpg'
      },
      {
        nome: 'Sopa de Elfo Verde',
        descricao: 'Sopa cremosa feita com vegetais encantados da floresta.',
        preco: 29.50,
        imagem: 'sopa.jpg'
      },
      {
        nome: 'Cerveja dos Anões',
        descricao: 'Cerveja artesanal forte, servida em canecas de ferro.',
        preco: 15.00,
        imagem: 'cerveja.jpg'
      }
    ]
  })

  // MESAS
  await prisma.mesa.createMany({
    data: [
      { numero: 1, capacidade: 2 },
      { numero: 2, capacidade: 4 },
      { numero: 3, capacidade: 6 },
      { numero: 4, capacidade: 8 }
    ]
  })

  // USUÁRIOS
  await prisma.usuario.createMany({
    data: [
      {
        nome: 'Isaac',
        email: 'isaacEnter',
        senha: '12345',
        role: 'admin'
      },
      {
        nome: 'Cliente',
        email: 'cliente@email.com',
        senha: '$2b$12$9GehOirxNY4GASwZfDK69ewzsX/wwjzrWKF/h1LMmb7EXoXXYxpHK',
        role: 'cliente'
      }
    ]
  })

  console.log('✅ Dados inseridos com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
