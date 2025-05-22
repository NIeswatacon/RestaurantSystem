// app/api/reservas/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma'; // Seu cliente Prisma de lib/prisma.ts
import { z } from 'zod';

const DURACAO_RESERVA_PADRAO_MS = 2 * 60 * 60 * 1000; // 2 horas como padrão
const TOLERANCIA_ATRASO_MS = 15 * 60 * 1000; // 15 minutos

// Esquema de validação para criar uma reserva
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

// Função helper para verificar se uma reserva "confirmada" pode ser considerada liberada por atraso
function isReservaLiberadaPorAtraso(reserva: { dataHoraInicio: Date, status: string }): boolean {
  if (reserva.status === "confirmada") {
    const agora = new Date();
    // Certifique-se que reserva.dataHoraInicio é um objeto Date
    const inicioReserva = new Date(reserva.dataHoraInicio);
    const limiteTolerancia = new Date(inicioReserva.getTime() + TOLERANCIA_ATRASO_MS);
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
    const whereClause: any = {}; // Usar 'any' temporariamente para flexibilidade ou criar um tipo mais específico
    const orderByClause: any = { dataHoraInicio: 'asc' };

    if (statusQuery) {
      whereClause.status = statusQuery;
    }

    if (dia) {
      // Validar formato do dia se necessário
      try {
        const dataSelecionada = new Date(`${dia}T00:00:00.000Z`); // Início do dia em UTC
        if (isNaN(dataSelecionada.getTime())) throw new Error("Data inválida");
        const proximoDia = new Date(dataSelecionada);
        proximoDia.setDate(dataSelecionada.getDate() + 1);

        whereClause.AND = [ // Garante que AND seja um array
          ...(whereClause.AND || []),
          { dataHoraInicio: { gte: dataSelecionada } },
          { dataHoraInicio: { lt: proximoDia } },
        ];
      } catch (e) {
        return NextResponse.json({ message: "Formato de dia inválido. Use YYYY-MM-DD." }, { status: 400 });
      }
    } else if (!incluirPassadas) {
      whereClause.dataHoraFim = { // Mostrar apenas reservas cujo fim ainda não passou
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

    // Adicionar campo virtual 'situacaoAdmin'
    const agora = new Date();
    reservas = reservas.map(reserva => {
      // Certifique-se que reserva.dataHoraInicio é um objeto Date
      const dataInicio = new Date(reserva.dataHoraInicio);
      const limiteTolerancia = new Date(dataInicio.getTime() + TOLERANCIA_ATRASO_MS);
      let situacaoAdmin = '';

      if (reserva.status === "confirmada") {
        if (agora > limiteTolerancia) {
          situacaoAdmin = "atrasada_pode_cancelar";
        } else if (agora >= dataInicio && agora <= limiteTolerancia) {
          situacaoAdmin = "pode_fazer_checkin";
        } else if (agora < dataInicio) {
          situacaoAdmin = "aguardando_horario";
        }
      } else if (reserva.status === "check_in_realizado") {
        situacaoAdmin = "checkin_concluido";
      } else {
        situacaoAdmin = reserva.status; // ex: no_show, cancelada_pelo_cliente
      }
      return { ...reserva, situacaoAdmin };
    });

    return NextResponse.json(reservas);
  } catch (error) {
    console.error("Erro ao buscar reservas:", error);
    return NextResponse.json({ message: "Erro ao buscar reservas", errorDetails: String(error) }, { status: 500 });
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
    // dataHoraInicioProposta será no fuso horário do servidor.
    const dataHoraInicioProposta = new Date(year, month - 1, day, hours, minutes);

    if (isNaN(dataHoraInicioProposta.getTime())) {
      return NextResponse.json({ message: "Formato de data ou hora inválido." }, { status: 400 });
    }
    if (dataHoraInicioProposta < new Date()) {
      // Permite um pequeno buffer para evitar erros por milissegundos de diferença
      const agoraMenosBuffer = new Date(new Date().getTime() - 60000); // 1 minuto de buffer
       if (dataHoraInicioProposta < agoraMenosBuffer) {
        return NextResponse.json({ message: "Não é possível fazer reservas para datas ou horas passadas." }, { status: 400 });
       }
    }

    const dataHoraFimProposta = new Date(dataHoraInicioProposta.getTime() + duracaoMs);

    const mesasComCapacidade = await prisma.mesa.findMany({
      where: {
        capacidade: { gte: pessoas },
      },
    });

    if (mesasComCapacidade.length === 0) {
      return NextResponse.json({ message: "Nenhuma mesa disponível com capacidade suficiente." }, { status: 409 });
    }

    let mesaAlocada = null;

    for (const mesa of mesasComCapacidade) {
      const reservasNaMesaPotencialmenteConflitantes = await prisma.reserva.findMany({
        where: {
            mesaId: mesa.id,
            status: { notIn: ["cancelada_pelo_cliente", "no_show"] }, // Ignora as que já foram explicitamente liberadas
            // Filtro de sobreposição básica para reduzir o número de reservas a serem verificadas em JS
            AND: [
                { dataHoraInicio: { lt: dataHoraFimProposta } },
                { dataHoraFim: { gt: dataHoraInicioProposta } },
            ]
        }
      });

      const conflitosReais = reservasNaMesaPotencialmenteConflitantes.filter(reservaExistente => {
        // Se a reserva existente já teve check-in, é um conflito.
        if (reservaExistente.status === "check_in_realizado") {
          return true;
        }
        // Se a reserva existente é "confirmada"
        if (reservaExistente.status === "confirmada") {
          // E já passou da tolerância de atraso, não é mais um conflito para uma *nova* reserva.
          if (isReservaLiberadaPorAtraso(reservaExistente)) {
            return false;
          }
          // Se está "confirmada" e dentro do tempo (ou antes), é um conflito.
          return true;
        }
        // Outros status não deveriam chegar aqui devido ao filtro `notIn` acima, mas por segurança:
        return false;
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