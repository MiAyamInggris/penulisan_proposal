import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Programs
  const programs = await Promise.all([
    prisma.program.upsert({
      where: { code: "RPL" },
      update: {},
      create: {
        name: "Rekayasa Perangkat Lunak",
        code: "RPL",
        literatureReviewPct: 15,
        bimbinganPct: 25,
        deskEvaluationPct: 40,
        presentasiPct: 20,
      },
    }),
    prisma.program.upsert({
      where: { code: "IF" },
      update: {},
      create: {
        name: "Teknik Informatika",
        code: "IF",
        literatureReviewPct: 15,
        bimbinganPct: 25,
        deskEvaluationPct: 40,
        presentasiPct: 20,
      },
    }),
    prisma.program.upsert({
      where: { code: "DS" },
      update: {},
      create: {
        name: "Sains Data",
        code: "DS",
        literatureReviewPct: 15,
        bimbinganPct: 25,
        deskEvaluationPct: 40,
        presentasiPct: 20,
      },
    }),
    prisma.program.upsert({
      where: { code: "SI" },
      update: {},
      create: {
        name: "Sistem Informasi",
        code: "SI",
        literatureReviewPct: 30,
        bimbinganPct: 40,
        deskEvaluationPct: 10,
        presentasiPct: 20,
      },
    }),
  ]);

  console.log("✅ Programs seeded");

  // Users
  const hashedAdmin = await bcrypt.hash("admin123", 10);
  const hashedDosen = await bcrypt.hash("dosen123", 10);
  const hashedPembimbing = await bcrypt.hash("pembimbing123", 10);
  const hashedMahasiswa = await bcrypt.hash("mahasiswa123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@telkomuniversity.ac.id" },
    update: {},
    create: {
      name: "Administrator Sistem",
      email: "admin@telkomuniversity.ac.id",
      password: hashedAdmin,
      roles: ["ADMIN"],
      identifier: "A000001",
    },
  });

  const dosenKelas = await prisma.user.upsert({
    where: { email: "dosen.kelas@telkomuniversity.ac.id" },
    update: {},
    create: {
      name: "Dr. Budi Santoso, M.T.",
      email: "dosen.kelas@telkomuniversity.ac.id",
      password: hashedDosen,
      roles: ["DOSEN_KELAS"],
      identifier: "19800101200501001",
    },
  });

  const pembimbing = await prisma.user.upsert({
    where: { email: "pembimbing@telkomuniversity.ac.id" },
    update: {},
    create: {
      name: "Dr. Sari Dewi, M.Kom.",
      email: "pembimbing@telkomuniversity.ac.id",
      password: hashedPembimbing,
      roles: ["PEMBIMBING"],
      identifier: "19850601201001002",
    },
  });

  const mahasiswa = await prisma.user.upsert({
    where: { email: "mahasiswa@telkomuniversity.ac.id" },
    update: {},
    create: {
      name: "Agus Prasetyo",
      email: "mahasiswa@telkomuniversity.ac.id",
      password: hashedMahasiswa,
      roles: ["MAHASISWA"],
      identifier: "1301210001",
    },
  });

  console.log("✅ Users seeded");

  // Class
  const rplProgram = programs[0];

  const demoClass = await prisma.class.upsert({
    where: { id: "demo-class-001" },
    update: {},
    create: {
      id: "demo-class-001",
      code: "CCH4A3-01",
      name: "Penulisan Proposal TA – Kelas A",
      semester: "Ganjil",
      academicYear: "2024/2025",
      programId: rplProgram.id,
      dosenKelasId: dosenKelas.id,
      deDeadline: new Date("2025-01-31T23:59:59"),
    },
  });

  console.log("✅ Class seeded");

  // Enrollment
  const enrollment = await prisma.classEnrollment.upsert({
    where: { classId_studentId: { classId: demoClass.id, studentId: mahasiswa.id } },
    update: {},
    create: {
      classId: demoClass.id,
      studentId: mahasiswa.id,
    },
  });

  // Proposal for demo student
  const proposal = await prisma.proposal.upsert({
    where: { enrollmentId: enrollment.id },
    update: {},
    create: {
      enrollmentId: enrollment.id,
      titleId: "Pengembangan Sistem Rekomendasi Topik Penelitian Menggunakan Metode Collaborative Filtering Berbasis Machine Learning",
      titleEn: "Development of Research Topic Recommendation System Using Collaborative Filtering Method Based on Machine Learning",
      topicArea: "Machine Learning & Recommender System",
      status: "BIMBINGAN",
      supervisor1RequestedId: pembimbing.id,
      supervisor1AssignedId: pembimbing.id,
    },
  });

  // Bimbingan sessions
  await prisma.bimbinganSession.createMany({
    skipDuplicates: true,
    data: [
      {
        proposalId: proposal.id,
        sessionNumber: 1,
        date: new Date("2024-10-05"),
        topicsDiscussed: "Diskusi awal topik penelitian dan pemilihan metode collaborative filtering",
        nextPlan: "Mencari literatur terkait collaborative filtering dan sistem rekomendasi",
        notes: "Mahasiswa diminta membawa minimal 10 paper referensi",
      },
      {
        proposalId: proposal.id,
        sessionNumber: 2,
        date: new Date("2024-10-19"),
        topicsDiscussed: "Review literatur yang telah dikumpulkan, diskusi gap penelitian",
        nextPlan: "Menyusun outline bab 1 dan 2 proposal",
        notes: "Progress baik, mahasiswa sudah menemukan research gap yang relevan",
      },
      {
        proposalId: proposal.id,
        sessionNumber: 3,
        date: new Date("2024-11-02"),
        topicsDiscussed: "Review outline proposal, diskusi metodologi penelitian",
        nextPlan: "Melengkapi proposal dan menyiapkan dokumen untuk DE",
      },
    ],
  });

  console.log("✅ Demo proposal & bimbingan sessions seeded");
  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Demo Credentials:");
  console.log("  Admin:      admin@telkomuniversity.ac.id / admin123");
  console.log("  DosenKelas: dosen.kelas@telkomuniversity.ac.id / dosen123");
  console.log("  Pembimbing: pembimbing@telkomuniversity.ac.id / pembimbing123");
  console.log("  Mahasiswa:  mahasiswa@telkomuniversity.ac.id / mahasiswa123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
