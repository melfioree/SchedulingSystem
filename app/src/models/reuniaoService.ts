import { prisma } from '../db';
import {
  somarMinutos,
  sobrepoe,
  pedidoExpirou,
  duracaoValida,
  fimDoExpediente,
} from './regras';
import { ocupacoesDoDia } from './agendamentoService';

type Usuario = { id: number; perfil: 'CLIENTE' | 'SOCIO' };

// Cada usuário só enxerga as próprias reuniões (RF05).
function doUsuario(usuario: Usuario) {
  return usuario.perfil === 'SOCIO' ? { socioId: usuario.id } : { clienteId: usuario.id };
}

export async function listarReunioes(usuario: Usuario) {
  return prisma.agendamento.findMany({
    where: doUsuario(usuario),
    orderBy: { inicio: 'desc' },
    include: {
      cliente: { select: { nome: true } },
      socio: { select: { nome: true } },
    },
  });
}

export async function cancelarReuniao(id: number, usuario: Usuario): Promise<boolean> {
  const resultado = await prisma.agendamento.updateMany({
    where: {
      id,
      ...doUsuario(usuario),
      status: { in: ['PENDENTE', 'CONFIRMADO'] },
      inicio: { gt: new Date() },
    },
    data: { status: 'CANCELADO' },
  });
  return resultado.count === 1;
}

export type RespostaPedido = 'ok' | 'indisponivel' | 'duracao' | 'conflito';

// Sócio confirma um pedido pendente definindo a duração (RF04).
export async function confirmarPedido(socioId: number, id: number, duracao: number): Promise<RespostaPedido> {
  if (!duracaoValida(duracao)) return 'duracao';

  return prisma.$transaction(async (tx): Promise<RespostaPedido> => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${socioId}::bigint)`;

    const pedido = await tx.agendamento.findFirst({
      where: { id, socioId, status: 'PENDENTE', inicio: { gt: new Date() } },
    });
    if (!pedido || pedidoExpirou(pedido.criadoEm)) return 'indisponivel';

    const fim = somarMinutos(pedido.inicio, duracao);
    if (fim > fimDoExpediente(pedido.inicio)) return 'duracao';

    const ocupacoes = await ocupacoesDoDia(socioId, pedido.inicio, tx, id);
    if (ocupacoes.some((o) => sobrepoe(pedido.inicio, fim, o.inicio, o.fim))) return 'conflito';

    await tx.agendamento.update({
      where: { id },
      data: { status: 'CONFIRMADO', duracaoMinutos: duracao },
    });
    return 'ok';
  });
}

export async function recusarPedido(socioId: number, id: number): Promise<boolean> {
  const resultado = await prisma.agendamento.updateMany({
    where: { id, socioId, status: 'PENDENTE' },
    data: { status: 'RECUSADO' },
  });
  return resultado.count === 1;
}

export async function listarClientes() {
  return prisma.usuario.findMany({
    where: { perfil: 'CLIENTE' },
    select: { id: true, nome: true, email: true },
    orderBy: { nome: 'asc' },
  });
}
