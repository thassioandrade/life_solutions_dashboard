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
import { getAllUsers, updateUserRole, updateUserAvatar, deleteUser,
  getAllConsultores, getConsultorById, getConsultorByEmail, createConsultor, updateConsultor, deleteConsultor,
  getVendasByPeriod, getVendasByConsultor, getVendasAtivasByClienteNome, createVenda, updateVenda, deleteVenda, cancelarVenda, getVendaById,
  getParcelasByVenda, getParcelasPendentes, getParcelasByConsultor, createParcelas, updateParcela,
  getAgendamentosByPeriod, getAgendamentosByConsultor, createAgendamento, updateAgendamento, deleteAgendamento, getAgendamentoById,
  getMetricasByPeriod, getAllMetricas, createMetrica, updateMetrica, deleteMetrica,
  getDespesasByPeriod, createDespesa, updateDespesa, deleteDespesa,
  getAllColaboradores, createColaborador, updateColaborador, deleteColaborador,
  getColunasPipeline, createColuna, updateColuna, deleteColuna,
  getAllLeads, getLeadsByPeriod, getLeadsByConsultor, createLead, updateLead, deleteLead,
  getBloqueiosByConsultor, createBloqueio, deleteBloqueio,
  getConfiguracao, setConfiguracao,
  getRankingsByPeriod, getAllRankings, upsertRanking,
  getDb,
  getParcelasVencidas, getParcelasVencendoHoje, getParcelasByPeriodo, getParcelasFuturasConsultor, getAllParcelas,
  getColetadoParcelasByConsultor, getColetadoParcelasAdmin,
  getServicosVendidosByPeriod, getServicosVendidosByConsultor,
  getCustosServicos, setCustoServico, getDashboardFinanceiro, getParcelasCompletasByConsultor,
  getPromessas, getPromessasByConsultor, getPromessasHoje, getPromessasHojeByConsultor,
  getPromessaById, createPromessa, updatePromessa, deletePromessa,
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
    delete: adminProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode excluir sua própria conta." });
        await deleteUser(input.userId);
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
    // Procedure pública para a página de agendamento de clientes (sem dados sensíveis)
    listPublico: publicProcedure.query(async () => {
      const todos = await getAllConsultores();
      // Filtra consultores ativos (ativo pode ser boolean true, número 1 ou string "1")
      return (todos || []).filter(c => Boolean(c.ativo)).map(c => ({ id: c.id, nome: c.nome, fotoUrl: c.fotoUrl }));
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => getConsultorById(input.id)),
    create: adminProcedure
      .input(z.object({ nome: z.string().min(1), email: z.string().optional(), fotoUrl: z.string().optional(), linkAgenda: z.string().optional() }))
      .mutation(async ({ input }) => {
        await createConsultor(input);
        return { success: true };
      }),
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        email: z.string().optional(),
        fotoUrl: z.string().optional(),
        linkAgenda: z.string().optional(),
        ativo: z.boolean().optional(),
        salario: z.number().optional(),
        receberSalario: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.salario !== undefined) updateData.salario = String(data.salario);
        await updateConsultor(id, updateData as Parameters<typeof updateConsultor>[1]);
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
        // ─── PROTEÇÃO ANTI-DUPLICATA ───────────────────────────────────────────
        // Verificar se já existe venda ativa para o mesmo cliente (mesmo consultor)
        const vendasExistentes = await getVendasAtivasByClienteNome(
          input.clienteNome,
          input.consultorId
        );
        if (vendasExistentes.length > 0) {
          // Já existe venda ativa para este cliente — retornar o ID existente em vez de criar nova
          const vendaExistente = vendasExistentes[0];
          console.warn(`[vendas.create] Bloqueado: venda duplicada para "${input.clienteNome}" (ID existente: ${vendaExistente.id})`);
          return { success: true, vendaId: vendaExistente.id, duplicata: true };
        }
        // ──────────────────────────────────────────────────────────────────────
        const vendaResult = await createVenda({
          ...input,
          dataVenda: new Date(input.dataVenda),
          valorFaturado: String(input.valorFaturado),
          valorColetado: String(input.valorColetado),
          comissaoPercent: String(input.comissaoPercent),
          custoServico: String(input.custoServico),
        });
        // Drizzle MySQL $returningId() retorna [{ id: number }]
        const vendaId = Array.isArray(vendaResult) && vendaResult.length > 0 ? (vendaResult[0] as { id?: number }).id ?? 0 : 0;
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
        return { success: true, vendaId };
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        clienteNome: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        clienteTelefone: z.string().optional(),
        tipo: z.enum(["PF", "PJ"]).optional(),
        valorFaturado: z.number().optional(),
        valorColetado: z.number().optional(),
        status: z.string().optional(),
        observacoes: z.string().optional(),
        servicos: z.array(z.string()).optional(),
        consultorId: z.number().optional(),
        custoServico: z.number().optional(),
        comissaoPercent: z.number().optional(),
        dataVenda: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.valorFaturado !== undefined) updateData.valorFaturado = String(data.valorFaturado);
        if (data.valorColetado !== undefined) updateData.valorColetado = String(data.valorColetado);
        if (data.custoServico !== undefined) updateData.custoServico = String(data.custoServico);
        if (data.comissaoPercent !== undefined) updateData.comissaoPercent = String(data.comissaoPercent);
        if (data.dataVenda !== undefined) updateData.dataVenda = new Date(data.dataVenda);
        await updateVenda(id, updateData as Parameters<typeof updateVenda>[1]);
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteVenda(input.id);
        return { success: true };
      }),
    cancelar: protectedProcedure
      .input(z.object({
        id: z.number(),
        motivo: z.string().min(1, "Informe o motivo do cancelamento"),
      }))
      .mutation(async ({ input }) => {
        // Cancelar a venda e parcelas pendentes
        await cancelarVenda(input.id, input.motivo);

        // Criar lead na coluna "Estorno" e remover da coluna "Venda Realizada"
        try {
          const venda = await getVendaById(input.id);
          if (venda) {
            const colunas = await getColunasPipeline();
            let colunaEstorno = colunas.find(c => c.nome.toLowerCase().includes("estorno"));
            if (!colunaEstorno) {
              // Criar coluna fixa "Estorno" se não existir
              await createColuna({
                nome: "Estorno",
                ordem: 9999,
                cor: "#ef4444",
              });
              const colunasAtualizadas = await getColunasPipeline();
              colunaEstorno = colunasAtualizadas.find(c => c.nome.toLowerCase().includes("estorno"));
            }
            if (colunaEstorno) {
              const dataVenda = new Date(venda.dataVenda);
              await createLead({
                colunaId: colunaEstorno.id,
                nome: venda.clienteNome,
                valor: String(venda.valorColetado || 0),
                consultorId: venda.consultorId ?? undefined,
                observacoes: `Estorno: ${input.motivo}`,
                mes: dataVenda.getMonth() + 1,
                ano: dataVenda.getFullYear(),
                ordem: 0,
              });
            }
            // Remover lead da coluna "Venda Realizada" (e outras colunas ativas) pelo nome do cliente
            try {
              const db = await getDb();
              if (db) {
                const { leads: leadsTable } = await import("../drizzle/schema");
                const { eq: eqFn, and: andFn, ne: neFn } = await import("drizzle-orm");
                // Buscar coluna Estorno para não remover o lead que acabamos de criar
                const colunaEstornoAtual = colunas.find(c => c.nome.toLowerCase().includes("estorno")) || colunaEstorno;
                // Remover todos os leads com o mesmo nome que não estejam na coluna Estorno
                const leadsDoCliente = await db.select({ id: leadsTable.id, colunaId: leadsTable.colunaId })
                  .from(leadsTable)
                  .where(eqFn(leadsTable.nome, venda.clienteNome));
                for (const lead of leadsDoCliente) {
                  if (colunaEstornoAtual && lead.colunaId !== colunaEstornoAtual.id) {
                    await db.delete(leadsTable).where(eqFn(leadsTable.id, lead.id));
                  }
                }
              }
            } catch (e2) {
              console.warn("[vendas.cancelar] Falha ao remover lead da Venda Realizada:", e2);
            }
          }
        } catch (e) {
          console.warn("[vendas.cancelar] Falha ao criar lead de estorno:", e);
        }
        return { success: true };
      }),
    listCanceladas: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const { vendas: vendasTable } = await import("../drizzle/schema");
        const { eq: eqFn, and: andFn, gte: gteFn, lte: lteFn } = await import("drizzle-orm");
        const inicio = new Date(input.ano, input.mes - 1, 1);
        const fim = new Date(input.ano, input.mes, 0, 23, 59, 59);
        return db.select().from(vendasTable).where(
          andFn(gteFn(vendasTable.dataVenda, inicio), lteFn(vendasTable.dataVenda, fim), eqFn(vendasTable.cancelada, true))
        );
      }),
    listPrazos: protectedProcedure
      .input(z.object({ consultorId: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) return [];
        const { vendas: vendasTable, consultores } = await import("../drizzle/schema");
        const { eq: eqFn, and: andFn } = await import("drizzle-orm");
        const hoje = new Date();
        const PRAZO_DIAS = 25;
        const isAdmin = ctx.user?.role === "admin";
        const rows = await db
          .select({
            id: vendasTable.id,
            clienteNome: vendasTable.clienteNome,
            clienteTelefone: vendasTable.clienteTelefone,
            dataVenda: vendasTable.dataVenda,
            servicos: vendasTable.servicos,
            consultorId: vendasTable.consultorId,
            consultorNome: consultores.nome,
            cancelada: vendasTable.cancelada,
            entregue: vendasTable.entregue,
            dataEntrega: vendasTable.dataEntrega,
            entregueConsultorId: vendasTable.entregueConsultorId,
            movidoParaEntrega: vendasTable.movidoParaEntrega,
          })
          .from(vendasTable)
          .leftJoin(consultores, eqFn(vendasTable.consultorId, consultores.id))
          .where(
            andFn(
              eqFn(vendasTable.cancelada, false),
              isAdmin ? undefined : (input.consultorId ? eqFn(vendasTable.consultorId, input.consultorId) : undefined)
            )
          );
        const now = hoje.getTime();
        return rows
          .filter(r => r.dataVenda)
          .map(r => {
            const dataInicio = new Date(r.dataVenda!);
            const diasDecorridos = Math.floor((now - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
            const diasRestantes = PRAZO_DIAS - diasDecorridos;
            const status = r.entregue ? "entregue" : diasDecorridos > PRAZO_DIAS ? "atrasado" : diasDecorridos >= PRAZO_DIAS - 5 ? "alerta" : "ok";
            return {
              ...r,
              diasDecorridos,
              diasRestantes,
              status,
              prazo: PRAZO_DIAS,
            };
          })
          .sort((a, b) => {
            // Entregues vão para o final
            if (a.entregue && !b.entregue) return 1;
            if (!a.entregue && b.entregue) return -1;
            return b.diasDecorridos - a.diasDecorridos;
          });
      }),
    marcarEntregue: protectedProcedure
      .input(z.object({ vendaId: z.number(), consultorId: z.number().optional() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("DB not available");
        const { vendas: vendasTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        await db.update(vendasTable).set({
          entregue: true,
          dataEntrega: new Date(),
          entregueConsultorId: input.consultorId || null,
        }).where(eqFn(vendasTable.id, input.vendaId));
        return { success: true };
      }),
    marcarEntregueViaLead: protectedProcedure
      .input(z.object({ leadId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("DB not available");
        const { vendas: vendasTable } = await import("../drizzle/schema");
        const { leads: leadsTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        // Buscar o lead para obter o nome do cliente
        const [lead] = await db.select({ nome: leadsTable.nome, consultorId: leadsTable.consultorId })
          .from(leadsTable).where(eqFn(leadsTable.id, input.leadId));
        if (!lead) throw new Error("Lead n\u00e3o encontrado");
        // Buscar venda pelo nome do cliente (movidoParaEntrega=true)
        const [venda] = await db.select({ id: vendasTable.id })
          .from(vendasTable)
          .where(eqFn(vendasTable.clienteNome, lead.nome))
          .limit(1);
        if (venda) {
          await db.update(vendasTable).set({
            entregue: true,
            dataEntrega: new Date(),
            entregueConsultorId: lead.consultorId || null,
          }).where(eqFn(vendasTable.id, venda.id));
        }
        // Remover o lead do pipeline
        await db.delete(leadsTable).where(eqFn(leadsTable.id, input.leadId));
        return { success: true };
      }),
    moverParaEntregaSeNecessario: protectedProcedure
      .input(z.object({ vendaId: z.number(), clienteNome: z.string(), consultorId: z.number().optional() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) return { success: false };
        const { vendas: vendasTable } = await import("../drizzle/schema");
        const { eq: eqFn } = await import("drizzle-orm");
        // Verificar se já foi movido
        const [venda] = await db.select({ movidoParaEntrega: vendasTable.movidoParaEntrega })
          .from(vendasTable).where(eqFn(vendasTable.id, input.vendaId));
        if (venda?.movidoParaEntrega) return { success: true, jaMovido: true };
        // Criar/buscar coluna "Entregar Serviço Feito"
        try {
          let colunas = await getColunasPipeline();
          let colunaEntrega = colunas.find(c => c.nome.toLowerCase().includes("entregar servi"));
          if (!colunaEntrega) {
            await createColuna({ nome: "Entregar Serviço Feito", cor: "#f59e0b", ordem: 998 });
            colunas = await getColunasPipeline();
            colunaEntrega = colunas.find(c => c.nome.toLowerCase().includes("entregar servi"));
          }
          if (colunaEntrega) {
            await createLead({
              colunaId: colunaEntrega.id,
              nome: input.clienteNome,
              valor: "0",
              consultorId: input.consultorId,
              observacoes: `⏰ Prazo de 25 dias atingido — entregar serviço ao cliente`,
              mes: new Date().getMonth() + 1,
              ano: new Date().getFullYear(),
              ordem: 0,
            });
          }
          // Marcar como movido para não duplicar
          await db.update(vendasTable).set({ movidoParaEntrega: true })
            .where(eqFn(vendasTable.id, input.vendaId));
        } catch (e) {
          console.warn("[moverParaEntrega] Erro:", e);
        }
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
      .input(z.object({
        id: z.number(),
        ok: z.boolean(),
        formaPagamento: z.string().optional(),
        comprovanteUrl: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Ao marcar como recebido, muda status para pago (visível no Admin também)
        await updateParcela(input.id, {
          okConsultor: input.ok,
          dataOkConsultor: input.ok ? new Date() : undefined,
          status: input.ok ? "pago" : "pendente",
          dataPagamento: input.ok ? new Date() : undefined,
          formaPagamento: input.formaPagamento || undefined,
          comprovanteUrl: input.comprovanteUrl || undefined,
        });
        return { success: true };
      }),
    listAll: protectedProcedure.query(async () => getAllParcelas()),
    coletadoByConsultor: protectedProcedure
      .input(z.object({ consultorId: z.number(), mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getColetadoParcelasByConsultor(input.consultorId, input.mes, input.ano)),
    coletadoAdmin: protectedProcedure
      .input(z.object({ mes: z.number(), ano: z.number() }))
      .query(async ({ input }) => getColetadoParcelasAdmin(input.mes, input.ano)),
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
        vaiFechar: z.boolean().optional(),
        comprovanteUrl: z.string().optional(),
        observacoes: z.string().optional(),
        clienteTelefone: z.string().optional(),
        clienteCpfCnpj: z.string().optional(),
        vendaId: z.number().optional(), // salvar vendaId para evitar duplicação
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: Record<string, unknown> = { ...data };
        if (data.valorColetado !== undefined) updateData.valorColetado = String(data.valorColetado);
        if (data.valorFaturado !== undefined) updateData.valorFaturado = String(data.valorFaturado);
        await updateAgendamento(id, updateData as Parameters<typeof updateAgendamento>[1]);
        // Retornar vendaId atual do agendamento para o frontend
        const agAtualizado = await getAgendamentoById(id);

        // Mover lead no pipeline automaticamente quando vaiFechar ou resultouVenda muda
        if (data.vaiFechar === true || data.resultouVenda === true) {
          try {
            const colunas = await getColunasPipeline();
            // Buscar o agendamento para obter nome do cliente
            const db = await getDb();
            if (db && colunas.length > 0) {
              // Determinar coluna destino
              let colunaDestino: typeof colunas[0] | undefined;
              if (data.resultouVenda === true) {
                // Coluna "Venda Realizada"
                colunaDestino = colunas.find(c => c.nome.toLowerCase().includes("venda realizada") || c.nome.toLowerCase().includes("vendas realizadas"));
              } else if (data.vaiFechar === true) {
                // Coluna "Vai Fechar"
                colunaDestino = colunas.find(c => c.nome.toLowerCase().includes("vai fechar"));
              }

              if (colunaDestino) {
                // Buscar leads para encontrar o lead deste cliente
                const todosLeads = await getAllLeads();
                // Identificar coluna de origem (Novos Agendamentos)
                const colunaOrigem = colunas.find(c =>
                  c.nome.toLowerCase().includes("novo") ||
                  c.nome.toLowerCase().includes("agendamento") ||
                  c.nome.toLowerCase().includes("lead")
                );
                // Buscar o agendamento para obter o nome do cliente
                const ag = await getAgendamentoById(id);
                if (ag) {
                  // Encontrar lead correspondente: mesmo nome na coluna de origem
                  const leadCorrespondente = todosLeads.find(l =>
                    l.nome.toLowerCase() === ag.clienteNome.toLowerCase() &&
                    (colunaOrigem ? l.colunaId === colunaOrigem.id : true)
                  );
                  if (leadCorrespondente && leadCorrespondente.colunaId !== colunaDestino.id) {
                    await updateLead(leadCorrespondente.id, { colunaId: colunaDestino.id });
                  }
                }
              }
            }
          } catch (e) {
            console.warn("[agendamentos.update] Falha ao mover lead no pipeline:", e);
          }
        }
        return { success: true, vendaId: agAtualizado?.vendaId ?? null };
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
        const [vendasMes, agendsMes, metricasMes, despesasMes, colaboradoresList, parcelasPendentes, consultoresList] = await Promise.all([
          getVendasByPeriod(input.mes, input.ano),
          getAgendamentosByPeriod(input.mes, input.ano),
          getMetricasByPeriod(input.mes, input.ano),
          getDespesasByPeriod(input.mes, input.ano),
          getAllColaboradores(),
          getParcelasPendentes(),
          getAllConsultores(),
        ]);

        const totalFaturado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorFaturado || 0)), 0);
        const totalColetado = vendasMes.reduce((s, v) => s + parseFloat(String(v.valorColetado || 0)), 0);
        // Comissão = (coletado - custoServico) × 10% por venda
        // Custo do serviço já está descontado dentro da comissão
        const totalComissoes = vendasMes.reduce((s, v) => {
          const coletado = parseFloat(String(v.valorColetado || 0));
          const custo = parseFloat(String(v.custoServico || 0));
          const pct = parseFloat(String(v.comissaoPercent || 10));
          return s + ((coletado - custo) * pct / 100);
        }, 0);
        const totalCustos = vendasMes.reduce((s, v) => s + parseFloat(String(v.custoServico || 0)), 0);
        const totalDespesas = despesasMes.reduce((s, d) => s + parseFloat(String(d.valor || 0)), 0);
        // Salários: colaboradores fixos + consultoras com receberSalario=true
        const salarioColaboradores = colaboradoresList.reduce((s, c) => s + parseFloat(String(c.salario || 0)), 0);
        const salarioConsultoras = consultoresList
          .filter(c => c.receberSalario && c.ativo)
          .reduce((s, c) => s + parseFloat(String(c.salario || 0)), 0);
        const totalSalarios = salarioColaboradores + salarioConsultoras;
        const metrica = metricasMes[0];
        const investimento = metrica ? parseFloat(String(metrica.investimento || 0)) : 0;
        const totalParcelasPendentes = parcelasPendentes.reduce((s, p) => s + parseFloat(String(p.valor || 0)), 0);

        const realizadas = agendsMes.filter(a => a.status === "realizado").length;
        const noshow = agendsMes.filter(a => a.status === "noshow").length;
        const confirmadas = agendsMes.filter(a => a.status === "confirmado").length;
        const total = agendsMes.length;

        return {
          totalFaturado, totalColetado, totalComissoes, totalCustos, totalDespesas, totalSalarios, investimento, totalParcelasPendentes,
          // Lucro líquido = coletado - custos de serviços - comissões - despesas - salários - investimento
          lucroLiquido: totalColetado - totalCustos - totalComissoes - totalDespesas - totalSalarios - investimento,
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
        // Campos de pagamento (preenchidos ao marcar como pago)
        valorColetado: z.number().optional(),
        valorFaturado: z.number().optional(),
        servicos: z.array(z.string()).optional(),
        formaPagamento: z.string().optional(),
        parcelasQtd: z.number().optional(),
        comprovanteUrl: z.string().optional(),
        datesVencimento: z.array(z.string()).optional(), // datas das parcelas futuras
      }))
      .mutation(async ({ input }) => {
        const { id, datesVencimento, ...data } = input;
        await updatePromessa(id, data);

        // Se marcou como concluído com valorColetado, criar venda automaticamente
        if (data.status === "concluido" && data.valorColetado && data.valorColetado > 0) {
          try {
            const promessa = await getPromessaById(id);
            if (!promessa) throw new Error("Promessa não encontrada");

            // Calcular custo do serviço
            const custos = await getCustosServicos();
            const servicos = data.servicos || promessa.servicos || [];
            let custoServico = 0;
            if (servicos.includes("limpa_nome")) custoServico += custos["custo_limpa_nome"] ?? 70;
            if (servicos.includes("rating")) custoServico += custos["custo_rating"] ?? 110;

            const valorColetado = data.valorColetado;
            const valorFaturado = data.valorFaturado || valorColetado;
            const parcelasQtd = data.parcelasQtd || 0;
            const consultorId = promessa.consultorId ?? undefined;

            // Criar a venda
            const db = await getDb();
            if (!db) throw new Error("DB not available");

             const novaVendaResult = await createVenda({
              clienteNome: promessa.clienteNome,
              clienteCpfCnpj: promessa.clienteCpfCnpj || undefined,
              clienteTelefone: promessa.clienteTelefone || undefined,
              tipo: "PF",
              consultorId: consultorId,
              dataVenda: new Date(),
              valorFaturado: String(valorFaturado),
              valorColetado: String(valorColetado),
              parcelasRestantes: parcelasQtd,
              servicos: servicos,
              observacoes: promessa.observacoes || undefined,
              comprovanteUrl: data.comprovanteUrl || undefined,
              comissaoPercent: "10",
              custoServico: String(custoServico),
            });
            // $returningId() retorna [{ id: number }]
            const novaVendaId = Array.isArray(novaVendaResult) && novaVendaResult.length > 0 ? (novaVendaResult[0] as { id?: number }).id ?? null : null;
            const novaVenda = novaVendaId ? { id: novaVendaId } : null;

            // Criar parcelas se houver
            if (parcelasQtd > 0 && datesVencimento && datesVencimento.length > 0 && novaVenda) {
              const valorParcela = (valorFaturado - valorColetado) / parcelasQtd;
              if (valorParcela > 0) {
                await createParcelas(datesVencimento.map((d, idx) => ({
                  vendaId: novaVenda.id,
                  valor: String(valorParcela),
                  vencimento: new Date(d),
                  status: "pendente" as const,
                  numeroParcela: idx + 2, // 1ª parcela já foi coletada
                })));
              }
            }

            // Salvar vendaId na promessa
            if (novaVenda) {
              await updatePromessa(id, { vendaId: novaVenda.id });
            }

            // Mover lead para "Venda Realizada" no pipeline
            const colunas = await getColunasPipeline();
            const colunaVenda = colunas.find(c => c.nome.toLowerCase().includes("venda realizada"));
            if (colunaVenda) {
              await createLead({
                colunaId: colunaVenda.id,
                nome: promessa.clienteNome,
                valor: String(valorColetado),
                consultorId: consultorId,
                observacoes: `Venda via promessa de pagamento`,
                mes: new Date().getMonth() + 1,
                ano: new Date().getFullYear(),
                ordem: 0,
              });
            }

            // Atualizar agendamento de origem se houver
            if (promessa.agendamentoId) {
              await updateAgendamento(promessa.agendamentoId, {
                resultouVenda: true,
                valorColetado: String(valorColetado),
                valorFaturado: String(valorFaturado),
              });
            }
          } catch (e) {
            console.error("[promessas.update] Erro ao criar venda:", e);
          }
        }

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
