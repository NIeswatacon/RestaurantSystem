// app/api/reservas/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Certifique-se que este import está funcionando
import { z } from 'zod';

const DURACAO_RESERVA_PADRAO_MS = 2 * 60 * 60 * 1000; // 2 horas
const TOLERANCIA_ATRASO_MS = 15 * 60 * 1000; // 15 minutos

const criarReservaSchema = z.object({
  nome: z.string().min(1, { message: "Nome é obrigatório" }),
  data: z.string().refine((val) => {
    try {
      const dateObj = new Date(val);
      return !isNaN(dateObj.getTime()) && dateObj.getFullYear() > 1900 && dateObj.getFullYear() < 2100;
    } catch (e) {
      return false;
    }
  }, { message: "Data inválida. Use o formato YYYY-MM-DD." }),
  hora: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "Hora inválida (formato HH:MM)" }),
  pessoas: z.coerce.number().int().positive({ message: "Número de pessoas deve ser um inteiro positivo" }),
});

// Helper para verificar se uma reserva pode ser considerada "liberada" por atraso
function isReservaLiberadaPorAtraso(reserva: { dataHoraInicio: Date, status: string }): boolean {
  if (reserva.status === "confirmada") {
    const agora = new Date();
    const limiteTolerancia = new Date(new Date(reserva.dataHoraInicio).getTime() + TOLERANCIA_ATRASO_MS);
    if (agora > limiteTolerancia) {
      return true; // Passou da tolerância e não houve check-in
    }
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const statusQuery = searchParams.get('status');
  const dia = searchParams.get('dia'); // Formato YYYY-MM-DD
  const incluirPassadas = searchParams.get('incluirPassadas') === 'true';

  try {
    const whereClause: any = {};
    const orderByClause: any = { dataHoraInicio: 'asc' };

    if (statusQuery) {
      whereClause.status = statusQuery;
    }

    if (dia) {
      const dataSelecionada = new Date(`${dia}T00:00:00.000Z`);
      const proximoDia = new Date(dataSelecionada);
      proximoDia.setDate(dataSelecionada.getDate() + 1);
      whereClause.dataHoraInicio = {
        gte: dataSelecionada,
        lt: proximoDia,
      };
    } else if (!incluirPassadas) {
      // Por padrão, não inclui reservas que já terminaram completamente,
      // a menos que 'incluirPassadas' seja true ou um dia específico seja consultado.
      whereClause.dataHoraFim = {
        gte: new Date()
      };
    }

    let reservas = await prisma.reserva.findMany({
      where: whereClause,
      include: {
        mesa: true,
      },
      orderBy: orderByClause,
    });

    // Adicionar um campo virtual para indicar se está "atrasada e pendente de cancelamento"
    // ou se o admin pode fazer check-in.
    // Este campo é para o frontend exibir a informação, não altera o BD aqui.
    const agora = new Date();
    reservas = reservas.map(reserva => {
      const limiteTolerancia = new Date(new Date(reserva.dataHoraInicio).getTime() + TOLERANCIA_ATRASO_MS);
      let situacaoAdmin = '';
      if (reserva.status === "confirmada") {
        if (agora > limiteTolerancia) {
          situacaoAdmin = "atrasada_pode_cancelar"; // Cliente muito atrasado
        } else if (agora >= reserva.dataHoraInicio && agora <= limiteTolerancia) {
          situacaoAdmin = "pode_fazer_checkin"; // Dentro do horário ou pouca tolerância
        }
      }
      return { ...reserva, situacaoAdmin };
    });


    return NextResponse.json(reservas);
  } catch (error) {
    console.error("Erro ao buscar reservas:", error);
    return NextResponse.json({ message: "Erro ao buscar reservas" }, { status: 500 });
  }
}


export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = criarReservaSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return NextResponse.json({ message: "Dados inválidos", errors }, { status: 400 });
    }

    const { nome, data: dataString, hora, pessoas } = validation.data;
    const duracaoMs = DURACAO_RESERVA_PADRAO_MS;

    const [year, month, day] = dataString.split('-').map(Number);
    const [hours, minutes] = hora.split(':').map(Number);
    const dataHoraInicioProposta = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(dataHoraInicioProposta.getTime())) {
      return NextResponse.json({ message: "Formato de data ou hora inválido." }, { status: 400 });
    }
    if (dataHoraInicioProposta < new Date()) {
      return NextResponse.json({ message: "Não é possível fazer reservas para datas ou horas passadas." }, { status: 400 });
    }

    const dataHoraFimProposta = new Date(dataHoraInicioProposta.getTime() + duracaoMs);

    const mesasComCapacidade = await prisma.mesa.findMany({
      where: {
        capacidade: { gte: pessoas },
      },
      include: { // Incluir reservas para poder filtrar em JS se necessário (embora o ideal seja no BD)
        reservas: {
          where: {
            // Pré-filtro básico para reduzir dados trafegados
            // Considera apenas reservas que poderiam colidir com a data proposta
            status: { notIn: ["cancelada_pelo_cliente", "no_show"] }, // Status que definitivamente liberam a mesa
            dataHoraInicio: { lt: dataHoraFimProposta },
            dataHoraFim: { gt: dataHoraInicioProposta },
          }
        }
      }
    });

    if (mesasComCapacidade.length === 0) {
      return NextResponse.json({ message: "Nenhuma mesa disponível com capacidade suficiente." }, { status: 409 });
    }

    let mesaAlocada = null;

    for (const mesa of mesasComCapacidade) {
      // Verificar as reservas existentes para ESTA mesa específica
      const reservasAtivasDaMesa = await prisma.reserva.findMany({
        where: {
            mesaId: mesa.id,
            // Status que ocupam a mesa
            status: { in: ["confirmada", "check_in_realizado"] },
            // Condição de sobreposição de horários
            AND: [
                { dataHoraInicio: { lt: dataHoraFimProposta } },
                { dataHoraFim: { gt: dataHoraInicioProposta } },
            ]
        }
      });

      // Agora, a parte "inteligente": se uma reserva é 'confirmada' mas já passou da tolerância,
      // ela não deve ser considerada um conflito para uma *nova* reserva.
      const conflitosReais = reservasAtivasDaMesa.filter(reservaExistente => {
        if (reservaExistente.status === "check_in_realizado") {
          return true; // Se já tem check-in, ocupa a mesa.
        }
        if (reservaExistente.status === "confirmada") {
          if (isReservaLiberadaPorAtraso(reservaExistente)) {
            // O admin ainda não cancelou, mas para fins de NOVA reserva, consideramos liberada.
            // O ideal seria o admin atualizar o status para "no_show".
            return false; // Não é um conflito real para *esta nova* reserva.
          }
          return true; // 'confirmada' e dentro do tempo, ocupa a mesa.
        }
        return false; // Outros status não considerados conflito aqui.
      });

      if (conflitosReais.length === 0) {
        mesaAlocada = mesa;
        break;
      }
    }

    if (!mesaAlocada) {
      return NextResponse.json({ message: "Nenhuma mesa disponível para o horário e capacidade solicitados devido a conflitos." }, { status: 409 });
    }

    const novaReserva = await prisma.reserva.create({
      data: {
        nome,
        pessoas,
        mesaId: mesaAlocada.id,
        dataHoraInicio: dataHoraInicioProposta,
        dataHoraFim: dataHoraFimProposta,
        status: "confirmada",
      },
      include: { mesa: true },
    });

    return NextResponse.json(novaReserva, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar reserva:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Erro de validação", errors: error.flatten().fieldErrors }, { status: 400 });
    }
    return NextResponse.json({ message: "Erro interno ao criar reserva", errorDetails: String(error) }, { status: 500 });
  }
}