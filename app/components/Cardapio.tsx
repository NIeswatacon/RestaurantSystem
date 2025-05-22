import { PrismaClient, CardapioItem } from '@prisma/client'

const prisma = new PrismaClient()

export default async function Cardapio() {
  const pratos: CardapioItem[] = await prisma.cardapioItem.findMany()

  return (
    <div>
      <h1>Cardápio</h1>
      {pratos.map((item) => (
        <div key={item.id}>
          <h2>{item.nome}</h2>
          <p>{item.descricao}</p>
          <strong>R$ {item.preco.toFixed(2)}</strong>
        </div>
      ))}
    </div>
  )
}
