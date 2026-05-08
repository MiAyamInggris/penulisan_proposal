import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const MAHASISWA_DATA = [
  { nim: "20104018", name: "Arisandi Fanansyah" },
  { nim: "20104095", name: "Muhammad Iqbal Ashari" },
  { nim: "2211104014", name: "Syahrul Zaki Khuzaini" },
  { nim: "2211104046", name: "Sabrina Nur Afifah" },
  { nim: "2211104062", name: "Muhammad Samudra" },
  { nim: "2211104064", name: "Dawnie Julian Nugroho" },
  { nim: "2211104065", name: "Muhammad Rizaldy Akbar" },
  { nim: "2211104067", name: "Aditya Sendi Hana Sahputra" },
  { nim: "2211104070", name: "Mohammad Fathurrohman" },
  { nim: "2211104074", name: "Elvaretta Anantya Velya" },
];

const DOSEN_DATA = [
  { name: "Nurlaili, S.Pd., M.Pd", email: "nurlaili@telkomuniversity.ac.id", nidn: "0001018001" },
  { name: "Faisal Dharma Adhinata, S.Kom., M.Cs", email: "faisal.adhinata@telkomuniversity.ac.id", nidn: "0002028002" },
  { name: "Gita Fadila Fitriana, S.Kom., M.Kom.", email: "gita.fitriana@telkomuniversity.ac.id", nidn: "0003038003" },
  { name: "Ariq Cahya Wardhana, S.Kom., M.Kom.", email: "ariq.wardhana@telkomuniversity.ac.id", nidn: "0004048004" },
  { name: "Rifki Adhitama, S.Kom., M.Kom.", email: "rifki.adhitama@telkomuniversity.ac.id", nidn: "0005058005" },
  { name: "Arief Rais Bahtiar, S.Kom., M.Kom.", email: "arief.bahtiar@telkomuniversity.ac.id", nidn: "0006068006" },
  { name: "Arif Amrulloh, S.Kom., M.Kom", email: "arif.amrulloh@telkomuniversity.ac.id", nidn: "0007078007" },
  { name: "Abednego Dwi Septiadi, S.Kom., M.Kom.", email: "abednego.septiadi@telkomuniversity.ac.id", nidn: "0008088008" },
  { name: "Condro Kartiko, S.Kom., M.T.I.", email: "condro.kartiko@telkomuniversity.ac.id", nidn: "0009098009" },
  { name: "Maryona Septiara, S.Pd., M.Kom.", email: "maryona.septiara@telkomuniversity.ac.id", nidn: "0010108010" },
  { name: "Yudha Islami Sulistya, S.Kom., M.Cs", email: "yudha.sulistya@telkomuniversity.ac.id", nidn: "0011118011" },
  { name: "Aditya Wijayanto, S.Kom., M.Cs", email: "aditya.wijayanto@telkomuniversity.ac.id", nidn: "0012128012" },
  { name: "Siti Khomsah, S.Kom., M.Cs.", email: "siti.khomsah@telkomuniversity.ac.id", nidn: "0013138013" },
  { name: "Aina Latifa Riyana Putri, S.Si., M.Mat.", email: "aina.riyana@telkomuniversity.ac.id", nidn: "0014148014" },
  { name: "Dian Kartika Sari, S.Si., M.Pd", email: "dian.kartika@telkomuniversity.ac.id", nidn: "0015158015" },
  { name: "Atika Ratna Dewi, S.Si., M.Sc", email: "atika.dewi@telkomuniversity.ac.id", nidn: "0016168016" },
  { name: "Ummi Athiyah, S.Kom., M.Kom", email: "ummi.athiyah@telkomuniversity.ac.id", nidn: "0017178017" },
  { name: "Eka Sahputra, S.Kom., M.Kom.", email: "eka.sahputra@telkomuniversity.ac.id", nidn: "0018188018" },
  { name: "Diah Septiani, S.Kom., M.C.S.", email: "diah.septiani@telkomuniversity.ac.id", nidn: "0019198019" },
  { name: "Nisrina Hanifa Setiono, S.Kom., M.Cs", email: "nisrina.setiono@telkomuniversity.ac.id", nidn: "0020208020" },
  { name: "Angga Kurniawan, S.Pd., M.Kom", email: "angga.kurniawan@telkomuniversity.ac.id", nidn: "0021218021" },
  { name: "Arif Riyandi, M.Kom.", email: "arif.riyandi@telkomuniversity.ac.id", nidn: "0022228022" },
  { name: "Dr. Didi Supriyadi, S.T., M.Kom., ITIL", email: "didi.supriyadi@telkomuniversity.ac.id", nidn: "0023238023" },
  { name: "Khairun Nisa Meiah Ngafidin, S.Pd., M.Kom", email: "khairun.ngafidin@telkomuniversity.ac.id", nidn: "0024248024" },
  { name: "Mahazam Afrad, S.Kom., M.Kom", email: "mahazam.afrad@telkomuniversity.ac.id", nidn: "0025258025" },
  { name: "Rona Nisa Sofia Amriza, S.Kom., M.T.I., M.I.M", email: "rona.amriza@telkomuniversity.ac.id", nidn: "0026268026" },
  { name: "Sena Wijayanto, S.Pd., M.T", email: "sena.wijayanto@telkomuniversity.ac.id", nidn: "0027278027" },
  { name: "Dr. Yogo Dwi Prasetyo, S.Si., M.Si.", email: "yogo.prasetyo@telkomuniversity.ac.id", nidn: "0028288028" },
  { name: "Dwi Mustika Kusumawardani, S.Kom., M.Kom.", email: "dwi.kusumawardani@telkomuniversity.ac.id", nidn: "0029298029" },
  { name: "Muhamad Awiet Wiedanto Prasetyo, M.MSI.", email: "awiet.prasetyo@telkomuniversity.ac.id", nidn: "0030308030" },
  { name: "M Yoka Fathoni, S.Kom., M.Kom", email: "yoka.fathoni@telkomuniversity.ac.id", nidn: "0031318031" },
  { name: "Resad Setyadi, S.T., S.Si., MMSI., Ph.D", email: "resad.setyadi@telkomuniversity.ac.id", nidn: "0032328032" },
  { name: "Sarah Astiti, S.Kom., M.MT", email: "sarah.astiti@telkomuniversity.ac.id", nidn: "0033338033" },
  { name: "Sisilia Thya Safitri, S.T., M.T", email: "sisilia.safitri@telkomuniversity.ac.id", nidn: "0034348034" },
  { name: "Sukmadiningtyas, S.Kom., M.Kom", email: "sukmadiningtyas@telkomuniversity.ac.id", nidn: "0035358035" },
  { name: "Yudha Saintika, S.T., M.T.I", email: "yudha.saintika@telkomuniversity.ac.id", nidn: "0036368036" },
  { name: "Hari Widi Utomo, S.Pd., M.Ed.", email: "hari.utomo@telkomuniversity.ac.id", nidn: "0037378037" },
];

async function main() {
  console.log("🌱 Seeding real dosen & mahasiswa data...");

  const hashedDosen = await bcrypt.hash("dosen123", 10);
  const hashedMhs = await bcrypt.hash("mahasiswa123", 10);

  // Upsert all dosen
  const dosenResults = await Promise.all(
    DOSEN_DATA.map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: { name: d.name },
        create: {
          name: d.name,
          email: d.email,
          password: hashedDosen,
          role: "DOSEN",
          identifier: d.nidn,
        },
      })
    )
  );
  console.log(`✅ Upserted ${dosenResults.length} dosen`);

  // Upsert all mahasiswa
  const mhsResults = await Promise.all(
    MAHASISWA_DATA.map((m) =>
      prisma.user.upsert({
        where: { email: `${m.nim}@student.telkomuniversity.ac.id` },
        update: { name: m.name },
        create: {
          name: m.name,
          email: `${m.nim}@student.telkomuniversity.ac.id`,
          password: hashedMhs,
          role: "MAHASISWA",
          identifier: m.nim,
        },
      })
    )
  );
  console.log(`✅ Upserted ${mhsResults.length} mahasiswa`);

  console.log("\n🎉 Real data seeding complete!");
  console.log("\n📋 Credentials (all passwords):");
  console.log("  Dosen:     <email>@telkomuniversity.ac.id / dosen123");
  console.log("  Mahasiswa: <nim>@student.telkomuniversity.ac.id / mahasiswa123");
  console.log("\n📋 Dosen emails:");
  DOSEN_DATA.forEach((d) => console.log(`  ${d.email}`));
  console.log("\n📋 Mahasiswa (NIM = email prefix & login identifier):");
  MAHASISWA_DATA.forEach((m) => console.log(`  ${m.nim} – ${m.name}`));
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
