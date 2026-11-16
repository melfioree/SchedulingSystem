import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { formatarTelefone } from '../models/regras';
import { telaInicial } from '../middlewares/auth';

export async function mostrarPerfil(req: Request, res: Response) {
  const usuario = await prisma.usuario.findUnique({ where: { id: req.session.usuario!.id } });
  if (!usuario) {
    return res.redirect('/login');
  }
  res.render('perfil', {
    titulo: 'Editar perfil',
    inicio: telaInicial(usuario.perfil),
    conta: usuario,
    valores: { nome: usuario.nome, telefone: formatarTelefone(usuario.telefone) },
    erro: null,
  });
}

export async function salvarPerfil(req: Request, res: Response) {
  const nome = String(req.body.nome || '').trim();
  const telefone = String(req.body.telefone || '').replace(/\D/g, '');
  const senhaAtual = String(req.body.senhaAtual || '');
  const novaSenha = String(req.body.novaSenha || '');
  const confirmarSenha = String(req.body.confirmarSenha || '');

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: req.session.usuario!.id } });
    if (!usuario) {
      return res.redirect('/login');
    }

    const falhar = (erro: string) =>
      res.render('perfil', {
        titulo: 'Editar perfil',
        inicio: telaInicial(usuario.perfil),
        conta: usuario,
        valores: { nome, telefone: req.body.telefone || '' },
        erro,
      });

    if (!nome || nome.length > 100) {
      return falhar('Informe o nome (até 100 caracteres).');
    }
    if (telefone && telefone.length !== 10 && telefone.length !== 11) {
      return falhar('Telefone inválido. Use o DDD e o número, por exemplo (35) 99999-9999.');
    }
    if (!(await bcrypt.compare(senhaAtual, usuario.senhaHash))) {
      return falhar('Senha atual incorreta. Tente novamente.');
    }

    let senhaHash: string | undefined;
    if (novaSenha || confirmarSenha) {
      if (novaSenha.length < 8) {
        return falhar('A nova senha precisa ter pelo menos 8 caracteres.');
      }
      if (novaSenha !== confirmarSenha) {
        return falhar('A nova senha e a confirmação não conferem.');
      }
      senhaHash = await bcrypt.hash(novaSenha, 10);
    }

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { nome, telefone: telefone || null, ...(senhaHash ? { senhaHash } : {}) },
    });

    req.session.usuario!.nome = nome;
    req.session.save(() => res.redirect(telaInicial(usuario.perfil) + '?msg=perfil'));
  } catch (erro) {
    console.error(erro);
    res.status(500).send('Erro interno ao salvar o perfil.');
  }
}
