import bcrypt from "bcryptjs";
import { pool } from "../config/database.ts";

async function seedUsers() {
  const client = await pool.connect();

  try {
    console.log(
      "⏳ Memulai proses seeding data users dummy (tanpa nama asli)...",
    );

    // Hash password default untuk semua user pengujian ("Password123!")
    const defaultPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Data sampel pengguna menggunakan nama samaran / anonim
    const dummyUsers = [
      {
        npk: "982144",
        nama: "Booker User Test",
        email: "booker.test@bpjsketenagakerjaan.go.id",
        jabatan: "Official Booker",
        golongan: "III/C",
        unitKode: "KP-UMUM-SDM",
        unitNama: "Kantor Pusat - Divisi Umum & SDM",
        initials: "BT",
        role: "OFFICIAL_BOOKER",
      },
      {
        npk: "88102910",
        nama: "Pejabat Penyetuju Test",
        email: "approver.test@bpjsketenagakerjaan.go.id",
        jabatan: "Kepala Kantor Wilayah",
        golongan: "IV/E",
        unitKode: "KANWIL-JATIM",
        unitNama: "Kantor Wilayah Jawa Timur",
        initials: "PT",
        role: "APPROVER_KAKANWIL",
      },
      {
        npk: "21040889",
        nama: "Admin Travel Test",
        email: "admin.travel@bpjsketenagakerjaan.go.id",
        jabatan: "Admin Travel",
        golongan: "III/B",
        unitKode: "KP-UMUM-SDM",
        unitNama: "Kantor Pusat - Divisi Umum & SDM",
        initials: "AT",
        role: "ADMIN_TRAVEL_KP",
      },
      {
        npk: "19034451",
        nama: "Admin Anggaran OTI Test",
        email: "admin.anggaran@bpjsketenagakerjaan.go.id",
        jabatan: "Admin Anggaran / OTI",
        golongan: "IV/A",
        unitKode: "KP-KEUANGAN",
        unitNama: "Kantor Pusat - Deputi Direktur Keuangan",
        initials: "AO",
        role: "ASDEP_KEUANGAN",
      },
      {
        npk: "10000001",
        nama: "Super Admin E-TO",
        email: "super.admin@bpjsketenagakerjaan.go.id",
        jabatan: "System Administrator",
        golongan: "IV/E",
        unitKode: "KP-TI",
        unitNama: "Kantor Pusat - TI & Transformasi Digital",
        initials: "SA",
        role: "SUPER_ADMIN",
      },
    ];

    // Query INSERT dengan klausa UPSERT (ON CONFLICT)
    for (const user of dummyUsers) {
      const query = `
        INSERT INTO users (
          npk, nama_lengkap, email, password_hash, 
          jabatan, golongan, unit_kerja_kode, 
          unit_kerja_nama, avatar_initials, role
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (npk) DO UPDATE 
        SET nama_lengkap = EXCLUDED.nama_lengkap,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            jabatan = EXCLUDED.jabatan,
            avatar_initials = EXCLUDED.avatar_initials,
            password_hash = EXCLUDED.password_hash;
      `;

      await client.query(query, [
        user.npk,
        user.nama,
        user.email,
        hashedPassword,
        user.jabatan,
        user.golongan,
        user.unitKode,
        user.unitNama,
        user.initials,
        user.role,
      ]);
    }

    console.log("✅ Seeding data users anonim berhasil!");
    console.log("🔑 Akun Pengujian yang Siap Digunakan:");
    console.log(
      " - Official Booker      : booker.test@bpjsketenagakerjaan.go.id (Role: OFFICIAL_BOOKER)",
    );
    console.log(
      " - Pejabat              : approver.test@bpjsketenagakerjaan.go.id (Role: APPROVER_KAKANWIL)",
    );
    console.log(
      " - Admin Travel         : admin.travel@bpjsketenagakerjaan.go.id (Role: ADMIN_TRAVEL_KP)",
    );
    console.log(
      " - Admin Anggaran / OTI : admin.anggaran@bpjsketenagakerjaan.go.id (Role: ASDEP_KEUANGAN)",
    );
    console.log(" 🔑 Password Default: Password123!");
  } catch (error) {
    console.error("❌ Terjadi kesalahan saat seeding:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Jalankan seeder
seedUsers();
