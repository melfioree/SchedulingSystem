import { Request, Response } from 'express';
import { prisma } from '../db';
import { lerDia, diaUtil, lerTipo, formatarHora, formatarDiaISO, ASSUNTO_MAX } from '../models/regras';
import { horariosLivres, pedirReuniao } from '../models/agendamentoService';
import { mensagemDe } from '../mensagens';

export async function mostrarAgendar(req: Request, res: Response) {
  try {
    const socios = await prisma.usuario.findMany({
      where: { perfil: 'SOCIO' },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    res.render('agendar', {
      socios,
      socioId: Number(req.query.socio) || 0,
      dia: String(req.query.dia || ''),
      tipo: lerTipo(req.query.tipo),
      hoje: formatarDiaISO(new Date()),
      assuntoMax: ASSUNTO_MAX,
      msg: mensagemDe(req.query.msg),
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao carregar a agenda.');
  }
}

export async function listarHorarios(req: Request, res: Response) {
  try {
    const socioId = Number(req.query.socio) || 0;
    const dia = lerDia(String(req.query.dia || ''));

    if (!socioId || !dia) {
      return res.json({ horarios: [], aviso: '' });
    }
    if (!diaUtil(dia)) {
      return res.json({ horarios: [], aviso: 'As reuniões acontecem apenas em dias úteis.' });
    }

    const socio = await prisma.usuario.findFirst({ where: { id: socioId, perfil: 'SOCIO' } });
    if (!socio) {
      return res.json({ horarios: [], aviso: 'Sócio não encontrado.' });
    }

    const livres = await horariosLivres(socioId, dia);
    res.json({
      horarios: livres.map((h) => ({
        inicio: h.toISOString(),
        rotulo: formatarHora(h),
      })),
      aviso: livres.length === 0 ? 'Não há horários livres neste dia.' : '',
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ horarios: [], aviso: 'Erro ao carregar os horários.' });
  }
}

export async function pedirAgendamento(req: Request, res: Response) {
  try {
    const clienteId = req.session.usuario!.id;
    const socioId = Number(req.body.socio) || 0;
    const inicio = new Date(String(req.body.inicio || ''));
    const assunto = String(req.body.assunto || '').trim();
    const tipo = lerTipo(req.body.tipo);

    const socio = socioId
      ? await prisma.usuario.findFirst({ where: { id: socioId, perfil: 'SOCIO' } })
      : null;

    if (!socio || isNaN(inicio.getTime()) || !assunto || assunto.length > ASSUNTO_MAX) {
      return res.redirect('/agendar?msg=invalido');
    }

    const resultado = await pedirReuniao(clienteId, socioId, inicio, assunto, tipo);
    if (resultado === 'ok') {
      return res.redirect('/reunioes?msg=pedido');
    }
    const dia = formatarDiaISO(inicio);
    res.redirect(`/agendar?socio=${socioId}&dia=${dia}&tipo=${tipo}&msg=horario-ocupado`);
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao registrar o pedido.');
  }
}