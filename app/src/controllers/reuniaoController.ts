import { Request, Response } from 'express';
import {
  listarReunioes,
  cancelarReuniao,
  confirmarPedido,
  recusarPedido,
  listarClientes,
} from '../models/reuniaoService';
import { registrarReuniao } from '../models/agendamentoService';
import { pedidoExpirou, lerDia, horariosDoDia, DURACOES_MIN } from '../models/regras';

type Mensagem = { tipo: 'success' | 'danger'; texto: string };

const MENSAGENS: Record<string, Mensagem> = {
  cancelada: { tipo: 'success', texto: 'Reunião cancelada. O horário foi liberado.' },
  'nao-cancelada': { tipo: 'danger', texto: 'Não foi possível cancelar esta reunião.' },
  confirmada: { tipo: 'success', texto: 'Pedido confirmado. O cliente verá a reunião como confirmada.' },
  recusada: { tipo: 'success', texto: 'Pedido recusado. O horário foi liberado.' },
  'pedido-indisponivel': { tipo: 'danger', texto: 'Esse pedido não está mais pendente.' },
  duracao: { tipo: 'danger', texto: 'Duração inválida: o máximo é 2 horas e a reunião deve terminar até as 18h.' },
  conflito: { tipo: 'danger', texto: 'Este horário não está mais disponível: a duração escolhida invade outra reunião.' },
  registrada: { tipo: 'success', texto: 'Reunião registrada como confirmada.' },
  'registro-invalido': { tipo: 'danger', texto: 'Dados inválidos. Confira cliente, dia útil, horário e duração.' },
};

const ABAS = ['pendentes', 'agenda', 'registrar'];

export async function mostrarReunioes(req: Request, res: Response) {
  try {
    const usuario = req.session.usuario!;
    const eSocio = usuario.perfil === 'SOCIO';
    const agora = new Date();

    const itens = (await listarReunioes(usuario)).map((r) => {
      const expirou = r.status === 'PENDENTE' && pedidoExpirou(r.criadoEm, agora);
      const ativa = r.status === 'PENDENTE' || r.status === 'CONFIRMADO';
      return {
        ...r,
        statusExibido: expirou ? 'EXPIRADO' : r.status,
        podeCancelar: ativa && !expirou && r.inicio > agora,
      };
    });

    const proximas = itens
      .filter((r) => r.inicio >= agora)
      .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
    const anteriores = itens.filter((r) => r.inicio < agora);

    // Pedidos que o sócio ainda pode responder: pendentes, futuros e dentro do prazo.
    const pendentes = eSocio
      ? itens
          .filter((r) => r.status === 'PENDENTE' && r.statusExibido === 'PENDENTE' && r.inicio > agora)
          .sort((a, b) => a.inicio.getTime() - b.inicio.getTime())
      : [];

    const abaPedida = String(req.query.aba || '');
    const aba = ABAS.includes(abaPedida) ? abaPedida : pendentes.length > 0 ? 'pendentes' : 'agenda';

    res.render('reunioes', {
      eSocio,
      aba,
      proximas,
      anteriores,
      pendentes,
      clientes: eSocio ? await listarClientes() : [],
      horasInicio: horariosDoDia(agora).map((h) => h.getHours()),
      duracoes: DURACOES_MIN,
      msg: MENSAGENS[String(req.query.msg || '')] ?? null,
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao carregar as reuniões.');
  }
}

export async function cancelar(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const usuario = req.session.usuario!;
    const cancelada = Number.isInteger(id) && (await cancelarReuniao(id, usuario));
    const aba = usuario.perfil === 'SOCIO' ? '&aba=agenda' : '';
    res.redirect('/reunioes?msg=' + (cancelada ? 'cancelada' : 'nao-cancelada') + aba);
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao cancelar a reunião.');
  }
}

export async function responder(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    const socioId = req.session.usuario!.id;
    const volta = (msg: string) => res.redirect('/reunioes?aba=pendentes&msg=' + msg);

    if (!Number.isInteger(id)) return volta('pedido-indisponivel');

    if (req.body.acao === 'recusar') {
      return volta((await recusarPedido(socioId, id)) ? 'recusada' : 'pedido-indisponivel');
    }

    const resultado = await confirmarPedido(socioId, id, Number(req.body.duracao));
    const mensagens = {
      ok: 'confirmada',
      indisponivel: 'pedido-indisponivel',
      duracao: 'duracao',
      conflito: 'conflito',
    };
    return volta(mensagens[resultado]);
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao responder o pedido.');
  }
}

export async function registrar(req: Request, res: Response) {
  try {
    const socioId = req.session.usuario!.id;
    const clienteId = Number(req.body.cliente) || 0;
    const dia = lerDia(String(req.body.dia || ''));
    const hora = Number(req.body.hora);
    const duracao = Number(req.body.duracao);
    const assunto = String(req.body.assunto || '').trim();
    const tipo = req.body.tipo === 'PRESENCIAL' ? 'PRESENCIAL' : 'ONLINE';

    if (!clienteId || !dia || !Number.isInteger(hora) || !assunto || assunto.length > 200) {
      return res.redirect('/reunioes?aba=registrar&msg=registro-invalido');
    }

    const inicio = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), hora);
    const resultado = await registrarReuniao(socioId, clienteId, inicio, duracao, assunto, tipo);

    if (resultado === 'ok') return res.redirect('/reunioes?aba=agenda&msg=registrada');
    const msg = resultado === 'conflito' ? 'conflito' : 'registro-invalido';
    res.redirect('/reunioes?aba=registrar&msg=' + msg);
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao registrar a reunião.');
  }
}
