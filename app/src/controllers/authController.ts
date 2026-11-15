import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';

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