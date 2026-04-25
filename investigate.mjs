import { getDb } from './server/db.ts';
import { sql } from 'drizzle-orm';

const db = await getDb();
if (!db) { console.log("DB not available"); process.exit(1); }

// 1. Parcelas duplicadas (mesmo numeroParcela na mesma venda)
console.log("=== PARCELAS DUPLICADAS ===");
const dups = await db.execute(sql`
  SELECT p.vendaId, p.numeroParcela, COUNT(*) as qtd, 
    GROUP_CONCAT(p.id ORDER BY p.id) as ids, 
    GROUP_CONCAT(p.valor ORDER BY p.id) as valores,
    GROUP_CONCAT(p.status ORDER BY p.id) as statuses,
    v.clienteNome
  FROM parcelas p
  JOIN vendas v ON v.id = p.vendaId
  GROUP BY p.vendaId, p.numeroParcela
  HAVING COUNT(*) > 1
  ORDER BY p.vendaId, p.numeroParcela
`);
console.log(JSON.stringify(dups.rows || dups, null, 2));

// 2. Vendas com parcelas — verificar inconsistências
console.log("\n=== VENDAS COM PARCELAS (resumo de inconsistências) ===");
const vendas = await db.execute(sql`
  SELECT v.id, v.clienteNome, v.consultorId,
    CAST(v.valorFaturado AS CHAR) as valorFaturado, 
    CAST(v.valorColetado AS CHAR) as valorColetado, 
    v.parcelasRestantes,
    COUNT(p.id) as totalParcelas,
    CAST(SUM(CASE WHEN p.status = 'pago' THEN p.valorPago ELSE 0 END) AS CHAR) as totalPago,
    CAST(SUM(CASE WHEN p.status IN ('pendente','aguardando_confirmacao') THEN p.valor ELSE 0 END) AS CHAR) as totalPendente,
    CAST(SUM(p.valor) AS CHAR) as somaValores,
    GROUP_CONCAT(CONCAT(p.id,'=',p.numeroParcela,'/',p.status,'/',p.valor) ORDER BY p.numeroParcela SEPARATOR ' | ') as detalhe
  FROM vendas v
  LEFT JOIN parcelas p ON p.vendaId = v.id
  WHERE v.cancelada = 0
  GROUP BY v.id
  HAVING totalParcelas > 0
  ORDER BY v.id DESC
  LIMIT 40
`);
console.log(JSON.stringify(vendas.rows || vendas, null, 2));

// 3. Parcelas pagas no mesmo mês da venda que não estão somadas ao valorColetado
console.log("\n=== PARCELAS PAGAS NO MESMO MÊS DA VENDA (verificar se valorColetado está correto) ===");
const parcelasMesmoMes = await db.execute(sql`
  SELECT p.id as parcelaId, p.vendaId, p.numeroParcela, 
    CAST(p.valor AS CHAR) as valorParcela, CAST(p.valorPago AS CHAR) as valorPago,
    p.status, p.dataPagamento,
    v.clienteNome, CAST(v.valorColetado AS CHAR) as valorColetado, CAST(v.valorFaturado AS CHAR) as valorFaturado,
    v.dataVenda
  FROM parcelas p
  JOIN vendas v ON v.id = p.vendaId
  WHERE p.status = 'pago'
    AND p.dataPagamento IS NOT NULL
    AND MONTH(p.dataPagamento) = MONTH(v.dataVenda)
    AND YEAR(p.dataPagamento) = YEAR(v.dataVenda)
  ORDER BY v.dataVenda DESC
  LIMIT 30
`);
console.log(JSON.stringify(parcelasMesmoMes.rows || parcelasMesmoMes, null, 2));

process.exit(0);
