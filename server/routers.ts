import * as bcrypt from "bcryptjs";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod/v4";
import { notifyOwner } from "./_core/notification";
import { sdk } from "./_core/sdk";
import { upsertUser } from "./db";
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
  getAllLeads, getLeadsByPeriod, getLeadsByConsultor, createLead, updateLead, deleteLead,
  getBloqueiosByConsultor, createBloqueio, deleteBloqueio,
  getConfiguracao, setConfiguracao,
  getRankingsByPeriod, getAllRankings, upsertRanking,
  getDb,
  getParcelasVencidas, getParcelasVencendoHoje, getParcelasByPeriodo, getParcelasFuturasConsultor,
  getServicosVendidosByPeriod, getServicosVendidosByConsultor,
  getCustosServicos, setCustoServico, getDashboardFinanceiro, getParcelasCompletasByConsultor,
  getPromessas, getPromessasByConsultor, getPromessasHoje, getPromessasHojeByConsultor,
  createPromessa, updatePromessa, deletePromessa,
  getRankingAutomatico,
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

        // Cria um openId único para o consultor baseado no email
        const openId = `consultor_${consultor.id}_${Buffer.from(consultor.email || String(consultor.id)).toString('base64').slice(0, 16)}`;

        // Garante que o consultor existe na tabela users (necessário para autenticação JWT)
        await upsertUser({
          openId,
          name: consultor.nome,
          email: consultor.email || null,
          loginMethod: "email",
          lastSignedIn: new Date(),
          role: "user",
        });

        // Cria o token JWT de sessão
        const sessionToken = await sdk.createSessionToken(openId, { name: consultor.nome });

        // Seta o cookie de sessão (mesmo mecanismo do OAuth)
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

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
        clienteTelefone: z.string().optional(),
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
        // Auto-criar lead na coluna "Venda Realizada" (fixa)
        try {
          let colunas = await getColunasPipeline();
          let colunaVenda = colunas.find(c => c.nome.toLowerCase().includes("venda realizada"));
          if (!colunaVenda) {
            // Criar coluna fixa "Venda Realizada" se não existir
            await createColuna({ nome: "Venda Realizada", cor: "#16a34a", ordem: 999 });
            colunas = await getColunasPipeline();
            colunaVenda = colunas.find(c => c.nome.toLowerCase().includes("venda realizada"));
          }
          if (colunaVenda) {
            const dataVenda = new Date(input.dataVenda);
            await createLead({
              colunaId: colunaVenda.id,
              nome: input.clienteNome,
              valor: String(input.valorColetado || input.valorFaturado),
              consultorId: input.consultorId,
              observacoes: input.observacoes || `Venda registrada manualmente`,
              mes: dataVenda.getMonth() + 1,
              ano: dataVenda.getFullYear(),
              ordem: 0,
            });
          }
        } catch (e) {
          console.warn("[vendas.create] Falha ao criar lead no pipeline:", e);
        }
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
        parcelas: z.array(z.object({ valor: z.number(), vencimento: z.string(), numeroParcela: z.number().optional() })),
      }))
      .mutation(async ({ input }) => {
        await createParcelas(input.parcelas.map((p, idx) => ({
          vendaId: input.vendaId,
          valor: String(p.valor),
          vencimento: new Date(p.vencimento),
          status: "pendente" as const,
          numeroParcela: p.numeroParcela ?? (idx + 1),
        })));
        return { success: true };
      }),
     markPaid: protectedProcedure
      .input(z.object({ id: z.number(), comprovanteUrl: z.string().optional() }))
      .mutation(async ({ input }) => {
        await updateParcela(input.id, { status: "pago", dataPagamento: new Date(), comprovanteUrl: input.comprovanteUrl });
        return { success: true };
      }),
    okConsultor: protectedProcedure
      .input(z.object({ id: z.number(), ok: z.boolean() }))
      .mutation(async ({ input }) => {
        // Ao marcar como recebido, muda status para pago (visível no Admin também)
        await updateParcela(input.id, {
          okConsultor: input.ok,
          dataOkConsultor: input.ok ? new Date() : undefined,
          status: input.ok ? "pago" : "pendente",
          dataPagamento: input.ok ? new Date() : undefined,
        });
        return { success: true };
      }),
    devedores: protectedProcedure.query(async () => getParcelasVencidas()),
    vencendoHoje: protectedProcedure.query(async () => getParcelasVencendoHoje()),
    byPeriodo: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getParcelasByPeriodo(input.mes, input.ano)),
    futurasConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getParcelasFuturasConsultor(input.consultorId)),
    atualizarStatus: protectedProcedure
      .input(z.object({ id: z.number(), status: z.enum(["pendente", "pago", "atrasado"]) }))
      .mutation(async ({ input }) => {
        await updateParcela(input.id, { status: input.status });
        return { success: true };
      }),
  }),
  servicosVendidos: router({
    byPeriodo: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getServicosVendidosByPeriod(input.mes, input.ano)),
    byConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number(), mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getServicosVendidosByConsultor(input.consultorId, input.mes, input.ano)),
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
        observacoes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // 1. Criar o agendamento
        await createAgendamento({ ...input, dataHora: new Date(input.dataHora), origem: "publico" });

        // 2. Auto-criar lead no pipeline (coluna "Novos Agendamentos" ou primeira disponível)
        try {
          const db = await getDb();
          if (db) {
            // Buscar ou criar coluna padrão
            let colunas = await getColunasPipeline();
            let colunaAlvo = colunas.find(c =>
              c.nome.toLowerCase().includes("novo") ||
              c.nome.toLowerCase().includes("agendamento") ||
              c.nome.toLowerCase().includes("lead")
            ) || colunas[0];

            if (!colunaAlvo) {
              // Criar coluna padrão se não existir nenhuma
              await createColuna({ nome: "Novos Agendamentos", cor: "#0055FF", ordem: 0 });
              colunas = await getColunasPipeline();
              colunaAlvo = colunas[0];
            }

            if (colunaAlvo) {
              const dataAgendamento = new Date(input.dataHora);
              await createLead({
                colunaId: colunaAlvo.id,
                nome: input.clienteNome,
                telefone: input.clienteTelefone,
                email: input.clienteEmail,
                consultorId: input.consultorId,
                dataReuniao: dataAgendamento,
                horario: dataAgendamento.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                observacoes: `Agendamento público em ${dataAgendamento.toLocaleDateString("pt-BR")}${input.observacoes ? " — " + input.observacoes : ""}`,
                mes: dataAgendamento.getMonth() + 1,
                ano: dataAgendamento.getFullYear(),
                ordem: 0,
              });
            }
          }
        } catch (e) {
          console.warn("[createPublico] Falha ao criar lead no pipeline:", e);
        }

        // 3. Notificar o dono do sistema
        try {
          const dataFormatada = new Date(input.dataHora).toLocaleString("pt-BR", {
            dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo"
          });
          await notifyOwner({
            title: `📅 Novo Agendamento: ${input.clienteNome}`,
            content: `Cliente **${input.clienteNome}** agendou um diagnóstico para **${dataFormatada}**.\n\nTelefone: ${input.clienteTelefone || "não informado"}\nEmail: ${input.clienteEmail || "não informado"}\nConsultor ID: ${input.consultorId}`,
          });
        } catch (e) {
          console.warn("[createPublico] Falha ao notificar dono:", e);
        }

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
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
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
    createColuna: protectedProcedure
      .input(z.object({ nome: z.string().min(1), cor: z.string().optional(), ordem: z.number().optional() }))
      .mutation(async ({ input }) => {
        await createColuna(input);
        return { success: true };
      }),
    updateColuna: protectedProcedure
      .input(z.object({ id: z.number(), nome: z.string().optional(), cor: z.string().optional(), ordem: z.number().optional() }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateColuna(id, data);
        return { success: true };
      }),
    deleteColuna: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteColuna(input.id);
        return { success: true };
      }),
    getLeadsByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number(), mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getLeadsByConsultor(input.consultorId, input.mes, input.ano)),
    moverLead: protectedProcedure
      .input(z.object({ id: z.number(), colunaId: z.number() }))
      .mutation(async ({ input }) => {
        await updateLead(input.id, { colunaId: input.colunaId });
        return { success: true };
      }),
    reordenarLead: protectedProcedure
      .input(z.object({ id: z.number(), ordem: z.number() }))
      .mutation(async ({ input }) => {
        await updateLead(input.id, { ordem: input.ordem });
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

  metaColetado: router({
    buscar: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => {
        const chave = `meta_coletado_${input.mes}_${input.ano}`;
        const valor = await getConfiguracao(chave);
        return { meta: valor ? parseFloat(valor) : 0 };
      }),
    salvar: adminProcedure
      .input(z.object({ mes: z.number(), ano: z.number(), meta: z.number().min(0) }))
      .mutation(async ({ input }) => {
        const chave = `meta_coletado_${input.mes}_${input.ano}`;
        await setConfiguracao(chave, String(input.meta));
        return { success: true };
      }),
  }),
  rankingHistorico: router({
    salvarSnapshot: adminProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .mutation(async ({ input }) => {
        // Buscar todas as vendas do período e calcular ranking
        const vendas = await getVendasByPeriod(input.mes, input.ano);
        const consultores = await getAllConsultores();
        // Agrupar por consultor
        const porConsultor = new Map<number, { coletado: number; vendas: number }>();
        for (const v of vendas) {
          if (!v.consultorId) continue;
          const atual = porConsultor.get(v.consultorId) || { coletado: 0, vendas: 0 };
          atual.coletado += parseFloat(String(v.valorColetado || 0));
          atual.vendas += 1;
          porConsultor.set(v.consultorId, atual);
        }
        // Ordenar por coletado
        const sorted = Array.from(porConsultor.entries()).sort((a, b) => b[1].coletado - a[1].coletado);
        // Salvar rankings
        for (let i = 0; i < sorted.length; i++) {
          const [consultorId, dados] = sorted[i];
          await upsertRanking({
            mes: input.mes, ano: input.ano,
            consultorId, posicao: i + 1,
            valorColetado: String(dados.coletado),
            totalVendas: dados.vendas,
          });
        }
        // Notificar dono
        const nomes = sorted.map(([id, d], i) => {
          const c = consultores.find(c => c.id === id);
          return `${i+1}º ${c?.nome || 'Consultor'}: R$ ${d.coletado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
        }).join('\n');
        await notifyOwner({
          title: `Ranking ${input.mes}/${input.ano} salvo`,
          content: `Ranking do mês ${input.mes}/${input.ano} foi salvo com ${sorted.length} consultoras.\n\n${nomes}`,
        });
        return { success: true, total: sorted.length };
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
    automatico: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getRankingAutomatico(input.mes, input.ano)),
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

  custosServicos: router({
    get: protectedProcedure.query(async () => getCustosServicos()),
    set: adminProcedure
      .input(z.object({ chave: z.string(), valor: z.number() }))
      .mutation(async ({ input }) => {
        await setCustoServico(input.chave, input.valor);
        return { success: true };
      }),
  }),
  dashboardFinanceiro: router({
    get: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getDashboardFinanceiro(input.mes, input.ano)),
  }),
  parcelasCompletas: router({
    byConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getParcelasCompletasByConsultor(input.consultorId)),
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
  promessas: router({
    list: protectedProcedure.query(async () => getPromessas()),
    listByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getPromessasByConsultor(input.consultorId)),
    hoje: protectedProcedure.query(async () => getPromessasHoje()),
    hojeByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number() }))
      .query(async ({ input }) => getPromessasHojeByConsultor(input.consultorId)),
    create: protectedProcedure
      .input(z.object({
        clienteNome: z.string().min(1),
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        dataPromessa: z.string(),
        horarioPromessa: z.string().optional(), // HH:MM
        valor: z.number().optional(),
        observacoes: z.string().optional(),
        consultorId: z.number().optional(),
        agendamentoId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await createPromessa(input);
        return { success: true };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteNome: z.string().optional(),
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        dataPromessa: z.string().optional(),
        horarioPromessa: z.string().optional(),
        valor: z.number().optional(),
        observacoes: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updatePromessa(id, data);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePromessa(input.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
