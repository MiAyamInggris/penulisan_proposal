import { prisma } from "@/lib/prisma";

const DEFAULT_GLOBAL_QUOTA = 5;

export async function getGlobalQuota(): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key: "global_quota" } });
  if (!setting) return DEFAULT_GLOBAL_QUOTA;
  const val = parseInt(setting.value, 10);
  return isNaN(val) ? DEFAULT_GLOBAL_QUOTA : val;
}

export async function setGlobalQuota(value: number): Promise<void> {
  await prisma.setting.upsert({
    where: { key: "global_quota" },
    update: { value: String(value) },
    create: { key: "global_quota", value: String(value) },
  });
}
