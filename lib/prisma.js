import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../generated/prisma/client";

const globalForPrisma = globalThis;
const PRISMA_CACHE_KEY = "__jobGeniePrismaClient";

function hasExpectedModels(client) {
  return Boolean(
    client &&
      typeof client.user?.findUnique === "function" &&
      typeof client.savedJob?.findMany === "function" &&
      typeof client.chatConversation?.findMany === "function" &&
      typeof client.chatMessage?.findMany === "function"
  );
}

function createPrismaClient() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 300000,
  });

  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter });
}

const cachedClient = globalForPrisma[PRISMA_CACHE_KEY];

export const db = hasExpectedModels(cachedClient)
  ? cachedClient
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma[PRISMA_CACHE_KEY] = db;
}
