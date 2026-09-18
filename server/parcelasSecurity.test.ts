import { describe, expect, it } from "vitest";
import { coletadoAposExcluirParcela, podeGerenciarParcela } from "./parcelasSecurity";

describe("podeGerenciarParcela", () => {
  it("permite a administradores e à consultora dona da venda", () => {
    expect(podeGerenciarParcela({ isAdmin: true, consultorIdSessao: null, consultorIdVenda: 12 })).toBe(true);
    expect(podeGerenciarParcela({ isAdmin: false, consultorIdSessao: 12, consultorIdVenda: 12 })).toBe(true);
  });

  it("bloqueia a consultora de outra venda", () => {
    expect(podeGerenciarParcela({ isAdmin: false, consultorIdSessao: 12, consultorIdVenda: 13 })).toBe(false);
    expect(podeGerenciarParcela({ isAdmin: false, consultorIdSessao: null, consultorIdVenda: 12 })).toBe(false);
  });
});

describe("coletadoAposExcluirParcela", () => {
  it("estorna o valor efetivamente pago ao excluir uma parcela paga", () => {
    expect(coletadoAposExcluirParcela({
      valorColetadoAtual: "1.500,00",
      status: "pago",
      valorPago: "500.00",
      valor: "500.00",
    })).toBe(1000);
  });

  it("usa o valor original em pagamentos antigos sem valorPago e nunca deixa saldo negativo", () => {
    expect(coletadoAposExcluirParcela({
      valorColetadoAtual: "200.00",
      status: "pago",
      valorPago: null,
      valor: "500.00",
    })).toBe(0);
  });

  it("não muda o coletado quando a parcela ainda não foi paga", () => {
    expect(coletadoAposExcluirParcela({
      valorColetadoAtual: "750.00",
      status: "pendente",
      valorPago: null,
      valor: "500.00",
    })).toBe(750);
  });
});
