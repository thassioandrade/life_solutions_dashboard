import * as bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import {
  getAllUsers, updateUserRole, updateUserAvatar,
  getAllConsultores, getConsultorById, getConsultorByEmail, createConsultor, updateConsultor, deleteConsultor,
  getVendasByPeriod, getVendasByConsultor, createVenda, updateVenda, deleteVenda,
  getParcelasByVenda, getParcelasPendentes, getParcelasByConsultor, createParcelas, updateParcela,
  getAgendamentosByPeriod, getAgendamentosByConsultor, createAgendamento, updateAgendamento, deleteAgendamento,
  getMetricasByPeriod, getAllMetricas, createMetrica, updateMetrica, deleteMetrica,
  getDespesasByPeriod, createDespesa, updateDespesa, deleteDespesa,
  getAllColaboradores, createColaborador, updateColaborador, deleteColaborador,
  getColunasPipeline, createColuna, updateColuna, deleteColuna,
  getAllLeads, getLeadsByPeriod, createLead, updateLead, deleteLead,
  getBloqueiosByConsultor, createBloqueio, deleteBloqueio,
  getConfiguracao, setConfiguracao,
  getRankingsByPeriod, getAllRankings, upsertRanking,
  getDb,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Acesso restrito a administradores" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    loginConsultor: publicProcedure
      .input(z.object({ email: z.string(), senha: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const consultor = await getConsultorByEmail(input.email);
        if (!consultor || !consultor.senhaHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        const valid = await bcrypt.compare(input.senha, consultor.senhaHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "Email ou senha inválidos" });
        if (!consultor.ativo) throw new TRPCError({ code: "FORBIDDEN", message: "Consultor desativado" });
        return { success: true, consultor: { id: consultor.id, nome: consultor.nome, email: consultor.email, fotoUrl: consultor.fotoUrl } };
      }),
  }),

  usuarios: router({
    list: adminProcedure.query(async () => getAllUsers()),
    updateRole: adminProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ input }) => {
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    updateAvatar: protectedProcedure
      .input(z.object({ avatarBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.avatarBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `avatars/${ctx.user.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateUserAvatar(ctx.user.id, url);
        return { url };
      }),
  }),

  consultores: router({
    list: protectedProcedure.query(async () => getAllConsultores()),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getConsultorById(input.id)),
    create: adminProcedure
      .input(z.object({ nome: z.string().min(1), email: z.string().optional(), fotoUrl: z.string().optional(), linkAgenda: z.string().optional() }))
      .mutation(async ({ input }) => {
        await createConsultor(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({ id: z.number(), nome: z.string().optional(), email: z.string().optional(), fotoUrl: z.string().optional(), linkAgenda: z.string().optional(), ativo: z.boolean().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateConsultor(id, data);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteConsultor(input.id);
        return { success: true };
      }),
    setSenha: adminProcedure
      .input(z.object({ id: z.number(), senha: z.string().min(4) }))
      .mutation(async ({ input }) => {
        const senhaHash = await bcrypt.hash(input.senha, 10);
        await updateConsultor(input.id, { senhaHash });
        return { success: true };
      }),
    uploadFoto: adminProcedure
      .input(z.object({ id: z.number(), fotoBase64: z.string(), mimeType: z.string() }))
      .mutation(async ({ input }) => {
        const buffer = Buffer.from(input.fotoBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `consultores/${input.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        await updateConsultor(input.id, { fotoUrl: url });
        return { url };
      }),
  }),

  vendas: router({
    listByPeriod: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getVendasByPeriod(input.mes, input.ano)),
    listByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number(), mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getVendasByConsultor(input.consultorId, input.mes, input.ano)),
    create: protectedProcedure
      .input(z.object({
        clienteNome: z.string().min(1),
        clienteCpfCnpj: z.string().optional(),
        tipo: z.enum(["PF", "PJ"]).default("PF"),
        consultorId: z.number().optional(),
        dataVenda: z.string(),
        valorFaturado: z.number(),
        valorColetado: z.number().default(0),
        parcelasRestantes: z.number().default(0),
        servicos: z.array(z.string()).optional(),
        observacoes: z.string().optional(),
        comissaoPercent: z.number().default(10),
        custoServico: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await createVenda({
          ...input,
          dataVenda: new Date(input.dataVenda),
          valorFaturado: String(input.valorFaturado),
          valorColetado: String(input.valorColetado),
          comissaoPercent: String(input.comissaoPercent),
          custoServico: String(input.custoServico),
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteNome: z.string().optional(),
        valorFaturado: z.number().optional(),
        valorColetado: z.number().optional(),
        status: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.valorFaturado !== undefined) updateData.valorFaturado = String(data.valorFaturado);
        if (data.valorColetado !== undefined) updateData.valorColetado = String(data.valorColetado);
        await updateVenda(id, updateData as Parameters<typeof updateVenda>[1]);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteVenda(input.id);
        return { success: true };
      }),
  }),

  parcelas: router({
    listByVenda: protectedProcedure
      .input(z.object({ vendaId: z.number() }))
      .query(async ({ input }) => getParcelasByVenda(input.vendaId)),
    listPendentes: protectedProcedure.query(async () => getParcelasPendentes()),
    listByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getParcelasByConsultor(input.consultorId)),
    create: protectedProcedure
      .input(z.object({
        vendaId: z.number(),
        parcelas: z.array(z.object({ valor: z.number(), vencimento: z.string() })),
      }))
      .mutation(async ({ input }) => {
        await createParcelas(input.parcelas.map(p => ({
          vendaId: input.vendaId,
          valor: String(p.valor),
          vencimento: new Date(p.vencimento),
          status: "pendente" as const,
        })));
        return { success: true };
      }),
    markPaid: protectedProcedure
      .input(z.object({ id: z.number(), comprovanteUrl: z.string().optional() }))
      .mutation(async ({ input }) => {
        await updateParcela(input.id, { status: "pago", dataPagamento: new Date(), comprovanteUrl: input.comprovanteUrl });
        return { success: true };
      }),
  }),

  agendamentos: router({
    listByPeriod: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getAgendamentosByPeriod(input.mes, input.ano)),
    listByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number(), mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getAgendamentosByConsultor(input.consultorId, input.mes, input.ano)),
    create: protectedProcedure
      .input(z.object({
        clienteNome: z.string().min(1),
        clienteEmail: z.string().optional(),
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        consultorId: z.number().optional(),
        dataHora: z.string(),
        observacoes: z.string().optional(),
        origem: z.enum(["admin", "publico"]).default("admin"),
      }))
      .mutation(async ({ input }) => {
        await createAgendamento({ ...input, dataHora: new Date(input.dataHora) });
        return { success: true };
      }),
    createPublico: publicProcedure
      .input(z.object({
        clienteNome: z.string().min(1),
        clienteEmail: z.string().optional(),
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        consultorId: z.number(),
        dataHora: z.string(),
      }))
      .mutation(async ({ input }) => {
        await createAgendamento({ ...input, dataHora: new Date(input.dataHora), origem: "publico" });
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["confirmado", "realizado", "noshow", "cancelado", "remarcado"]).optional(),
        valorColetado: z.number().optional(),
        valorFaturado: z.number().optional(),
        parcelasQtd: z.number().optional(),
        servicos: z.array(z.string()).optional(),
        formaPagamento: z.string().optional(),
        resultouVenda: z.boolean().optional(),
        comprovanteUrl: z.string().optional(),
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.valorColetado !== undefined) updateData.valorColetado = String(data.valorColetado);
        if (data.valorFaturado !== undefined) updateData.valorFaturado = String(data.valorFaturado);
        await updateAgendamento(id, updateData as Parameters<typeof updateAgendamento>[1]);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteAgendamento(input.id);
        return { success: true };
      }),
  }),

  metricas: router({
    listByPeriod: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getMetricasByPeriod(input.mes, input.ano)),
    listAll: protectedProcedure.query(async () => getAllMetricas()),
    create: adminProcedure
      .input(z.object({
        mes: z.number(), ano: z.number(),
        investimento: z.number().default(0),
        qtdDiagnosticos: z.number().default(0),
        valorUnitarioDiagnostico: z.number().default(0),
        qtdUpsell: z.number().default(0),
        valorUnitarioUpsell: z.number().default(0),
        qtdDownsell: z.number().default(0),
        valorUnitarioDownsell: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await createMetrica({
          ...input,
          investimento: String(input.investimento),
          valorUnitarioDiagnostico: String(input.valorUnitarioDiagnostico),
          valorUnitarioUpsell: String(input.valorUnitarioUpsell),
          valorUnitarioDownsell: String(input.valorUnitarioDownsell),
        });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteMetrica(input.id);
        return { success: true };
      }),
  }),

  despesas: router({
    listByPeriod: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getDespesasByPeriod(input.mes, input.ano)),
    create: adminProcedure
      .input(z.object({
        data: z.string(),
        descricao: z.string().min(1),
        valor: z.number(),
        categoria: z.string().optional(),
        formaPagamento: z.string().optional(),
        mes: z.number(),
        ano: z.number(),
      }))
      .mutation(async ({ input }) => {
        await createDespesa({ ...input, data: new Date(input.data), valor: String(input.valor) });
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteDespesa(input.id);
        return { success: true };
      }),
    colaboradores: router({
      list: protectedProcedure.query(async () => getAllColaboradores()),
      create: adminProcedure
        .input(z.object({ nome: z.string().min(1), cargo: z.string().optional(), salario: z.number() }))
        .mutation(async ({ input }) => {
          await createColaborador({ ...input, salario: String(input.salario) });
          return { success: true };
        }),
      delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await deleteColaborador(input.id);
          return { success: true };
        }),
    }),
  }),

  pipeline: router({
    getColunas: protectedProcedure.query(async () => getColunasPipeline()),
    createColuna: adminProcedure
      .input(z.object({ nome: z.string().min(1), cor: z.string().optional(), ordem: z.number().optional() }))
      .mutation(async ({ input }) => {
        await createColuna(input);
        return { success: true };
      }),
    updateColuna: adminProcedure
      .input(z.object({ id: z.number(), nome: z.string().optional(), cor: z.string().optional(), ordem: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateColuna(id, data);
        return { success: true };
      }),
    deleteColuna: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteColuna(input.id);
        return { success: true };
      }),
    getLeads: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getLeadsByPeriod(input.mes, input.ano)),
    getAllLeads: protectedProcedure.query(async () => getAllLeads()),
    createLead: protectedProcedure
      .input(z.object({
        colunaId: z.number(),
        nome: z.string().min(1),
        telefone: z.string().optional(),
        email: z.string().optional(),
        valor: z.number().optional(),
        dataReuniao: z.string().optional(),
        horario: z.string().optional(),
        observacoes: z.string().optional(),
        consultorId: z.number().optional(),
        mes: z.number().optional(),
        ano: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createLead({
          ...input,
          dataReuniao: input.dataReuniao ? new Date(input.dataReuniao) : undefined,
          valor: input.valor ? String(input.valor) : undefined,
        });
        return { success: true };
      }),
    updateLead: protectedProcedure
      .input(z.object({
        id: z.number(),
        colunaId: z.number().optional(),
        nome: z.string().optional(),
        telefone: z.string().optional(),
        email: z.string().optional(),
        valor: z.number().optional(),
        dataReuniao: z.string().optional(),
        horario: z.string().optional(),
        observacoes: z.string().optional(),
        ordem: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.valor !== undefined) updateData.valor = String(data.valor);
        if (data.dataReuniao !== undefined) updateData.dataReuniao = new Date(data.dataReuniao);
        await updateLead(id, updateData as Parameters<typeof updateLead>[1]);
        return { success: true };
      }),
    deleteLead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteLead(input.id);
        return { success: true };
      }),
  }),

  agenda: router({
    getBloqueios: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getBloqueiosByConsultor(input.consultorId)),
    createBloqueio: adminProcedure
      .input(z.object({
        consultorId: z.number(),
        data: z.string(),
        diaInteiro: z.boolean().default(false),
        horaInicio: z.string().optional(),
        horaFim: z.string().optional(),
        motivo: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createBloqueio({ ...input, data: new Date(input.data) });
        return { success: true };
      }),
    deleteBloqueio: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteBloqueio(input.id);
        return { success: true };
      }),
  }),

  configuracoes: router({
    get: protectedProcedure
      .input(z.object({ chave: z.string() }))
      .query(async ({ input }) => {
        const valor = await getConfiguracao(input.chave);
        return { valor };
      }),
    set: adminProcedure
      .input(z.object({ chave: z.string(), valor: z.string() }))
      .mutation(async ({ input }) => {
        await setConfiguracao(input.chave, input.valor);
        return { success: true };
      }),
  }),

  rankings: router({
    listByPeriod: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getRankingsByPeriod(input.mes, input.ano)),
    listAll: protectedProcedure.query(async () => getAllRankings()),
    upsert: adminProcedure
      .input(z.object({
        mes: z.number(), ano: z.number(),
        consultorId: z.number(),
        posicao: z.number(),
        valorColetado: z.number().default(0),
        totalVendas: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        await upsertRanking({ ...input, valorColetado: String(input.valorColetado) });
        return { success: true };
      }),
  }),

  dashboard: router({
    stats: adminProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => {
        const [vendasMes, agendsMes, metricasMes, despesasMes, colaboradoresList, parcelasPendentes] = await Promise.all([
          getVendasByPeriod(input.mes, input.ano),
          getAgendamentosByPeriod(input.mes, input.ano),
          getMetricasByPeriod(input.mes, input.ano),
          getDespesasByPeriod(input.mes, input.ano),
          getAllColaboradores(),
          getParcelasPendentes(),
        ]);

        const totalFaturado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0);
        const totalColetado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0);
        const totalComissoes = vendasMes.reduce((s, v) => {
          const coletado = parseFloat(String(v.valorColetado || 0));
          const pct = parseFloat(String(v.comissaoPercent || 10));
          return s + (coletado * pct / 100);
        }, 0);
        const totalCustos = vendasMes.reduce((s, v) => s + parseFloat(String(v.custoServico || 0)), 0);
        const totalDespesas = despesasMes.reduce((s, d) => s + parseFloat(String(d.valor || 0)), 0);
        const totalSalarios = colaboradoresList.reduce((s, c) => s + parseFloat(String(c.salario || 0)), 0);
        const metrica = metricasMes[0];
        const investimento = metrica ? parseFloat(String(metrica.investimento || 0)) : 0;
        const totalParcelasPendentes = parcelasPendentes.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);

        const realizadas = agendsMes.filter(a => a.status === "realizado").length;
        const noshow = agendsMes.filter(a => a.status === "noshow").length;
        const confirmadas = agendsMes.filter(a => a.status === "confirmado").length;
        const total = agendsMes.length;

        return {
          totalFaturado, totalColetado, totalComissoes, totalCustos, totalDespesas, totalSalarios, investimento, totalParcelasPendentes,
          lucroLiquido: totalColetado - totalComissoes - totalCustos - totalDespesas - totalSalarios - investimento,
          totalVendas: vendasMes.length,
          agendamentos: { total, realizadas, noshow, confirmadas },
          vendas: vendasMes,
          agendamentosList: agendsMes,
        };
      }),
  }),

  upload: router({
    comprovante: protectedProcedure
      .input(z.object({ fileBase64: z.string(), mimeType: z.string(), tipo: z.string().default("comprovante") }))
      .mutation(async ({ input, ctx }) => {
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.mimeType.split("/")[1] || "jpg";
        const key = `${input.tipo}/${ctx.user.id}-${nanoid(8)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.mimeType);
        return { url };
      }),
  }),
});

export type AppRouter = typeof appRouter;
