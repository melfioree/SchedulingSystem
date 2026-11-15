import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { cpfValido } from '../models/regras';

export function mostrarCadastro(req: Request, res: Response) {
  res.render('cadastro', { erro: null, valores: {} });
}

export async function cadastrar(req: Request, res: Response) {
  const { nome, email, cpf, senha, confirmarSenha } = req.body;
  const valores = { nome, email, cpf }; //guarda so o que eh seguro devolver ao form se der erro

  if (!nome || !email || !cpf || !senha) {
    return res.render('cadastro', { erro: 'Preencha todos os campos.', valores });
  }
  if (senha.length < 8) {
    return res.render('cadastro', { erro: 'A senha precisa ter pelo menos 8 caracteres.', valores });
  }
  if (senha !== confirmarSenha) {
    return res.render('cadastro', { erro: 'As senhas não conferem.', valores });
  }

  const emailLimpo = String(email).trim().toLowerCase();
  const cpfLimpo = String(cpf).replace(/\D/g, '');

  if (!cpfValido(cpfLimpo)) {
  return res.render('cadastro', { erro: 'CPF inválido.', valores });
  }

  try {
    const existe = await prisma.usuario.findFirst({
      where: { OR: [{ email: emailLimpo }, { cpf: cpfLimpo }] },
    });
    if (existe) {
      return res.render('cadastro', { erro: 'E-mail ou CPF já cadastrado.', valores });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await prisma.usuario.create({
      data: { nome: String(nome).trim(), email: emailLimpo, cpf: cpfLimpo, senhaHash },
    });
    res.redirect('/login');
  } catch (erro: any) {
    if (erro.code === 'P2002') {
      return res.render('cadastro', { erro: 'E-mail ou CPF já cadastrado.', valores });
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