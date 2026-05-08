import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PROPOSAL_TOPICS = [
  {
    titleId: "Implementasi Machine Learning untuk Deteksi Fraud pada Transaksi Digital",
    titleEn: "Machine Learning Implementation for Fraud Detection in Digital Transactions",
    topicArea: "Machine Learning & Keamanan Siber",
  },
  {
    titleId: "Pengembangan Aplikasi Mobile untuk Monitoring Kesehatan Berbasis IoT",
    titleEn: "Mobile Application Development for IoT-Based Health Monitoring",
    topicArea: "IoT & Mobile Computing",
  },
  {
    titleId: "Sistem Rekomendasi Konten E-Learning Menggunakan Deep Learning",
    titleEn: "E-Learning Content Recommendation System Using Deep Learning",
    topicArea: "Deep Learning & Pendidikan Digital",
  },
  {
    titleId: "Analisis Sentimen Ulasan Produk Menggunakan Natural Language Processing",
    titleEn: "Product Review Sentiment Analysis Using Natural Language Processing",
    topicArea: "NLP & Text Mining",
  },
  {
    titleId: "Optimasi Rute Pengiriman Logistik Menggunakan Algoritma Genetika",
    titleEn: "Logistics Delivery Route Optimization Using Genetic Algorithm",
    topicArea: "Optimasi & Algoritma",
  },
  {
    titleId: "Pengembangan Chatbot Layanan Pelanggan Berbasis Transformer",
    titleEn: "Customer Service Chatbot Development Based on Transformer",
    topicArea: "NLP & Conversational AI",
  },
  {
    titleId: "Sistem Deteksi Penyakit Tanaman Menggunakan Convolutional Neural Network",
    titleEn: "Plant Disease Detection System Using Convolutional Neural Network",
    topicArea: "Computer Vision & Pertanian Cerdas",
  },
  {
    titleId: "Analisis Big Data untuk Prediksi Churn Pelanggan Telekomunikasi",
    titleEn: "Big Data Analysis for Telecommunication Customer Churn Prediction",
    topicArea: "Big Data & Business Intelligence",
  },
  {
    titleId: "Implementasi Blockchain untuk Transparansi Rantai Pasok Pangan",
    titleEn: "Blockchain Implementation for Food Supply Chain Transparency",
    topicArea: "Blockchain & Supply Chain",
  },
  {
    titleId: "Pengembangan Sistem Informasi Manajemen Aset Berbasis Web",
    titleEn: "Web-Based Asset Management Information System Development",
    topicArea: "Sistem Informasi & Web",
  },
  {
    titleId: "Klasifikasi Citra Medis untuk Deteksi Kanker Kulit Menggunakan Transfer Learning",
    titleEn: "Medical Image Classification for Skin Cancer Detection Using Transfer Learning",
    topicArea: "Computer Vision & Kesehatan",
  },
  {
    titleId: "Sistem Manajemen Energi Cerdas untuk Gedung Perkantoran Berbasis IoT",
    titleEn: "Smart Energy Management System for Office Buildings Based on IoT",
    topicArea: "IoT & Energi Terbarukan",
  },
  {
    titleId: "Pengembangan Platform E-Commerce dengan Fitur Augmented Reality",
    titleEn: "E-Commerce Platform Development with Augmented Reality Features",
    topicArea: "AR/VR & E-Commerce",
  },
  {
    titleId: "Analisis Keamanan Jaringan Menggunakan Intrusion Detection System Berbasis AI",
    titleEn: "Network Security Analysis Using AI-Based Intrusion Detection System",
    topicArea: "Keamanan Jaringan & AI",
  },
  {
    titleId: "Prediksi Harga Saham Menggunakan Long Short-Term Memory (LSTM)",
    titleEn: "Stock Price Prediction Using Long Short-Term Memory (LSTM)",
    topicArea: "Deep Learning & Keuangan",
  },
];

const STATUSES = [
  "ENROLLED", "BIMBINGAN", "BIMBINGAN", "BIMBINGAN",
  "DE_SUBMITTED", "DE_SUBMITTED", "DE_SCORED", "DE_SCORED",
  "DE_REVISED", "SEMINAR_SCHEDULED", "SEMINAR_COMPLETED",
  "COMPLETED", "BIMBINGAN", "ENROLLED", "DE_SUBMITTED",
];

async function main() {
  console.log("🌱 Seeding extra data...");

  const hashedPw = await bcrypt.hash("dosen123", 10);
  const hashedMhs = await bcrypt.hash("mahasiswa123", 10);
  const hashedPb = await bcrypt.hash("pembimbing123", 10);

  // ── 5 extra dosen (PEMBIMBING role) ────────────────────────────────
  const dosenData = [
    { name: "Dr. Rizal Firmansyah, M.T.", email: "rizal@telkomuniversity.ac.id", identifier: "19780315200501003" },
    { name: "Dr. Nina Kusuma, M.Kom.", email: "nina@telkomuniversity.ac.id", identifier: "19820720201001004" },
    { name: "Dr. Hendra Wijaya, M.Sc.", email: "hendra@telkomuniversity.ac.id", identifier: "19791105200601005" },
    { name: "Dr. Dewi Rahayu, M.T.", email: "dewi@telkomuniversity.ac.id", identifier: "19850301201201006" },
    { name: "Dr. Agung Prasetyo, M.Kom.", email: "agung.p@telkomuniversity.ac.id", identifier: "19760812200401007" },
  ];

  const dosenUsers = await Promise.all(
    dosenData.map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: { ...d, password: hashedPb, roles: ["PEMBIMBING"] },
      })
    )
  );
  console.log(`✅ Created ${dosenUsers.length} dosen`);

  // Grab existing dosen kelas user and RPL program
  const dosenKelas = await prisma.user.findUnique({
    where: { email: "dosen.kelas@telkomuniversity.ac.id" },
  });
  if (!dosenKelas) throw new Error("DosenKelas user not found – run main seed first");

  const [existingPembimbing1] = await prisma.user.findMany({
    where: { roles: { has: "PEMBIMBING" } },
    orderBy: { createdAt: "asc" },
    take: 1,
  });

  const allPembimbing = [existingPembimbing1, ...dosenUsers];

  const rplProgram = await prisma.program.findUnique({ where: { code: "RPL" } });
  const ifProgram  = await prisma.program.findUnique({ where: { code: "IF"  } });
  if (!rplProgram || !ifProgram) throw new Error("Programs not found – run main seed first");

  // ── Class B (RPL) ──────────────────────────────────────────────────
  const classB = await prisma.class.upsert({
    where: { id: "demo-class-002" },
    update: {},
    create: {
      id: "demo-class-002",
      code: "CCH4A3-02",
      name: "Penulisan Proposal TA – Kelas B",
      semester: "Ganjil",
      academicYear: "2024/2025",
      programId: rplProgram.id,
      dosenKelasId: dosenKelas.id,
      deDeadline: new Date("2025-01-31T23:59:59"),
    },
  });

  // ── Class C (IF) ───────────────────────────────────────────────────
  const classC = await prisma.class.upsert({
    where: { id: "demo-class-003" },
    update: {},
    create: {
      id: "demo-class-003",
      code: "CCH4A3-03",
      name: "Penulisan Proposal TA – Kelas C (IF)",
      semester: "Ganjil",
      academicYear: "2024/2025",
      programId: ifProgram.id,
      dosenKelasId: dosenKelas.id,
      deDeadline: new Date("2025-02-15T23:59:59"),
    },
  });

  console.log("✅ Created 2 classes");

  // ── 15 mahasiswa for each class ────────────────────────────────────
  for (const [classIdx, cls] of [[0, classB], [1, classC]] as [number, typeof classB][]) {
    for (let i = 0; i < 15; i++) {
      const nim = `13012${String(classIdx + 2).padStart(2, "0")}${String(i + 1).padStart(3, "0")}`;
      const email = `mhs.${nim}@student.telkomuniversity.ac.id`;
      const topicIdx = i % PROPOSAL_TOPICS.length;
      const topic = PROPOSAL_TOPICS[i];
      const status = STATUSES[i];

      const mahasiswa = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: `Mahasiswa ${cls.code} ${String(i + 1).padStart(2, "0")}`,
          email,
          password: hashedMhs,
          roles: ["MAHASISWA"],
          identifier: nim,
        },
      });

      const enrollment = await prisma.classEnrollment.upsert({
        where: { classId_studentId: { classId: cls.id, studentId: mahasiswa.id } },
        update: {},
        create: { classId: cls.id, studentId: mahasiswa.id },
      });

      // Assign supervisors (round-robin from all pembimbing)
      const sup1 = allPembimbing[i % allPembimbing.length];
      const sup2 = allPembimbing[(i + 1) % allPembimbing.length];

      const proposal = await prisma.proposal.upsert({
        where: { enrollmentId: enrollment.id },
        update: {},
        create: {
          enrollmentId: enrollment.id,
          titleId: topic.titleId,
          titleEn: topic.titleEn,
          topicArea: topic.topicArea,
          status: status as never,
          supervisor1RequestedId: sup1.id,
          supervisor1AssignedId: sup1.id,
          supervisor2RequestedId: sup2.id !== sup1.id ? sup2.id : null,
          supervisor2AssignedId: sup2.id !== sup1.id ? sup2.id : null,
        },
      });

      // Add bimbingan sessions for non-ENROLLED statuses
      if (status !== "ENROLLED") {
        const sessionCount = status === "BIMBINGAN" ? 2 : 3;
        for (let s = 0; s < sessionCount; s++) {
          const existing = await prisma.bimbinganSession.findFirst({
            where: { proposalId: proposal.id, sessionNumber: s + 1 },
          });
          if (!existing) {
            await prisma.bimbinganSession.create({
              data: {
                proposalId: proposal.id,
                sessionNumber: s + 1,
                date: new Date(2024, 9 + Math.floor(s / 2), 5 + s * 7),
                topicsDiscussed: `Sesi ${s + 1}: Diskusi ${topic.topicArea}`,
                nextPlan: `Rencana sesi ${s + 2}: Lanjutkan riset`,
                notes: s === 0 ? "Mahasiswa menunjukkan pemahaman yang baik" : null,
              },
            });
          }
        }
      }

      // Add DE for statuses past DE_SUBMITTED
      if (["DE_SUBMITTED","DE_SCORED","DE_REVISED","SEMINAR_SCHEDULED","SEMINAR_COMPLETED","COMPLETED"].includes(status)) {
        const deReviewer = dosenUsers[i % dosenUsers.length];
        await prisma.deskEvaluation.upsert({
          where: { proposalId: proposal.id },
          update: {},
          create: {
            proposalId: proposal.id,
            reviewerId: deReviewer.id,
            latarBelakang: 18 + (i % 6),
            formulasiMasalah: 22 + (i % 7),
            teoriPendukung: 20 + (i % 8),
            ideMetode: 10 + (i % 5),
            isLate: i % 5 === 0,
            catatanReviewer: i % 3 === 0 ? "Perlu diperkuat pada bagian latar belakang" : null,
          },
        });

        // Update proposal with desk evaluator
        await prisma.proposal.update({
          where: { id: proposal.id },
          data: { deskEvaluatorId: deReviewer.id },
        });
      }
    }
    console.log(`✅ Created 15 mahasiswa + proposals for ${cls.code}`);
  }

  console.log("\n🎉 Extra seeding complete!");
  console.log("\n📋 Extra Credentials (all dosen password: pembimbing123):");
  dosenData.forEach((d) => console.log(`  ${d.name}: ${d.email}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
