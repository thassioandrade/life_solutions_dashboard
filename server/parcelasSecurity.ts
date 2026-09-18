type RegraAcessoParcela = {
  isAdmin: boolean;
  consultorIdSessao: number | null | undefined;
  consultorIdVenda: number | null | undefined;
};

function valorMonetario(valor: unknown) {
  const texto = String(valor ?? 0).trim();
  const normalizado = texto.includes(",")
    ? texto.replace(/\./g, "").replace(",", ".")
    : texto;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : 0;
}

/** Permite que somente o administrador ou a consultora dona da venda altere a parcela. */
export function podeGerenciarParcela({ isAdmin, consultorIdSessao, consultorIdVenda }: RegraAcessoParcela) {
  if (isAdmin) return true;
  return consultorIdSessao !== null
    && consultorIdSessao !== undefined
    && consultorIdVenda !== null
    && consultorIdVenda !== undefined
    && consultorIdSessao === consultorIdVenda;
}

/** Retorna o coletado da venda após excluir uma parcela, sem permitir valor negativo. */
export function coletadoAposExcluirParcela({
  valorColetadoAtual,
  status,
  valorPago,
  valor,
}: {
  valorColetadoAtual: unknown;
  status: string;
  valorPago: unknown;
  valor: unknown;
}) {
  const coletadoAtual = valorMonetario(valorColetadoAtual);
  if (status !== "pago") return coletadoAtual;

  const baixaRegistrada = valorPago === null || valorPago === undefined
    ? valorMonetario(valor)
    : valorMonetario(valorPago);

  return Math.max(0, coletadoAtual - baixaRegistrada);
}
