import { Request, Response } from 'express';
import { prisma } from '../db';
import { lerDia, diaUtil } from '../models/regras';
import { horariosLivres, pedirReuniao } from '../models/agendamentoService';

const MENSAGENS: Record<string, { tipo: 'success' | 'danger'; texto: string }> = {
  ok: { tipo: 'success', texto: 'Pedido enviado! O sócio vai responder em breve.' },
  conflito: { tipo: 'danger', texto: 'Esse horário acabou de ser ocupado. Escolha outro.' },
  invalido: { tipo: 'danger', texto: 'Dados inválidos. Tente novamente.' },
};

export async function mostrarAgendar(req: Request, res: Response) {
  try {
    const socios = await prisma.usuario.findMany({
      where: { perfil: 'SOCIO' },
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    });

    const socioId = Number(req.query.socio) || 0;
    const diaTexto = String(req.query.dia || '');
    let horarios: Date[] | null = null;
    let erro: string | null = null;

    if (socioId && diaTexto) {
      const dia = lerDia(diaTexto);
      if (!dia) {
        erro = 'Data inválida.';
      } else if (!diaUtil(dia)) {
        erro = 'As reuniões acontecem apenas em dias úteis.';
      } else if (!socios.some((s) => s.id === socioId)) {
        erro = 'Sócio não encontrado.';
      } else {
        horarios = await horariosLivres(socioId, dia);
      }
    }

    const msg = MENSAGENS[String(req.query.msg || '')] ?? null;
    res.render('agendar', { socios, socioId, dia: diaTexto, horarios, erro, msg });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao carregar a agenda.');
  }
}

export async function pedirAgendamento(req: Request, res: Response) {
  try {
    const clienteId = req.session.usuario!.id;
    const socioId = Number(req.body.socio) || 0;
    const inicio = new Date(String(req.body.inicio || ''));
    const assunto = String(req.body.assunto || '').trim();
    const tipo = req.body.tipo === 'PRESENCIAL' ? 'PRESENCIAL' : 'ONLINE';   

    const socio = socioId
      ? await prisma.usuario.findFirst({ where: { id: socioId, perfil: 'SOCIO' } })
      : null;

    if (!socio || isNaN(inicio.getTime()) || !assunto || assunto.length > 200) {
      return res.redirect('/agendar?msg=invalido');
    }

    const resultado = await pedirReuniao(clienteId, socioId, inicio, assunto, tipo);
    const dia = inicio.toLocaleDateString('en-CA'); // formato AAAA-MM-DD
    res.redirect(`/agendar?socio=${socioId}&dia=${dia}&msg=${resultado}`);
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao registrar o pedido.');
  }
}