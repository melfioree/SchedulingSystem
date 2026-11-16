-- CreateEnum
CREATE TYPE "TipoReuniao" AS ENUM ('ONLINE', 'PRESENCIAL');

-- AlterTable
ALTER TABLE "Agendamento" ADD COLUMN     "tipo" "TipoReuniao" NOT NULL DEFAULT 'ONLINE';
