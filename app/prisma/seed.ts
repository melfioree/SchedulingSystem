import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function main() {
  const senha = process.env.SENHA_SOCIOS;
  if (!senha || senha.length < 8) {
    throw new Error('Defina SENHA_SOCIOS (mínimo 8 caracteres) no .env');
  }
  const senhaHash = await bcrypt.hash(senha, 10);

  const socios = [
    { nome: 'Paulo', email: 'ana.socia@exemplo.com' },
    { nome: '', email: 'bruno.socio@exemplo.com' },
  ];

  for (const socio of socios) {
    await prisma.usuario.upsert({
      where: { email: socio.email },
      update: {},
      create: { ...socio, senhaHash, perfil: 'SOCIO' },
    });
  }

  console.log('Sócios prontos:', socios.map((s) => s.email).join(', '));
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());