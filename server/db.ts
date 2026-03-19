import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  agendamentos,
  bloqueiosAgenda,
  colaboradores,
  colunasPipeline,
  configuracoes,
  consultores,
  despesas,
  leads,
  metricasTrafego,
  parcelas,
  promessasPagamento,
  rankings,
  users,
  vendas,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserAvatar(userId: number, avatarUrl: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ avatarUrl }).where(eq(users.id, userId));
}

// ─── Consultores ─────────────────────────────────────────────────────────────

export async function getAllConsultores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(consultores).orderBy(consultores.nome);
}

export async function getConsultorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(consultores).where(eq(consultores.id, id)).limit(1);
  return result[0];
}

export async function getConsultorByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(consultores).where(eq(consultores.email, email)).limit(1);
  return result[0];
}

export async function createConsultor(data: { nome: string; email?: string; fotoUrl?: string; linkAgenda?: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(consultores).values({ ...data, ativo: true });
  return result;
}

export async function updateConsultor(id: number, data: Partial<{ nome: string; email: string; fotoUrl: string; linkAgenda: string; ativo: boolean; senhaHash: string }>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(consultores).set(data).where(eq(consultores.id, id));
}

export async function deleteConsultor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(consultores).where(eq(consultores.id, id));
}

// ─── Vendas ──────────────────────────────────────────────────────────────────

export async function getVendasByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  return db.select().from(vendas)
    .where(and(gte(vendas.dataVenda, startDate), lte(vendas.dataVenda, endDate)))
    .orderBy(desc(vendas.dataVenda));
}

export async function getVendasByConsultor(consultorId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  return db.select().from(vendas)
    .where(and(eq(vendas.consultorId, consultorId), gte(vendas.dataVenda, startDate), lte(vendas.dataVenda, endDate)))
    .orderBy(desc(vendas.dataVenda));
}

export async function createVenda(data: typeof vendas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(vendas).values(data);
  return result;
}

export async function updateVenda(id: number, data: Partial<typeof vendas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(vendas).set(data).where(eq(vendas.id, id));
}

export async function deleteVenda(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(vendas).where(eq(vendas.id, id));
}

// ─── Parcelas ────────────────────────────────────────────────────────────────

export async function getParcelasByVenda(vendaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcelas).where(eq(parcelas.vendaId, vendaId)).orderBy(parcelas.vencimento);
}

export async function getParcelasPendentes() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(parcelas).where(eq(parcelas.status, "pendente")).orderBy(parcelas.vencimento);
}

export async function getParcelasByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendasDoConsultor = await db.select({ id: vendas.id }).from(vendas).where(eq(vendas.consultorId, consultorId));
  if (vendasDoConsultor.length === 0) return [];
  const ids = vendasDoConsultor.map(v => v.id);
  return db.select().from(parcelas)
    .where(sql`${parcelas.vendaId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(parcelas.vencimento);
}

export async function createParcelas(data: Array<typeof parcelas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(parcelas).values(data);
}

export async function updateParcela(id: number, data: Partial<typeof parcelas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(parcelas).set(data).where(eq(parcelas.id, id));
}

// ─── Agendamentos ────────────────────────────────────────────────────────────

export async function getAgendamentosByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  return db.select().from(agendamentos)
    .where(and(gte(agendamentos.dataHora, startDate), lte(agendamentos.dataHora, endDate)))
    .orderBy(agendamentos.dataHora);
}

export async function getAgendamentosByConsultor(consultorId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(ano, mes - 1, 1);
  const endDate = new Date(ano, mes, 0, 23, 59, 59);
  return db.select().from(agendamentos)
    .where(and(eq(agendamentos.consultorId, consultorId), gte(agendamentos.dataHora, startDate), lte(agendamentos.dataHora, endDate)))
    .orderBy(agendamentos.dataHora);
}

export async function createAgendamento(data: typeof agendamentos.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(agendamentos).values(data);
  return result;
}

export async function updateAgendamento(id: number, data: Partial<typeof agendamentos.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(agendamentos).set(data).where(eq(agendamentos.id, id));
}

export async function deleteAgendamento(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(agendamentos).where(eq(agendamentos.id, id));
}

// ─── Métricas de Tráfego ─────────────────────────────────────────────────────

export async function getMetricasByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metricasTrafego)
    .where(and(eq(metricasTrafego.mes, mes), eq(metricasTrafego.ano, ano)));
}

export async function getAllMetricas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(metricasTrafego).orderBy(desc(metricasTrafego.ano), desc(metricasTrafego.mes));
}

export async function createMetrica(data: typeof metricasTrafego.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(metricasTrafego).values(data);
}

export async function updateMetrica(id: number, data: Partial<typeof metricasTrafego.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(metricasTrafego).set(data).where(eq(metricasTrafego.id, id));
}

export async function deleteMetrica(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(metricasTrafego).where(eq(metricasTrafego.id, id));
}

// ─── Despesas ────────────────────────────────────────────────────────────────

export async function getDespesasByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(despesas)
    .where(and(eq(despesas.mes, mes), eq(despesas.ano, ano)))
    .orderBy(desc(despesas.data));
}

export async function createDespesa(data: typeof despesas.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(despesas).values(data);
}

export async function updateDespesa(id: number, data: Partial<typeof despesas.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(despesas).set(data).where(eq(despesas.id, id));
}

export async function deleteDespesa(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(despesas).where(eq(despesas.id, id));
}

// ─── Colaboradores ───────────────────────────────────────────────────────────

export async function getAllColaboradores() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(colaboradores).where(eq(colaboradores.ativo, true)).orderBy(colaboradores.nome);
}

export async function createColaborador(data: typeof colaboradores.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(colaboradores).values(data);
}

export async function updateColaborador(id: number, data: Partial<typeof colaboradores.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(colaboradores).set(data).where(eq(colaboradores.id, id));
}

export async function deleteColaborador(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(colaboradores).where(eq(colaboradores.id, id));
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

export async function getColunasPipeline() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(colunasPipeline).orderBy(colunasPipeline.ordem);
}

export async function createColuna(data: typeof colunasPipeline.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(colunasPipeline).values(data);
  return result;
}

export async function updateColuna(id: number, data: Partial<typeof colunasPipeline.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(colunasPipeline).set(data).where(eq(colunasPipeline.id, id));
}

export async function deleteColuna(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(colunasPipeline).where(eq(colunasPipeline.id, id));
}

export async function getLeadsByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads)
    .where(and(eq(leads.mes, mes), eq(leads.ano, ano)))
    .orderBy(leads.ordem);
}

export async function getAllLeads() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(leads.ordem);
}
export async function getLeadsByConsultor(consultorId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads)
    .where(and(eq(leads.consultorId, consultorId), eq(leads.mes, mes), eq(leads.ano, ano)))
    .orderBy(leads.ordem);
}

export async function createLead(data: typeof leads.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(leads).values(data);
  return result;
}

export async function updateLead(id: number, data: Partial<typeof leads.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(leads).set(data).where(eq(leads.id, id));
}

export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(leads).where(eq(leads.id, id));
}

// ─── Bloqueios ───────────────────────────────────────────────────────────────

export async function getBloqueiosByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(bloqueiosAgenda).where(eq(bloqueiosAgenda.consultorId, consultorId));
}

export async function createBloqueio(data: typeof bloqueiosAgenda.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(bloqueiosAgenda).values(data);
}

export async function deleteBloqueio(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(bloqueiosAgenda).where(eq(bloqueiosAgenda.id, id));
}

// ─── Configurações ───────────────────────────────────────────────────────────

export async function getConfiguracao(chave: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1);
  return result[0]?.valor ?? null;
}

export async function setConfiguracao(chave: string, valor: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(configuracoes).values({ chave, valor })
    .onDuplicateKeyUpdate({ set: { valor } });
}

// ─── Rankings ────────────────────────────────────────────────────────────────

export async function getRankingsByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rankings)
    .where(and(eq(rankings.mes, mes), eq(rankings.ano, ano)))
    .orderBy(rankings.posicao);
}

export async function getAllRankings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(rankings).orderBy(desc(rankings.ano), desc(rankings.mes), rankings.posicao);
}

export async function upsertRanking(data: typeof rankings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(rankings).values(data)
    .onDuplicateKeyUpdate({ set: { posicao: data.posicao, valorColetado: data.valorColetado, totalVendas: data.totalVendas } });
}

// ─── Funções avançadas de parcelas ───────────────────────────────────────────
export async function getParcelasVencidas() {
  const db = await getDb();
  if (!db) return [];
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999);
  return db.select({
    id: parcelas.id,
    vendaId: parcelas.vendaId,
    valor: parcelas.valor,
    vencimento: parcelas.vencimento,
    status: parcelas.status,
    okConsultor: parcelas.okConsultor,
    notificacaoEnviada: parcelas.notificacaoEnviada,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    consultorId: vendas.consultorId,
  })
    .from(parcelas)
    .innerJoin(vendas, eq(parcelas.vendaId, vendas.id))
    .where(and(
      eq(parcelas.status, "pendente"),
      lte(parcelas.vencimento, hoje),
    ))
    .orderBy(parcelas.vencimento);
}

export async function getParcelasVencendoHoje() {
  const db = await getDb();
  if (!db) return [];
  const hoje = new Date();
  const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
  const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);
  return db.select({
    id: parcelas.id,
    vendaId: parcelas.vendaId,
    valor: parcelas.valor,
    vencimento: parcelas.vencimento,
    status: parcelas.status,
    okConsultor: parcelas.okConsultor,
    notificacaoEnviada: parcelas.notificacaoEnviada,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    consultorId: vendas.consultorId,
  })
    .from(parcelas)
    .innerJoin(vendas, eq(parcelas.vendaId, vendas.id))
    .where(and(
      eq(parcelas.status, "pendente"),
      gte(parcelas.vencimento, inicioHoje),
      lte(parcelas.vencimento, fimHoje),
    ))
    .orderBy(parcelas.vencimento);
}

export async function getParcelasByPeriodo(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);
  return db.select({
    id: parcelas.id,
    vendaId: parcelas.vendaId,
    valor: parcelas.valor,
    vencimento: parcelas.vencimento,
    status: parcelas.status,
    dataPagamento: parcelas.dataPagamento,
    okConsultor: parcelas.okConsultor,
    notificacaoEnviada: parcelas.notificacaoEnviada,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    consultorId: vendas.consultorId,
    servicos: vendas.servicos,
  })
    .from(parcelas)
    .innerJoin(vendas, eq(parcelas.vendaId, vendas.id))
    .where(and(
      gte(parcelas.vencimento, inicio),
      lte(parcelas.vencimento, fim),
    ))
    .orderBy(parcelas.vencimento);
}

export async function getParcelasFuturasConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vendasDoConsultor = await db.select({ id: vendas.id }).from(vendas).where(eq(vendas.consultorId, consultorId));
  if (vendasDoConsultor.length === 0) return [];
  const ids = vendasDoConsultor.map(v => v.id);
  return db.select({
    id: parcelas.id,
    vendaId: parcelas.vendaId,
    valor: parcelas.valor,
    vencimento: parcelas.vencimento,
    status: parcelas.status,
    okConsultor: parcelas.okConsultor,
    clienteNome: vendas.clienteNome,
  })
    .from(parcelas)
    .innerJoin(vendas, eq(parcelas.vendaId, vendas.id))
    .where(and(
      sql`${parcelas.vendaId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`,
      gte(parcelas.vencimento, hoje),
      eq(parcelas.status, "pendente"),
    ))
    .orderBy(parcelas.vencimento);
}

// ─── Serviços Vendidos (Limpa Nome / Rating) ─────────────────────────────────
export async function getServicosVendidosByPeriod(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);
  return db.select({
    id: vendas.id,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    servicos: vendas.servicos,
    valorColetado: vendas.valorColetado,
    valorFaturado: vendas.valorFaturado,
    dataVenda: vendas.dataVenda,
    consultorId: vendas.consultorId,
  })
    .from(vendas)
    .where(and(
      gte(vendas.dataVenda, inicio),
      lte(vendas.dataVenda, fim),
    ))
    .orderBy(vendas.dataVenda);
}

export async function getServicosVendidosByConsultor(consultorId: number, mes: number, ano: number) {
  const db = await getDb();
  if (!db) return [];
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);
  return db.select({
    id: vendas.id,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    servicos: vendas.servicos,
    valorColetado: vendas.valorColetado,
    valorFaturado: vendas.valorFaturado,
    dataVenda: vendas.dataVenda,
  })
    .from(vendas)
    .where(and(
      eq(vendas.consultorId, consultorId),
      gte(vendas.dataVenda, inicio),
      lte(vendas.dataVenda, fim),
    ))
    .orderBy(vendas.dataVenda);
}

// ─── Custos de Serviços (Limpa Nome, Rating, Salário Fixo) ───────────────────
const CUSTOS_DEFAULTS: Record<string, number> = {
  "custo_limpa_nome": 70,
  "custo_rating": 110,
  "salario_fixo": 1600,
};

export async function getCustosServicos() {
  const db = await getDb();
  const result: Record<string, number> = { ...CUSTOS_DEFAULTS };
  if (!db) return result;
  try {
    const rows = await db.select().from(configuracoes).where(
      sql`${configuracoes.chave} IN ('custo_limpa_nome', 'custo_rating', 'salario_fixo')`
    );
    for (const row of rows) {
      if (row.valor) result[row.chave] = parseFloat(row.valor);
    }
  } catch (_) {}
  return result;
}

export async function setCustoServico(chave: string, valor: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(configuracoes)
    .values({ chave, valor: String(valor) })
    .onDuplicateKeyUpdate({ set: { valor: String(valor) } });
}

// ─── Dashboard Financeiro Completo ───────────────────────────────────────────
export async function getDashboardFinanceiro(mes: number, ano: number) {
  const db = await getDb();
  if (!db) return null;
  const inicio = new Date(ano, mes - 1, 1);
  const fim = new Date(ano, mes, 0, 23, 59, 59);

  const [vendasMes, parcelasMes, custos] = await Promise.all([
    db.select().from(vendas).where(and(gte(vendas.dataVenda, inicio), lte(vendas.dataVenda, fim))),
    db.select({
      id: parcelas.id,
      valor: parcelas.valor,
      vencimento: parcelas.vencimento,
      status: parcelas.status,
      dataPagamento: parcelas.dataPagamento,
      okConsultor: parcelas.okConsultor,
      vendaId: parcelas.vendaId,
    }).from(parcelas).where(and(gte(parcelas.vencimento, inicio), lte(parcelas.vencimento, fim))),
    getCustosServicos(),
  ]);

  const totalFaturado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0);
  const totalColetado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0);

  // Contar serviços vendidos
  let qtdLimpaName = 0;
  let qtdRating = 0;
  for (const v of vendasMes) {
    const servs = v.servicos as string[] | null;
    if (!servs) continue;
    for (const s of servs) {
      if (s.toLowerCase().includes("limpa")) qtdLimpaName++;
      if (s.toLowerCase().includes("rating")) qtdRating++;
    }
  }

  const custoCustoLimpaName = qtdLimpaName * custos["custo_limpa_nome"];
  const custoCustoRating = qtdRating * custos["custo_rating"];
  const totalCustosServicos = custoCustoLimpaName + custoCustoRating;
  const salarioFixo = custos["salario_fixo"];

  // Comissão total (10% do coletado por padrão)
  const totalComissoes = vendasMes.reduce((s, v) => {
    const coletado = parseFloat(String(v.valorColetado || 0));
    const pct = parseFloat(String(v.comissaoPercent || 10));
    return s + (coletado * pct / 100);
  }, 0);

  // Parcelas do mês
  const parcelasPagas = parcelasMes.filter(p => p.status === "pago");
  const parcelasPendentes = parcelasMes.filter(p => p.status === "pendente");
  const totalParcelasPagas = parcelasPagas.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);
  const totalParcelasPendentes = parcelasPendentes.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);

  const liquido = totalColetado - totalCustosServicos - salarioFixo - totalComissoes;

  return {
    totalFaturado,
    totalColetado,
    totalComissoes,
    totalCustosServicos,
    custoCustoLimpaName,
    custoCustoRating,
    salarioFixo,
    liquido,
    qtdLimpaName,
    qtdRating,
    totalParcelasPagas,
    totalParcelasPendentes,
    totalVendas: vendasMes.length,
    custos,
  };
}

// ─── Parcelas por consultor com dados do cliente ──────────────────────────────
export async function getParcelasCompletasByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  const vendasDoConsultor = await db.select({ id: vendas.id }).from(vendas).where(eq(vendas.consultorId, consultorId));
  if (vendasDoConsultor.length === 0) return [];
  const ids = vendasDoConsultor.map(v => v.id);
  return db.select({
    id: parcelas.id,
    vendaId: parcelas.vendaId,
    valor: parcelas.valor,
    vencimento: parcelas.vencimento,
    status: parcelas.status,
    dataPagamento: parcelas.dataPagamento,
    okConsultor: parcelas.okConsultor,
    dataOkConsultor: parcelas.dataOkConsultor,
    comprovanteUrl: parcelas.comprovanteUrl,
    clienteNome: vendas.clienteNome,
    clienteCpfCnpj: vendas.clienteCpfCnpj,
    clienteTelefone: vendas.clienteTelefone,
    servicos: vendas.servicos,
  })
    .from(parcelas)
    .innerJoin(vendas, eq(parcelas.vendaId, vendas.id))
    .where(sql`${parcelas.vendaId} IN (${sql.join(ids.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(parcelas.vencimento);
}

// ─── Promessas de Pagamento ───────────────────────────────────────────────────
export async function getPromessas() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promessasPagamento).orderBy(promessasPagamento.dataPromessa);
}

export async function getPromessasByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(promessasPagamento)
    .where(eq(promessasPagamento.consultorId, consultorId))
    .orderBy(promessasPagamento.dataPromessa);
}

export async function getPromessasHoje() {
  const db = await getDb();
  if (!db) return [];
  const hoje = new Date();
  const dataStr = hoje.toISOString().split("T")[0]; // YYYY-MM-DD
  return db.select().from(promessasPagamento)
    .where(and(
      sql`DATE(${promessasPagamento.dataPromessa}) = ${dataStr}`,
      eq(promessasPagamento.status, "pendente")
    ))
    .orderBy(promessasPagamento.dataPromessa);
}

export async function getPromessasHojeByConsultor(consultorId: number) {
  const db = await getDb();
  if (!db) return [];
  const hoje = new Date();
  const dataStr = hoje.toISOString().split("T")[0];
  return db.select().from(promessasPagamento)
    .where(and(
      sql`DATE(${promessasPagamento.dataPromessa}) = ${dataStr}`,
      eq(promessasPagamento.status, "pendente"),
      eq(promessasPagamento.consultorId, consultorId)
    ))
    .orderBy(promessasPagamento.dataPromessa);
}

export async function createPromessa(data: {
  clienteNome: string;
  clienteTelefone?: string;
  clienteCpfCnpj?: string;
  dataPromessa: string; // YYYY-MM-DD
  horarioPromessa?: string; // HH:MM
  valor?: number;
  observacoes?: string;
  consultorId?: number;
  agendamentoId?: number;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(promessasPagamento).values({
    clienteNome: data.clienteNome,
    clienteTelefone: data.clienteTelefone,
    clienteCpfCnpj: data.clienteCpfCnpj,
    dataPromessa: new Date(data.dataPromessa + "T12:00:00"),
    horarioPromessa: data.horarioPromessa,
    observacoes: data.observacoes,
    consultorId: data.consultorId,
    agendamentoId: data.agendamentoId,
    status: "pendente",
  });
}

export async function updatePromessa(id: number, data: Partial<{
  clienteNome: string;
  clienteTelefone: string;
  clienteCpfCnpj: string;
  dataPromessa: string;
  horarioPromessa: string;
  valor: number;
  observacoes: string;
  status: string;
}>) {
  const db = await getDb();
  if (!db) return;
  const updateData: Record<string, unknown> = { ...data };
  if (data.valor !== undefined) updateData.valor = String(data.valor);
  if (data.dataPromessa !== undefined) updateData.dataPromessa = new Date(data.dataPromessa + "T12:00:00");
  await db.update(promessasPagamento).set(updateData).where(eq(promessasPagamento.id, id));
}

export async function deletePromessa(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(promessasPagamento).where(eq(promessasPagamento.id, id));
}
