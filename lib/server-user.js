import { auth } from "@clerk/nextjs/server";
import { db, withDbRetry } from "./prisma";

function normalizeSelect(select) {
  if (
    select &&
    typeof select === "object" &&
    "select" in select &&
    select.select &&
    typeof select.select === "object"
  ) {
    return select.select;
  }

  return select;
}

export async function requireAuthUserId() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function findDbUserByClerkId(clerkUserId, select) {
  if (!clerkUserId) {
    return null;
  }

  const normalizedSelect = normalizeSelect(select);

  return withDbRetry(() =>
    db.user.findUnique({
      where: { clerkUserId },
      ...(normalizedSelect ? { select: normalizedSelect } : {}),
    })
  );
}

export async function requireDbUser(select) {
  const clerkUserId = await requireAuthUserId();
  const user = await findDbUserByClerkId(clerkUserId, select);

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
