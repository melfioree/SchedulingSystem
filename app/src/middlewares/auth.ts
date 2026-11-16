import { Request, Response, NextFunction } from 'express';

type Perfil = 'CLIENTE' | 'SOCIO';

export function exigirLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }
  next();
}

export function exigirPerfil(perfil: Perfil) {
  return (req: Request, res: Response, next: NextFunction) => {
    const usuario = req.session.usuario;
    if (!usuario) {
      return res.redirect('/login');
    }
    if (usuario.perfil !== perfil) {
      return res.status(403).send('Acesso negado.');
    }
    next();
  };
}