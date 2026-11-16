import { prisma } from '../db';
import type { PrismaClient } from '../generated/prisma/client';
import {
  horariosDoDia,
  somarMinutos,
  sobrepoe,
  pedidoExpirou,
  diaUtil,
  duracaoValida,
  fimDoExpediente,
  DURACAO_PEDIDO_MIN,
  HORA_ABERTURA,
} from './regras';

type Banco = Pick<PrismaClient, 'agendamento'>;

// Intervalos ocupados do sócio em um dia (pendentes que ainda valem + confirmados).
// ignorarId serve para não comparar um pedido com ele mesmo na hora de confirmar.
export async function ocupacoesDoDia(socioId: number, dia: Date, banco: Banco = prisma, ignorarId?: number) {
  const inicioDoDia = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate());
  const fimDoDia = somarMinutos(inicioDoDia, 24 * 60);

  const agendamentos = await banco.agendamento.findMany({
    where: {
      socioId,
      status: { in: ['PENDENTE', 'CONFIRMADO'] },
      inicio: { gte: inicioDoDia, lt: fimDoDia },
      ...(ignorarId ? { NOT: { id: ignorarId } } : {}),
    },
  });

  const agora = new Date();
  return agendamentos
    .filter((a) => !(a.status === 'PENDENTE' && pedidoExpirou(a.criadoEm, agora)))
    .map((a) => {
      const minutos = a.status === 'CONFIRMADO' ? (a.duracaoMinutos ?? DURACAO_PEDIDO_MIN) : DURACAO_PEDIDO_MIN;
      return { inicio: a.inicio, fim: somarMinutos(a.inicio, minutos) };
    });
}

export async function horariosLivres(socioId: number, dia: Date, banco: Banco = prisma): Promise<Date[]> {
  const ocupacoes = await ocupacoesDoDia(socioId, dia, banco);
  const agora = new Date();

  return horariosDoDia(dia).filter((h) => {
    const fim = somarMinutos(h, DURACAO_PEDIDO_MIN);
    return h.getTime() > agora.getTime() && !ocupacoes.some((o) => sobrepoe(h, fim, o.inicio, o.fim));
  });
}

export async function pedirReuniao(
  clienteId: number,
  socioId: number,
  inicio: Date,
  assunto: string,
  tipo: 'ONLINE' | 'PRESENCIAL',
): Promise<'ok' | 'conflito'> {
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

// Sócio registra uma reunião pedida por e-mail ou telefone: já entra como CONFIRMADO (RF03).
export async function registrarReuniao(
  socioId: number,
  clienteId: number,
  inicio: Date,
  duracao: number,
  assunto: string,
  tipo: 'ONLINE' | 'PRESENCIAL',
): Promise<'ok' | 'invalido' | 'conflito'> {
  const fim = somarMinutos(inicio, duracao);
  if (
    !duracaoValida(duracao) ||
    !diaUtil(inicio) ||
    inicio.getMinutes() !== 0 ||
    inicio.getHours() < HORA_ABERTURA ||
    fim > fimDoExpediente(inicio) ||
    inicio.getTime() <= Date.now()
  ) {
    return 'invalido';
  }

  return prisma.$transaction(async (tx): Promise<'ok' | 'invalido' | 'conflito'> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${socioId}::bigint)`;

    const cliente = await tx.usuario.findFirst({ where: { id: clienteId, perfil: 'CLIENTE' } });
    if (!cliente) return 'invalido';

    const ocupacoes = await ocupacoesDoDia(socioId, inicio, tx);
    if (ocupacoes.some((o) => sobrepoe(inicio, fim, o.inicio, o.fim))) {
      return 'conflito';
    }

    await tx.agendamento.create({
      data: { inicio, duracaoMinutos: duracao, assunto, tipo, status: 'CONFIRMADO', clienteId, socioId },
    });
    return 'ok';
  });
}
