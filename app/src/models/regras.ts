import { createHash, timingSafeEqual } from 'crypto';
import type { TipoReuniao } from '../generated/prisma/enums';

export function cpfValido(cpf: string): boolean {
  const numeros = cpf.replace(/\D/g, '');

  if (numeros.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numeros)) return false;

  function calcularDigito(base: string, pesoInicial: number): number {
    let soma = 0;
    for (let i = 0; i < base.length; i++) {
      soma += Number(base[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  }

  const digito1 = calcularDigito(numeros.slice(0, 9), 10);
  const digito2 = calcularDigito(numeros.slice(0, 10), 11);

  return digito1 === Number(numeros[9]) && digito2 === Number(numeros[10]);
}

export function codigosIguais(informado: string, esperado: string): boolean {
  const a = createHash('sha256').update(informado).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

export const HORA_ABERTURA = 8;
const HORA_FECHAMENTO = 18;
export const DURACAO_PEDIDO_MIN = 60;

export function lerDia(texto: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return null;
  const ano = Number(m[1]), mes = Number(m[2]), dia = Number(m[3]);
  const data = new Date(ano, mes - 1, dia);
  if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) return null;
  return data;
}

export function diaUtil(data: Date): boolean {
  const d = data.getDay(); // 0=domingo, 6=sábado
  return d !== 0 && d !== 6;
}

export function horariosDoDia(dia: Date): Date[] {
  const lista: Date[] = [];
  for (let h = HORA_ABERTURA; h < HORA_FECHAMENTO; h++) {
    lista.push(new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), h));
  }
  return lista;
}

export function somarMinutos(data: Date, minutos: number): Date {
  return new Date(data.getTime() + minutos * 60000);
}

// dois intervalos [aIni, aFim) e [bIni, bFim) se sobrepõem?
export function sobrepoe(aIni: Date, aFim: Date, bIni: Date, bFim: Date): boolean {
  return aIni < bFim && bIni < aFim;
}

function adicionarDiasUteis(data: Date, quantidade: number): Date {
  const r = new Date(data);
  let falta = quantidade;
  while (falta > 0) {
    r.setDate(r.getDate() + 1);
    if (diaUtil(r)) falta--;
  }
  return r;
}

export function pedidoExpirou(criadoEm: Date, agora: Date = new Date()): boolean {
  return agora >= adicionarDiasUteis(criadoEm, 2);
}

export const DURACOES_MIN = [30, 60, 90, 120];

export function duracaoValida(minutos: number): boolean {
  return DURACOES_MIN.includes(minutos);
}

export function fimDoExpediente(dia: Date): Date {
  return new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), HORA_FECHAMENTO);
}

export const ASSUNTO_MAX = 100;

export function formatarTelefone(digitos: string | null): string {
  if (!digitos) return '';
  if (digitos.length === 11) return digitos.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  if (digitos.length === 10) return digitos.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  return digitos;
}

export function lerTipo(valor: unknown): TipoReuniao {
  return valor === 'PRESENCIAL' ? 'PRESENCIAL' : 'ONLINE';
}

const ROTULOS_DURACAO: Record<number, string> = {
  30: '30 minutos',
  60: '1 hora',
  90: '1 hora e 30 minutos',
  120: '2 horas',
};

export function rotuloDuracao(minutos: number): string {
  return ROTULOS_DURACAO[minutos] ?? minutos + ' minutos';
}

export function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR');
}

export function formatarHora(data: Date): string {
  return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatarDiaISO(data: Date): string {
  return data.toLocaleDateString('en-CA');
}
