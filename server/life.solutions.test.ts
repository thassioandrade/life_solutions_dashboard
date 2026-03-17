import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@lifesolutions.com",
    name: "Admin Life",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    avatarUrl: null,
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: any) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createUserContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "consultor-user",
    email: "consultor@lifesolutions.com",
    name: "Consultor Life",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    avatarUrl: null,
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

describe("auth.logout", () => {
  it("clears session cookie and returns success", async () => {
    const { ctx, clearedCookies } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBeDefined();
  });
});

describe("auth.me", () => {
  it("returns current user when authenticated", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
    expect(result?.email).toBe("admin@lifesolutions.com");
  });

  it("returns null when not authenticated", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });
});

describe("role-based access control", () => {
  it("admin can access protected procedures", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    // Admin can access consultores.list
    const consultores = await caller.consultores.list();
    expect(Array.isArray(consultores)).toBe(true);
  });

  it("user can access consultores.list", async () => {
    const ctx = createUserContext();
    const caller = appRouter.createCaller(ctx);
    // Users can also list consultores
    const consultores = await caller.consultores.list();
    expect(Array.isArray(consultores)).toBe(true);
  });
});

describe("dashboard.stats", () => {
  it("returns stats object with expected shape", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.dashboard.stats({ mes: 1, ano: 2025 });
    expect(stats).toHaveProperty("totalColetado");
    expect(stats).toHaveProperty("totalFaturado");
    expect(stats).toHaveProperty("totalComissoes");
    expect(stats).toHaveProperty("agendamentos");
    expect(stats.agendamentos).toHaveProperty("total");
    expect(stats.agendamentos).toHaveProperty("realizadas");
    expect(typeof stats.totalColetado).toBe("number");
    expect(typeof stats.lucroLiquido).toBe("number");
  });
});

describe("consultores.list", () => {
  it("returns array of consultores", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.consultores.list();
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("agendamentos.listByPeriod", () => {
  it("returns array of agendamentos for given period", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.agendamentos.listByPeriod({ mes: 1, ano: 2025 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("vendas.listByPeriod", () => {
  it("returns array of vendas for given period", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.vendas.listByPeriod({ mes: 1, ano: 2025 });
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("pipeline.getColunas", () => {
  it("returns array of pipeline columns", async () => {
    const { ctx } = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pipeline.getColunas();
    expect(Array.isArray(result)).toBe(true);
  });
});
