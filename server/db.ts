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
