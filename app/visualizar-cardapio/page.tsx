import { prisma } from '@/lib/prisma'

export default async function VisualizarCardapioPage() {
  const pratos = await prisma.cardapioItem.findMany()

  return (
    <div>
      <h1>Cardápio</h1>
      <ul>
        {pratos.map(prato => (
          <li key={prato.id}>
            <strong>{prato.nome}</strong> - R$ {prato.preco.toFixed(2)}
            <p>{prato.descricao}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
