import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  avatarUrl: text("avatarUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Consultores/Vendedores (Closers)
export const consultores = mysqlTable("consultores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  senhaHash: text("senhaHash"),
  fotoUrl: text("fotoUrl"),
  linkAgenda: text("linkAgenda"),
  ativo: boolean("ativo").default(true).notNull(),
  userId: int("userId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Consultor = typeof consultores.$inferSelect;
export type InsertConsultor = typeof consultores.$inferInsert;

// Vendas / Soluções contratadas
export const vendas = mysqlTable("vendas", {
  id: int("id").autoincrement().primaryKey(),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  clienteCpfCnpj: varchar("clienteCpfCnpj", { length: 20 }),
  tipo: mysqlEnum("tipo", ["PF", "PJ"]).default("PF").notNull(),
  consultorId: int("consultorId"),
  dataVenda: timestamp("dataVenda").notNull(),
  valorFaturado: decimal("valorFaturado", { precision: 10, scale: 2 }).notNull(),
  valorColetado: decimal("valorColetado", { precision: 10, scale: 2 }).default("0"),
  parcelasRestantes: int("parcelasRestantes").default(0),
  servicos: json("servicos").$type<string[]>(),
  observacoes: text("observacoes"),
  comprovanteUrl: text("comprovanteUrl"),
  comissaoPercent: decimal("comissaoPercent", { precision: 5, scale: 2 }).default("10"),
  custoServico: decimal("custoServico", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Venda = typeof vendas.$inferSelect;
export type InsertVenda = typeof vendas.$inferInsert;

// Parcelas das vendas
export const parcelas = mysqlTable("parcelas", {
  id: int("id").autoincrement().primaryKey(),
  vendaId: int("vendaId").notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  vencimento: timestamp("vencimento").notNull(),
  status: mysqlEnum("status", ["pendente", "pago", "atrasado"]).default("pendente").notNull(),
  dataPagamento: timestamp("dataPagamento"),
  comprovanteUrl: text("comprovanteUrl"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Parcela = typeof parcelas.$inferSelect;
export type InsertParcela = typeof parcelas.$inferInsert;

// Agendamentos / Reuniões
export const agendamentos = mysqlTable("agendamentos", {
  id: int("id").autoincrement().primaryKey(),
  clienteNome: varchar("clienteNome", { length: 255 }).notNull(),
  clienteEmail: varchar("clienteEmail", { length: 320 }),
  clienteTelefone: varchar("clienteTelefone", { length: 30 }),
  clienteCpfCnpj: varchar("clienteCpfCnpj", { length: 20 }),
  consultorId: int("consultorId"),
  dataHora: timestamp("dataHora").notNull(),
  status: mysqlEnum("status", ["confirmado", "realizado", "noshow", "cancelado", "remarcado"]).default("confirmado").notNull(),
  valorColetado: decimal("valorColetado", { precision: 10, scale: 2 }),
  valorFaturado: decimal("valorFaturado", { precision: 10, scale: 2 }),
  parcelasQtd: int("parcelasQtd").default(0),
  servicos: json("servicos").$type<string[]>(),
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  resultouVenda: boolean("resultouVenda").default(false),
  comprovanteUrl: text("comprovanteUrl"),
  observacoes: text("observacoes"),
  origem: mysqlEnum("origem", ["admin", "publico"]).default("admin").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agendamento = typeof agendamentos.$inferSelect;
export type InsertAgendamento = typeof agendamentos.$inferInsert;

// Métricas de tráfego
export const metricasTrafego = mysqlTable("metricas_trafego", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  investimento: decimal("investimento", { precision: 10, scale: 2 }).default("0"),
  qtdDiagnosticos: int("qtdDiagnosticos").default(0),
  valorUnitarioDiagnostico: decimal("valorUnitarioDiagnostico", { precision: 10, scale: 2 }).default("0"),
  qtdUpsell: int("qtdUpsell").default(0),
  valorUnitarioUpsell: decimal("valorUnitarioUpsell", { precision: 10, scale: 2 }).default("0"),
  qtdDownsell: int("qtdDownsell").default(0),
  valorUnitarioDownsell: decimal("valorUnitarioDownsell", { precision: 10, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MetricaTrafego = typeof metricasTrafego.$inferSelect;
export type InsertMetricaTrafego = typeof metricasTrafego.$inferInsert;

// Despesas avulsas
export const despesas = mysqlTable("despesas", {
  id: int("id").autoincrement().primaryKey(),
  data: timestamp("data").notNull(),
  descricao: varchar("descricao", { length: 255 }).notNull(),
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  formaPagamento: varchar("formaPagamento", { length: 50 }),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Despesa = typeof despesas.$inferSelect;
export type InsertDespesa = typeof despesas.$inferInsert;

// Colaboradores (salários fixos)
export const colaboradores = mysqlTable("colaboradores", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 100 }),
  salario: decimal("salario", { precision: 10, scale: 2 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Colaborador = typeof colaboradores.$inferSelect;
export type InsertColaborador = typeof colaboradores.$inferInsert;

// Colunas do Pipeline Kanban
export const colunasPipeline = mysqlTable("colunas_pipeline", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  cor: varchar("cor", { length: 20 }).default("#16a34a"),
  ordem: int("ordem").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ColunaPipeline = typeof colunasPipeline.$inferSelect;
export type InsertColunaPipeline = typeof colunasPipeline.$inferInsert;

// Leads do Pipeline
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  colunaId: int("colunaId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 30 }),
  email: varchar("email", { length: 320 }),
  valor: decimal("valor", { precision: 10, scale: 2 }),
  dataReuniao: timestamp("dataReuniao"),
  horario: varchar("horario", { length: 10 }),
  observacoes: text("observacoes"),
  ordem: int("ordem").default(0),
  consultorId: int("consultorId"),
  mes: int("mes"),
  ano: int("ano"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;

// Bloqueios de agenda
export const bloqueiosAgenda = mysqlTable("bloqueios_agenda", {
  id: int("id").autoincrement().primaryKey(),
  consultorId: int("consultorId").notNull(),
  data: timestamp("data").notNull(),
  diaInteiro: boolean("diaInteiro").default(false),
  horaInicio: varchar("horaInicio", { length: 10 }),
  horaFim: varchar("horaFim", { length: 10 }),
  motivo: text("motivo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BloqueioAgenda = typeof bloqueiosAgenda.$inferSelect;
export type InsertBloqueioAgenda = typeof bloqueiosAgenda.$inferInsert;

// Configurações do sistema
export const configuracoes = mysqlTable("configuracoes", {
  id: int("id").autoincrement().primaryKey(),
  chave: varchar("chave", { length: 100 }).notNull().unique(),
  valor: text("valor"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Configuracao = typeof configuracoes.$inferSelect;
export type InsertConfiguracao = typeof configuracoes.$inferInsert;

// Rankings mensais
export const rankings = mysqlTable("rankings", {
  id: int("id").autoincrement().primaryKey(),
  mes: int("mes").notNull(),
  ano: int("ano").notNull(),
  consultorId: int("consultorId").notNull(),
  posicao: int("posicao").notNull(),
  valorColetado: decimal("valorColetado", { precision: 10, scale: 2 }).default("0"),
  totalVendas: int("totalVendas").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Ranking = typeof rankings.$inferSelect;
export type InsertRanking = typeof rankings.$inferInsert;
