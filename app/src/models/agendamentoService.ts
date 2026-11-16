import { prisma } from '../db';
import type { PrismaClient } from '../generated/prisma/client';
import {
  horariosDoDia,
  somarMinutos,
  sobrepoe,
  pedidoExpirou,
  DURACAO_PEDIDO_MIN,
} from './regras';

type Banco = Pick<PrismaClient, 'agendamento'>;

export async function horariosLivres(socioId: number, dia: Date, banco: Banco = prisma): Promise<Date[]> {
  const horarios = horariosDoDia(dia);
  const inicioDoDia = horarios[0];
  const fimDoDia = somarMinutos(horarios[horarios.length - 1], DURACAO_PEDIDO_MIN);

  const agendamentos = await banco.agendamento.findMany({
    where: {
      socioId,
      status: { in: ['PENDENTE', 'CONFIRMADO'] },
      inicio: { gte: inicioDoDia, lt: fimDoDia },
    },
  });

  const ocupacoes = agendamentos
    .filter((a) => !(a.status === 'PENDENTE' && pedidoExpirou(a.criadoEm)))
    .map((a) => {
      const minutos = a.status === 'CONFIRMADO' ? (a.duracaoMinutos ?? DURACAO_PEDIDO_MIN) : DURACAO_PEDIDO_MIN;
      return { inicio: a.inicio, fim: somarMinutos(a.inicio, minutos) };
    });

  const agora = new Date();
  return horarios.filter((h) => {
    const fim = somarMinutos(h, DURACAO_PEDIDO_MIN);
    return h.getTime() > agora.getTime() && !ocupacoes.some((o) => sobrepoe(h, fim, o.inicio, o.fim));
  });
}

export async function pedirReuniao( clienteId: number, socioId: number, inicio: Date, assunto: string, tipo: 'ONLINE' | 'PRESENCIAL',): Promise<'ok' | 'conflito'> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${socioId}::bigint)`;

    const dia = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
    const livres = await horariosLivres(socioId, dia, tx);

    if (!livres.some((h) => h.getTime() === inicio.getTime())) {
      return 'conflito';
    }

    await tx.agendamento.create({
      data: { inicio, assunto, tipo, clienteId, socioId },
    });
    return 'ok';
  });
}