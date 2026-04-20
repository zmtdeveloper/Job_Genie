"use server";

import { db } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getOrCreateIndustryInsight } from "./dashboard";
import { requireDbUser } from "@/lib/server-user";
import { withDbRetry } from "@/lib/prisma";

export async function updateUser(data) {
  const user = await requireDbUser({
    id: true,
  });

  try {
    const industryInsight = await getOrCreateIndustryInsight(data.industry);

    const updatedUser = await withDbRetry(() =>
      db.user.update({
        where: {
          id: user.id,
        },
        data: {
          industry: data.industry,
          experience: data.experience,
          bio: data.bio,
          skills: data.skills,
        },
      })
    );

    revalidatePath("/");
    revalidatePath("/dashboard");
    return {
      success: true,
      user: updatedUser,
      industryInsight,
    };
  } catch (error) {
    console.error("Error updating user and industry:", error.message);
    throw new Error("Failed to update profile");
  }
}

export async function getUserOnboardingStatus() {
  const user = await requireDbUser({
    industry: true,
  });

  return {
    isOnboarded: !!user.industry,
  };
}
