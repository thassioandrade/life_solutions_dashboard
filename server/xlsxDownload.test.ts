import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { criarPlanilhaExcel } from "../client/src/lib/xlsxDownload";

describe("criarPlanilhaExcel", () => {
  it("preserva os dados e o nome da aba no arquivo XLSX", () => {
    const workbook = criarPlanilhaExcel([
      { "Nome do Cliente": "Ana Souza", "CPF/CNPJ": "123.456.789-00", Serviço: "Limpa Nome" },
    ], "Limpa Nome");

    expect(workbook.SheetNames).toEqual(["Limpa Nome"]);

    const worksheet = workbook.Sheets["Limpa Nome"];
    expect(XLSX.utils.sheet_to_json(worksheet)).toEqual([
      { "Nome do Cliente": "Ana Souza", "CPF/CNPJ": "123.456.789-00", Serviço: "Limpa Nome" },
    ]);
    expect(worksheet["!cols"]).toBeDefined();
  });
});
