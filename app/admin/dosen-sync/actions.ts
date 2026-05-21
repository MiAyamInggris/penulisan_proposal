"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { DOSEN_REFERENCE, DosenEntry } from "./dosen-data";

type DbDosen = { id: string; name: string; email: string; identifier: string; isActive: boolean };

export type SyncUpdateItem = {
  ref: DosenEntry;
  current: DbDosen;
  changes: string[];
};

export type SyncDeactivateItem = {
  id: string;
  name: string;
  email: string;
  affectedProposals: number;
};

export type SyncPreview = {
  toCreate: DosenEntry[];
  toUpdate: SyncUpdateItem[];
  toDeactivate: SyncDeactivateItem[];
};

function matchRef(db: DbDosen): DosenEntry | undefined {
  const refByEmail = DOSEN_REFERENCE.find(
    (r) => r.email.toLowerCase() === db.email.toLowerCase()
  );
  if (refByEmail) return refByEmail;
  if (db.identifier) {
    return DOSEN_REFERENCE.find((r) => r.nip && r.nip === db.identifier);
  }
  return undefined;
}

export async function previewSync(): Promise<SyncPreview> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return { toCreate: [], toUpdate: [], toDeactivate: [] };
  }

  const dbDosen = await prisma.user.findMany({
    where: { role: "DOSEN" },
    select: { id: true, name: true, email: true, identifier: true, isActive: true },
  });

  const matchedRefEmails = new Set<string>();
  const matchedDbIds = new Set<string>();

  const toUpdate: SyncUpdateItem[] = [];

  for (const db of dbDosen) {
    const ref = matchRef(db);
    if (ref) {
      matchedDbIds.add(db.id);
      matchedRefEmails.add(ref.email.toLowerCase());
      const changes: string[] = [];
      if (db.name !== ref.name) changes.push(`nama: "${db.name}" → "${ref.name}"`);
      if (db.email.toLowerCase() !== ref.email.toLowerCase())
        changes.push(`email: "${db.email}" → "${ref.email}"`);
      if (db.identifier !== ref.nip)
        changes.push(`NIP: "${db.identifier}" → "${ref.nip}"`);
      if (!db.isActive) changes.push("reaktivasi akun");
      if (changes.length > 0) toUpdate.push({ ref, current: db, changes });
    }
  }

  const toDeactivate: SyncDeactivateItem[] = [];
  for (const db of dbDosen) {
    if (!matchedDbIds.has(db.id) && db.isActive) {
      const affectedProposals = await prisma.proposal.count({
        where: {
          OR: [
            { supervisor1AssignedId: db.id },
            { supervisor2AssignedId: db.id },
            { deskEvaluatorId: db.id },
          ],
        },
      });
      toDeactivate.push({ id: db.id, name: db.name, email: db.email, affectedProposals });
    }
  }

  const toCreate = DOSEN_REFERENCE.filter(
    (r) => !matchedRefEmails.has(r.email.toLowerCase())
  );

  return { toCreate, toUpdate, toDeactivate };
}

export async function executeSync(): Promise<
  { success: true; created: number; updated: number; deactivated: number } | { error: string }
> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    const preview = await previewSync();

    // Create new dosen accounts (initial password = NIP, fallback to email prefix)
    let created = 0;
    for (const ref of preview.toCreate) {
      const initialPassword = ref.nip || ref.email.split("@")[0];
      const hashed = await bcrypt.hash(initialPassword, 10);
      await prisma.user.create({
        data: {
          name: ref.name,
          email: ref.email,
          password: hashed,
          role: "DOSEN",
          identifier: ref.nip,
          isActive: true,
        },
      });
      created++;
    }

    // Update existing dosen (name, email, NIP, reactivate)
    let updated = 0;
    for (const { ref, current } of preview.toUpdate) {
      await prisma.user.update({
        where: { id: current.id },
        data: {
          name: ref.name,
          email: ref.email,
          identifier: ref.nip,
          isActive: true,
        },
      });
      updated++;
    }

    // Deactivate dosen no longer in reference and clear their proposal assignments
    let deactivated = 0;
    for (const db of preview.toDeactivate) {
      await prisma.user.update({
        where: { id: db.id },
        data: { isActive: false },
      });

      // supervisor1 on ASSIGNED/BIMBINGAN proposals → reset to PROPOSAL_UPLOADED
      const sv1Active = await prisma.proposal.findMany({
        where: {
          supervisor1AssignedId: db.id,
          status: { in: ["ASSIGNED", "BIMBINGAN"] },
        },
        select: { id: true },
      });
      for (const p of sv1Active) {
        await prisma.proposal.update({
          where: { id: p.id },
          data: { supervisor1AssignedId: null, status: "PROPOSAL_UPLOADED" },
        });
      }

      // supervisor1 in other statuses (e.g. DE_READY etc.) — just clear, no status change
      await prisma.proposal.updateMany({
        where: { supervisor1AssignedId: db.id },
        data: { supervisor1AssignedId: null },
      });

      // Clear supervisor2, requested supervisors, deskEvaluator — no status change
      await prisma.proposal.updateMany({
        where: { supervisor2AssignedId: db.id },
        data: { supervisor2AssignedId: null },
      });
      await prisma.proposal.updateMany({
        where: { supervisor1RequestedId: db.id },
        data: { supervisor1RequestedId: null },
      });
      await prisma.proposal.updateMany({
        where: { supervisor2RequestedId: db.id },
        data: { supervisor2RequestedId: null },
      });
      await prisma.proposal.updateMany({
        where: { deskEvaluatorId: db.id },
        data: { deskEvaluatorId: null },
      });

      deactivated++;
    }

    revalidatePath("/admin/dosen-sync");
    revalidatePath("/admin/users");

    return { success: true, created, updated, deactivated };
  } catch (err) {
    return { error: String(err) };
  }
}

// ─── KK Sync ─────────────────────────────────────────────────────────────────

export type KKSyncResult =
  | { success: true; kkCreated: number; dosenUpdated: number; dosenSkipped: number; dosenFailed: number }
  | { error: string };

export async function syncKKData(): Promise<KKSyncResult> {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return { error: "Unauthorized" };

  try {
    // Collect unique KK names from reference data
    const uniqueKKNames = [...new Set(DOSEN_REFERENCE.map((r) => r.kkNama))];

    // Upsert each KK by name — preserve id/ketuaId/members
    let kkCreated = 0;
    const kkByName = new Map<string, string>(); // nama → id

    for (const nama of uniqueKKNames) {
      const existing = await prisma.kelompokKeahlian.findFirst({ where: { nama } });
      if (existing) {
        kkByName.set(nama, existing.id);
      } else {
        const created = await prisma.kelompokKeahlian.create({
          data: { nama },
          select: { id: true },
        });
        kkByName.set(nama, created.id);
        kkCreated++;
      }
    }

    // Pre-load all dosen from DB for fast lookup
    const dbDosen = await prisma.user.findMany({
      where: { role: "DOSEN" },
      select: { id: true, email: true, identifier: true },
    });
    const byEmail = new Map(dbDosen.map((u) => [u.email.toLowerCase(), u]));
    const byNip = new Map(dbDosen.map((u) => [u.identifier.toLowerCase(), u]));

    let dosenUpdated = 0;
    let dosenSkipped = 0;
    let dosenFailed = 0;

    for (const ref of DOSEN_REFERENCE) {
      // Match: email first, then NIP/identifier
      const db =
        byEmail.get(ref.email.toLowerCase()) ??
        (ref.nip ? byNip.get(ref.nip.toLowerCase()) : undefined);

      if (!db) {
        dosenSkipped++;
        continue;
      }

      const kkId = kkByName.get(ref.kkNama);
      if (!kkId) {
        dosenFailed++;
        continue;
      }

      try {
        await prisma.user.update({
          where: { id: db.id },
          data: {
            kodeDosen: ref.kode,
            kelompokKeahlianId: kkId,
          },
        });
        dosenUpdated++;
      } catch {
        dosenFailed++;
      }
    }

    revalidatePath("/admin/dosen-sync");
    revalidatePath("/admin/kelompok-keahlian");
    revalidatePath("/admin/ketua-kk");
    revalidatePath("/ketua-kk/alokasi-pembimbing");

    return { success: true, kkCreated, dosenUpdated, dosenSkipped, dosenFailed };
  } catch (err) {
    return { error: String(err) };
  }
}
