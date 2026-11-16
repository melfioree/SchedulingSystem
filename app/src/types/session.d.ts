import 'express-session';
import type { Perfil } from '../generated/prisma/enums';

declare module 'express-session' {
  interface SessionData {
    usuario?: { id: number; nome: string; perfil: Perfil };
  }
}