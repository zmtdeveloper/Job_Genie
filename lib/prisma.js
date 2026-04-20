import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis;
const PRISMA_CACHE_KEY = "__jobGeniePrismaClient";
const PRISMA_POOL_CACHE_KEY = "__jobGeniePrismaPool";
const PRISMA_WARMUP_PROMISE_KEY = "__jobGeniePrismaWarmupPromise";

function readPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hasExpectedModels(client) {
  return Boolean(
    client &&
      typeof client.user?.findUnique === "function" &&
      typeof client.savedJob?.findMany === "function" &&
      typeof client.chatConversation?.findMany === "function" &&
      typeof client.chatMessage?.findMany === "function"
  );
}

function createPool() {
  const cachedPool = globalForPrisma[PRISMA_POOL_CACHE_KEY];

  if (cachedPool instanceof Pool) {
    return cachedPool;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: readPositiveInteger(
      process.env.PG_CONNECTION_TIMEOUT_MS,
      45000
    ),
    idleTimeoutMillis: readPositiveInteger(
      process.env.PG_IDLE_TIMEOUT_MS,
      300000
    ),
    max: readPositiveInteger(
      process.env.PG_POOL_MAX,
      process.env.NODE_ENV === "production" ? 10 : 1
    ),
    maxLifetimeSeconds: readPositiveInteger(
      process.env.PG_MAX_LIFETIME_SECONDS,
      60
    ),
    keepAlive: true,
  });

  pool.on("error", (error) => {
    console.error("Postgres pool error:", error?.message || error);
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma[PRISMA_POOL_CACHE_KEY] = pool;
  }

  return pool;
}

function createWarmupPromise() {
  const cachedWarmupPromise = globalForPrisma[PRISMA_WARMUP_PROMISE_KEY];

  if (cachedWarmupPromise) {
    return cachedWarmupPromise;
  }

  const warmupPromise = createPool()
    .query("select 1")
    .catch((error) => {
      console.error("Postgres warmup query failed:", error?.message || error);
      throw error;
    });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma[PRISMA_WARMUP_PROMISE_KEY] = warmupPromise;
  }

  return warmupPromise;
}

function createPrismaClient() {
  const adapter = new PrismaPg(createPool());

  return new PrismaClient({ adapter });
}

const cachedClient = globalForPrisma[PRISMA_CACHE_KEY];

export const db = hasExpectedModels(cachedClient)
  ? cachedClient
  : createPrismaClient();

export async function ensureDbConnection() {
  await createWarmupPromise();
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CACHE_KEY] = db;
}
