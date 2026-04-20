import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis;
const PRISMA_CACHE_KEY = "__jobGeniePrismaClient";
const PRISMA_POOL_CACHE_KEY = "__jobGeniePrismaPool";
const PRISMA_WARMUP_PROMISE_KEY = "__jobGeniePrismaWarmupPromise";
const DEFAULT_DB_RETRIES = 2;
const DEFAULT_DB_RETRY_DELAY_MS = 400;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearWarmupPromise() {
  if (process.env.NODE_ENV !== "production") {
    delete globalForPrisma[PRISMA_WARMUP_PROMISE_KEY];
  }
}

export function isTransientDatabaseError(error) {
  const message = String(error?.message || "").toLowerCase();
  const cause = String(error?.cause?.message || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();

  return (
    [
      "P1001",
      "57P01",
      "57P02",
      "57P03",
      "ECONNRESET",
      "ETIMEDOUT",
      "ECONNREFUSED",
    ].includes(code) ||
    message.includes("connection terminated") ||
    message.includes("connection timeout") ||
    message.includes("timed out") ||
    message.includes("can't reach database server") ||
    message.includes("server has closed the connection") ||
    cause.includes("connection terminated") ||
    cause.includes("connection timeout") ||
    cause.includes("timed out")
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
      clearWarmupPromise();
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

export async function withDbRetry(
  operation,
  {
    maxRetries = DEFAULT_DB_RETRIES,
    retryDelayMs = DEFAULT_DB_RETRY_DELAY_MS,
    warmup = true,
  } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      if (warmup) {
        await ensureDbConnection();
      }

      return await operation();
    } catch (error) {
      lastError = error;

      if (!isTransientDatabaseError(error) || attempt === maxRetries) {
        throw error;
      }

      clearWarmupPromise();
      await sleep(retryDelayMs * (attempt + 1));
    }
  }

  throw lastError;
}

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CACHE_KEY] = db;
}
