import bcrypt from "bcryptjs";
import { pool } from "../config/database.ts";

async function seedUsers() {
  const client = await pool.connect();

  try {
    console.log("⏳ Memulai proses seeding data users & otorisasi roles...");

    // 1. Hash password default ("Password123!")
    const defaultPassword = "Password123!";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // 2. Data dummy pengguna yang disesuaikan dengan skema PostgreSQL terbaru
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
        noHp: "081234567890",
        roleCode: "OFFICIAL_BOOKER",
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
        noHp: "081398765432",
        roleCode: "APPROVER_KAKANWIL",
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
        noHp: "081122334455",
        roleCode: "ADMIN_TRAVEL_KP",
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
        noHp: "085678901234",
        roleCode: "ASDEP_KEUANGAN",
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
        noHp: "081900001111",
        roleCode: "SUPER_ADMIN",
      },
    ];

    // Mulai Transaksi Seeding
    await client.query("BEGIN");

    for (const user of dummyUsers) {
      // A. UPSERT Ke Tabel `users`
      const queryUser = `
        INSERT INTO users (
          npk, nama_lengkap, email, password_hash, 
          jabatan, golongan, unit_kerja_kode, 
          unit_kerja_nama, avatar_initials, role, no_hp, is_active
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
        ON CONFLICT (npk) DO UPDATE 
        SET nama_lengkap = EXCLUDED.nama_lengkap,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            jabatan = EXCLUDED.jabatan,
            golongan = EXCLUDED.golongan,
            unit_kerja_kode = EXCLUDED.unit_kerja_kode,
            unit_kerja_nama = EXCLUDED.unit_kerja_nama,
            avatar_initials = EXCLUDED.avatar_initials,
            no_hp = EXCLUDED.no_hp,
            password_hash = EXCLUDED.password_hash
        RETURNING id;
      `;

      const resUser = await client.query(queryUser, [
        user.npk,
        user.nama,
        user.email,
        hashedPassword,
        user.jabatan,
        user.golongan,
        user.unitKode,
        user.unitNama,
        user.initials,
        user.roleCode,
        user.noHp,
      ]);

      const userId = resUser.rows[0].id;

      // B. Sinkronisasi Otomatis ke Tabel Relasi `user_roles`
      const queryRole = `SELECT id FROM roles WHERE code = $1`;
      const resRole = await client.query(queryRole, [user.roleCode]);

      if (resRole.rows.length > 0) {
        const roleId = resRole.rows[0].id;

        const queryUserRole = `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING;
        `;
        await client.query(queryUserRole, [userId, roleId]);
      }
    }

    await client.query("COMMIT");

    console.log("✅ Seeding data users & roles relasional berhasil!");
    console.log("🔑 Akun Pengujian yang Siap Digunakan (Password: Password123!):");
    console.log(" - Official Booker      : booker.test@bpjsketenagakerjaan.go.id");
    console.log(" - Pejabat Penyetuju    : approver.test@bpjsketenagakerjaan.go.id");
    console.log(" - Admin Travel Pusat   : admin.travel@bpjsketenagakerjaan.go.id");
    console.log(" - Admin Anggaran / OTI : admin.anggaran@bpjsketenagakerjaan.go.id");
    console.log(" - Super Admin E-TO     : super.admin@bpjsketenagakerjaan.go.id");

  } catch (error) {
    await client.query("ROLLBACK");
    console.error("❌ Terjadi kesalahan saat seeding users:", error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Eksekusi seeder
seedUsers();