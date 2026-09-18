import * as XLSX from "xlsx";

export type ExcelRow = Record<string, string | number | boolean | null | undefined>;

function larguraColunas(rows: ExcelRow[]) {
  const headers = Object.keys(rows[0] ?? {});

  return headers.map((header) => {
    const largestValue = rows.reduce((largest, row) => {
      const value = row[header];
      return Math.max(largest, String(value ?? "").length);
    }, header.length);

    return { wch: Math.min(Math.max(largestValue + 2, 12), 36) };
  });
}

/** Cria uma planilha formatada a partir das linhas visíveis no painel. */
export function criarPlanilhaExcel(rows: ExcelRow[], sheetName: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = larguraColunas(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return workbook;
}

/**
 * Gera um arquivo XLSX no momento do clique. O Blob com link de download evita
 * o comportamento inconsistente de XLSX.writeFile em navegadores móveis.
 */
export async function baixarPlanilhaExcel(rows: ExcelRow[], sheetName: string, fileName: string) {
  const workbook = criarPlanilhaExcel(rows, sheetName);
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  const blob = new Blob([bytes as ArrayBuffer], { type });

  const file = new File([blob], fileName, { type });
  const canShareFile = typeof navigator !== "undefined"
    && typeof navigator.canShare === "function"
    && navigator.canShare({ files: [file] });

  if (canShareFile) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      // Se o compartilhamento nativo falhar, o download padrão abaixo é usado.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
