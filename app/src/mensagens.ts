type Mensagem = { tipo: 'success' | 'danger'; texto: string };

const MENSAGENS: Record<string, Mensagem> = {
  perfil: { tipo: 'success', texto: 'Dados salvos.' },
  pedido: { tipo: 'success', texto: 'Pedido enviado. O sócio responde em até 2 dias úteis.' },
  invalido: { tipo: 'danger', texto: 'Dados inválidos. Confira os campos e tente novamente.' },
  'horario-ocupado': { tipo: 'danger', texto: 'Esse horário não está mais disponível. Escolha outro.' },
  cancelada: { tipo: 'success', texto: 'Reunião cancelada. O horário foi liberado.' },
  'nao-cancelada': { tipo: 'danger', texto: 'Não foi possível cancelar esta reunião.' },
  confirmada: { tipo: 'success', texto: 'Pedido confirmado. A reunião está na sua agenda.' },
  recusada: { tipo: 'success', texto: 'Pedido recusado. O horário foi liberado.' },
  'pedido-indisponivel': { tipo: 'danger', texto: 'Esse pedido não está mais pendente.' },
  duracao: { tipo: 'danger', texto: 'Duração inválida. Escolha até 2 horas, terminando até as 18h.' },
  conflito: { tipo: 'danger', texto: 'Esse horário e duração batem com outra reunião. Escolha outro horário ou uma duração menor.' },
  registrada: { tipo: 'success', texto: 'Reunião registrada e confirmada.' },
  'registro-invalido': { tipo: 'danger', texto: 'Dados inválidos. Confira cliente, dia útil, horário e duração.' },
};

export function mensagemDe(chave: unknown): Mensagem | null {
  const nome = String(chave || '');
  return Object.hasOwn(MENSAGENS, nome) ? MENSAGENS[nome] : null;
}
