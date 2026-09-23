import { Pool } from "pg";

export class ReferenceRepository {
  constructor(private pool: Pool) {}

  // Ambil user yang memiliki role APPROVER_KAKANWIL
  async findApprovers(searchQuery?: string) {
    let whereClause = `WHERE r.code = 'APPROVER_KAKANWIL' AND u.status = 'active'`;
    const queryParams: any[] = [];

    if (searchQuery && searchQuery.trim() !== "") {
      queryParams.push(`%${searchQuery.trim().toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(u.nama_lengkap) LIKE $${queryParams.length} OR 
        LOWER(u.npk) LIKE $${queryParams.length} OR 
        LOWER(u.jabatan) LIKE $${queryParams.length}
      )`;
    }

    const query = `
      SELECT DISTINCT
        u.id,
        u.npk,
        u.nama_lengkap AS "namaLengkap",
        u.jabatan,
        u.unit_kerja_kode AS "unitKerjaKode",
        u.unit_kerja_nama AS "unitKerjaNama",
        u.avatar_initials AS "avatarInitials"
      FROM users u
      INNER JOIN user_roles ur ON u.id = ur.user_id
      INNER JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      ORDER BY u.nama_lengkap ASC
      LIMIT 50
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async findOfficialBookers(searchQuery?: string) {
    // 🟢 Ubah u.status::text agar bisa dibaca LOWER() atau bandingkan langsung nilai enum-nya
    let whereClause = `WHERE u.role = 'OFFICIAL_BOOKER' AND (LOWER(u.status::text) = 'active' OR u.status IS NULL)`;
    const queryParams: any[] = [];

    if (searchQuery && searchQuery.trim() !== "") {
      queryParams.push(`%${searchQuery.trim().toLowerCase()}%`);
      whereClause += ` AND (
      LOWER(u.nama_lengkap) LIKE $${queryParams.length} OR 
      LOWER(u.npk) LIKE $${queryParams.length} OR 
      LOWER(u.jabatan) LIKE $${queryParams.length}
    )`;
    }

    const query = `
    SELECT 
      u.id,
      u.npk,
      u.nama_lengkap AS "namaLengkap",
      u.jabatan,
      u.no_hp AS "noHp",
      u.unit_kerja_kode AS "unitKerjaKode",
      u.unit_kerja_nama AS "unitKerjaNama",
      u.avatar_initials AS "avatarInitials"
    FROM users u
    ${whereClause}
    ORDER BY u.nama_lengkap ASC
    LIMIT 50
  `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  // Ambil daftar Mata Anggaran (MAK) dari master_budgets
  async findBudgets(searchQuery?: string) {
    let whereClause = `WHERE 1=1`;
    const queryParams: any[] = [];

    if (searchQuery && searchQuery.trim() !== "") {
      queryParams.push(`%${searchQuery.trim().toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(account_number) LIKE $${queryParams.length} OR 
        LOWER(account_name) LIKE $${queryParams.length} OR 
        LOWER(program_name) LIKE $${queryParams.length} OR 
        LOWER(office_name) LIKE $${queryParams.length}
      )`;
    }

    const query = `
      SELECT 
        id,
        office_name AS "officeName",
        account_number AS "accountNumber",
        account_name AS "accountName",
        program_name AS "programName",
        activity_name AS "activityName",
        pagu_budget AS "paguBudget",
        used_budget AS "usedBudget",
        (pagu_budget - used_budget) AS "remainingBudget"
      FROM master_budgets
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }

  async findHotels(searchQuery?: string) {
    let whereClause = `WHERE h.is_active = TRUE`;
    const queryParams: any[] = [];

    if (searchQuery && searchQuery.trim() !== "") {
      queryParams.push(`%${searchQuery.trim().toLowerCase()}%`);
      whereClause += ` AND (
        LOWER(h.name) LIKE $${queryParams.length} OR 
        LOWER(h.address) LIKE $${queryParams.length}
      )`;
    }

    const query = `
      SELECT 
        h.id,
        h.name,
        h.city_id AS "cityId",
        h.star_rating AS "starRating",
        h.address,
        h.is_active AS "isActive"
      FROM master_hotels h
      ${whereClause}
      ORDER BY h.name ASC
      LIMIT 50
    `;

    const res = await this.pool.query(query, queryParams);
    return res.rows;
  }
}
