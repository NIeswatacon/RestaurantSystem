// app/api/reservas/[id]/status/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const TOLERANCIA_ATRASO_MS = 15 * 60 * 1000; // 15 minutos

const updateStatusSchema = z.object({
  status: z.enum(["check_in_realizado", "no_show", "cancelada_pelo_cliente"]), // Status permitidos para atualização pelo admin/sistema
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const reservaId = params.id;

  try {
    const body = await request.json();
    const validation = updateStatusSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos", errors: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const novoStatus = validation.data.status;

    const reservaExistente = await prisma.reserva.findUnique({
      where: { id: reservaId },
    });

    if (!reservaExistente) {
      return NextResponse.json({ message: "Reserva não encontrada" }, { status: 404 });
    }

    // Lógica de negócio para mudança de status
    if (novoStatus === "check_in_realizado") {
      if (reservaExistente.status !== "confirmada") {
        return NextResponse.json({ message: `Não é possível fazer check-in de uma reserva com status '${reservaExistente.status}'` }, { status: 400 });
      }
      const agora = new Date();
      const limiteTolerancia = new Date(new Date(reservaExistente.dataHoraInicio).getTime() + TOLERANCIA_ATRASO_MS);
      if (agora > limiteTolerancia) {
        // Mesmo que o admin esteja tentando fazer check-in, se passou muito tempo, pode ser questionável.
        // Você pode decidir permitir ou não. Aqui, vamos permitir, mas logar ou avisar.
        console.warn(`Check-in realizado para reserva ${reservaId} após o tempo de tolerância.`);
      }
    } else if (novoStatus === "no_show") {
      if (reservaExistente.status !== "confirmada") {
         return NextResponse.json({ message: `Não é possível marcar como no-show uma reserva com status '${reservaExistente.status}'` }, { status: 400 });
      }
      // O admin pode marcar como no-show a qualquer momento se o cliente não veio,
      // mas o sistema considera "liberada" para novas reservas após a tolerância.
    }

    const updatedReserva = await prisma.reserva.update({
      where: { id: reservaId },
      data: { status: novoStatus },
      include: { mesa: true }
    });

    return NextResponse.json(updatedReserva);

  } catch (error) {
    console.error(`Erro ao atualizar status da reserva ${reservaId}:`, error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Erro de validação", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: "Erro interno ao atualizar status da reserva" }, { status: 500 });
  }
}