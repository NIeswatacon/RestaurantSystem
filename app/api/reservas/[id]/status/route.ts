// app/api/reservas/[id]/status/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Seu cliente Prisma de lib/prisma.ts
import { z } from 'zod';

// Tempo de tolerância para atraso (15 minutos em milissegundos)
// É bom manter essa constante consistente entre os arquivos ou em um arquivo de configuração
const TOLERANCIA_ATRASO_MS = 15 * 60 * 1000;

// Schema para validar o corpo da requisição PATCH
const updateReservaStatusSchema = z.object({
  status: z.enum([
    "check_in_realizado",
    "no_show",
    "cancelada_pelo_cliente"
    // Outros status que o admin/sistema possa definir
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const reservaId = params.id;

  if (!reservaId) {
    return NextResponse.json({ message: "ID da reserva é obrigatório" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const validation = updateReservaStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados de status inválidos", errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const novoStatus = validation.data.status;

    const reservaExistente = await prisma.reserva.findUnique({
      where: { id: reservaId },
    });

    if (!reservaExistente) {
      return NextResponse.json({ message: "Reserva não encontrada" }, { status: 404 });
    }

    // Lógica de transição de status
    if (novoStatus === "check_in_realizado") {
      if (reservaExistente.status !== "confirmada") {
        return NextResponse.json(
          { message: `Não é possível fazer check-in. Status atual da reserva: '${reservaExistente.status}'.` },
          { status: 400 }
        );
      }
      const agora = new Date();
      const limiteToleranciaCheckin = new Date(new Date(reservaExistente.dataHoraInicio).getTime() + TOLERANCIA_ATRASO_MS);
      // Você pode decidir se permite check-in após a tolerância.
      // Aqui estamos permitindo, mas poderia haver um aviso ou lógica adicional.
      if (agora > limiteToleranciaCheckin) {
        console.warn(`Admin realizando check-in para reserva ${reservaId} após o limite de tolerância (${TOLERANCIA_ATRASO_MS / (60 * 1000)} min).`);
      }
    } else if (novoStatus === "no_show") {
      if (reservaExistente.status !== "confirmada") {
         return NextResponse.json(
           { message: `Não é possível marcar como no-show. Status atual da reserva: '${reservaExistente.status}'.` },
           { status: 400 }
         );
      }
      // Um admin pode marcar como no-show mesmo um pouco antes se tiver certeza,
      // mas a lógica de liberação automática só considera após a tolerância.
    } else if (novoStatus === "cancelada_pelo_cliente") {
        // Permite cancelar se estiver confirmada ou até mesmo se já houve check-in (caso excepcional)
        if (!["confirmada", "check_in_realizado"].includes(reservaExistente.status)) {
            return NextResponse.json(
                { message: `Não é possível cancelar pelo cliente. Status atual da reserva: '${reservaExistente.status}'.` },
                { status: 400 }
            );
        }
    }


    const updatedReserva = await prisma.reserva.update({
      where: { id: reservaId },
      data: {
        status: novoStatus,
      },
      include: {
        mesa: true,
      },
    });

    return NextResponse.json(updatedReserva);

  } catch (error) {
    console.error(`Erro ao atualizar status da reserva ${reservaId}:`, error);
    if (error instanceof z.ZodError) {
        return NextResponse.json({ message: "Erro de validação interna", errors: error.errors }, { status: 400 });
    }
    // Adicionar PrismaClientKnownRequestError se quiser tratar erros específicos do Prisma
    // import { Prisma } from '@prisma/client';
    // if (error instanceof Prisma.PrismaClientKnownRequestError) { ... }
    return NextResponse.json({ message: "Erro interno ao atualizar status da reserva", errorDetails: String(error) }, { status: 500 });
  }
}