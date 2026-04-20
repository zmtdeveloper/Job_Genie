import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { db, withDbRetry } from "./prisma";

export const checkUser = cache(async () => {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const loggedInUser = await withDbRetry(() =>
      db.user.findUnique({
        where: {
          clerkUserId: userId,
        },
      })
    );

    if (loggedInUser) {
      return loggedInUser;
    }

    const user = await currentUser();

    if (!user) {
      return null;
    }

    const name = [user.firstName, user.lastName].filter(Boolean).join(" ");

    const ensuredUser = await withDbRetry(() =>
      db.user.upsert({
        where: {
          clerkUserId: user.id,
        },
        update: {
          name,
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0].emailAddress,
        },
        create: {
          clerkUserId: user.id,
          name,
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0].emailAddress,
        },
      })
    );

    return ensuredUser;
  } catch (error) {
    console.error("checkUser error:", error.message);

    if (userId) {
      try {
        const fallbackUser = await withDbRetry(
          () =>
            db.user.findUnique({
              where: {
                clerkUserId: userId,
              },
            }),
          { maxRetries: 1 }
        );

        if (fallbackUser) {
          return fallbackUser;
        }
      } catch (fallbackError) {
        console.error("checkUser fallback error:", fallbackError.message);
      }
    }

    throw new Error("Unable to load your account right now.");
  }
});
