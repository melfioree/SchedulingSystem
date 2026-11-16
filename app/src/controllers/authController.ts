import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { cpfValido, codigosIguais } from '../models/regras';

type Tela = { titulo: string; acao: string; pedirCodigo: boolean };

const telaCliente: Tela = { titulo: 'Criar conta', acao: '/cadastro', pedirCodigo: false };
const telaSocio: Tela = { titulo: 'Cadastro de sócio', acao: '/cadastro-socio', pedirCodigo: true };

function codigoConvite(): string | null {
  const codigo = process.env.CODIGO_CONVITE_SOCIO ?? '';
  return codigo.length >= 32 ? codigo : null;
}

export function mostrarCadastroCliente(req: Request, res: Response) {
  res.render('cadastro', { ...telaCliente, erro: null, valores: {} });
}

export function mostrarCadastroSocio(req: Request, res: Response) {
  if (!codigoConvite()) {
    return res.status(404).send('Página indisponível.');
  }
  res.render('cadastro', { ...telaSocio, erro: null, valores: {} });
}

export async function cadastrarCliente(req: Request, res: Response) {
  return processarCadastro(req, res, 'CLIENTE', telaCliente);
}

export async function cadastrarSocio(req: Request, res: Response) {
  const esperado = codigoConvite();
  if (!esperado) {
    return res.status(404).send('Página indisponível.');
  }

  const informado = String(req.body.codigo || '');
  if (!codigosIguais(informado, esperado)) {
    const { nome, email, cpf } = req.body;
    return res.render('cadastro', {
      ...telaSocio,
      erro: 'Código de convite inválido.',
      valores: { nome, email, cpf },
    });
  }

  return processarCadastro(req, res, 'SOCIO', telaSocio);
}

export async function processarCadastro(req: Request, res: Response,   perfil: 'CLIENTE' | 'SOCIO', tela: Tela,) {
  const { nome, email, cpf, senha, confirmarSenha } = req.body;
  const valores = { nome, email, cpf }; //guarda so o que eh seguro devolver ao form se der erro
  const falhar = (erro: string) => res.render('cadastro', { ...tela, erro, valores });
  
  if (!nome || !email || !cpf || !senha) {
    return falhar('Preencha todos os campos.');
  }
  if (senha.length < 8) {
    return falhar('A senha precisa ter pelo menos 8 caracteres.');
  }
  if (senha !== confirmarSenha) {
    return falhar('As senhas não conferem.');
  }

  const emailLimpo = String(email).trim().toLowerCase();
  const cpfLimpo = String(cpf).replace(/\D/g, '');

  if (!cpfValido(cpfLimpo)) {
    return falhar('CPF inválido.');
  }

  try {
    const existe = await prisma.usuario.findFirst({
      where: { OR: [{ email: emailLimpo }, { cpf: cpfLimpo }] },
    });
    if (existe) {
      return falhar('E-mail ou CPF já cadastrado.');
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await prisma.usuario.create({
      data: { nome: String(nome).trim(), email: emailLimpo, cpf: cpfLimpo, senhaHash, perfil },
    });
    res.redirect('/login');
  } catch (erro: any) {
    if (erro.code === 'P2002') {
      return falhar('E-mail ou CPF já cadastrado.');
    }
    console.error(erro);
    res.status(500).send('Erro interno ao cadastrar.');
  }
}

const hashFalso = bcrypt.hashSync('senhaInexistente', 10);

export function mostrarLogin(req: Request, res: Response) {
  res.render('login', { erro: null });
}

export async function entrar(req: Request, res: Response) {
  const email = String(req.body.email || '').trim().toLowerCase();
  const senha = String(req.body.senha || '');

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } });

    const senhaCorreta = await bcrypt.compare(senha, usuario ? usuario.senhaHash : hashFalso);

    if (!usuario || !senhaCorreta) {
      return res.render('login', { erro: 'E-mail ou senha incorretos.' });
    }

    req.session.regenerate((falha) => {
      if (falha) {
        console.error(falha);
        return res.status(500).send('Erro interno ao entrar.');
      }
      req.session.usuario = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
      req.session.save(() => res.redirect('/painel'));
    });
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao entrar.');
  }
}

export function sair(req: Request, res: Response) {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
}