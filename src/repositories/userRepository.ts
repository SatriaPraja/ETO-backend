import { Pool } from "pg";
import {
  CreateUserDTO,
  GetUsersQueryDTO,
  UpdateUserDTO,
  UserListEntity,
} from "../schemas/userSchema.ts";

export class UserRepository {
  constructor(private pool: Pool) {}

  // ➕ 1. Tambah User Baru (Create User) + Sinkronisasi Tabel user_roles
  async create(
    data: CreateUserDTO & { passwordHash: string; avatarInitials: string },
  ): Promise<UserListEntity> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const queryUser = {
        text: `
          INSERT INTO users (
            npk, nama_lengkap, email, password_hash, jabatan, 
            golongan, unit_kerja_kode, unit_kerja_nama, no_hp, avatar_initials, role, is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
          RETURNING 
            id, npk, nama_lengkap, email, jabatan, golongan, 
            unit_kerja_kode, unit_kerja_nama, 
            no_hp, avatar_initials, role, is_active, created_at
        `,
        values: [
          data.npk,
          data.namaLengkap,
          data.email,
          data.passwordHash,
          data.jabatan,
          data.golongan,
          data.unitKerjaKode,
          data.unitKerjaNama,
          data.noHp || null,
          data.avatarInitials,
          data.role,
        ],
      };
      const userRes = await client.query(queryUser);
      const newUser = userRes.rows[0];

      // B. Sinkronkan dengan tabel pivot user_roles
      const roleQuery = `SELECT id FROM roles WHERE code = $1`;
      const roleRes = await client.query(roleQuery, [data.role]);

      if (roleRes.rows.length > 0) {
        const roleId = roleRes.rows[0].id;
        const userRoleQuery = `
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `;
        await client.query(userRoleQuery, [newUser.id, roleId]);
      }

      await client.query("COMMIT");
      return newUser;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // 🔍 2. Cari User Berdasarkan Email atau NPK
  async findByUsernameOrNpk(
    identifier: string,
  ): Promise<UserListEntity | null> {
    const query = {
      text: `
        SELECT 
          id, npk, nama_lengkap, email, jabatan, golongan, 
          unit_kerja_kode, unit_kerja_nama, 
          no_hp, avatar_initials, role, is_active, created_at
        FROM users
        WHERE (LOWER(email) = LOWER($1) OR npk = $1)
      `,
      values: [identifier],
    };
    const res = await this.pool.query(query);
    return res.rows[0] || null;
  }

  // 🔍 3. Cari User Berdasarkan ID
  async findById(id: string): Promise<UserListEntity | null> {
    const query = {
      text: `
        SELECT 
          id, npk, nama_lengkap, email, jabatan, golongan, 
          unit_kerja_kode, unit_kerja_nama, 
          no_hp, avatar_initials, role, is_active, created_at
        FROM users
        WHERE id = $1
      `,
      values: [id],
    };
    const res = await this.pool.query(query);
    return res.rows[0] || null;
  }

  // 📋 4. Ambil Daftar User (Pagination & Filter Role)
  async findAll(
    params: GetUsersQueryDTO,
  ): Promise<{ users: UserListEntity[]; total: number }> {
    const { search, role, page = 1, limit = 100 } = params;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const baseValues: any[] = [];

    if (search) {
      baseValues.push(`%${search.toLowerCase()}%`);
      conditions.push(
        `(LOWER(nama_lengkap) LIKE $${baseValues.length} OR npk LIKE $${baseValues.length} OR LOWER(email) LIKE $${baseValues.length})`,
      );
    }

    if (role && role !== "ALL") {
      baseValues.push(role);
      conditions.push(`role = $${baseValues.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`;
    const countRes = await this.pool.query(countQuery, [...baseValues]);
    const total = parseInt(countRes.rows[0].count, 10);

    const dataValues = [...baseValues];
    dataValues.push(limit);
    const limitIndex = dataValues.length;

    dataValues.push(offset);
    const offsetIndex = dataValues.length;

    const dataQuery = `
      SELECT 
        id, npk, nama_lengkap, email, jabatan, golongan, 
        unit_kerja_kode, unit_kerja_nama, 
        no_hp, avatar_initials, role, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `;
    const dataRes = await this.pool.query(dataQuery, dataValues);

    return { users: dataRes.rows, total };
  }

  // ✏️ 5. Update Profile & Role User
  async update(
    id: string,
    data: UpdateUserDTO & { passwordHash?: string; avatarInitials?: string },
  ): Promise<UserListEntity> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const updates: string[] = [];
      const values: any[] = [];

      if (data.namaLengkap) {
        values.push(data.namaLengkap);
        updates.push(`nama_lengkap = $${values.length}`);
      }
      if (data.email) {
        values.push(data.email);
        updates.push(`email = $${values.length}`);
      }
      if (data.passwordHash) {
        values.push(data.passwordHash);
        updates.push(`password_hash = $${values.length}`);
      }
      if (data.jabatan) {
        values.push(data.jabatan);
        updates.push(`jabatan = $${values.length}`);
      }
      if (data.golongan) {
        values.push(data.golongan);
        updates.push(`golongan = $${values.length}`);
      }
      if (data.unitKerjaKode) {
        values.push(data.unitKerjaKode);
        updates.push(`unit_kerja_kode = $${values.length}`);
      }
      if (data.unitKerjaNama) {
        values.push(data.unitKerjaNama);
        updates.push(`unit_kerja_nama = $${values.length}`);
      }
      if (data.noHp !== undefined) {
        values.push(data.noHp);
        updates.push(`no_hp = $${values.length}`);
      }
      if (data.avatarInitials) {
        values.push(data.avatarInitials);
        updates.push(`avatar_initials = $${values.length}`);
      }
      if (data.role) {
        values.push(data.role);
        updates.push(`role = $${values.length}`);
      }

      if (updates.length === 0) {
        throw new Error("Tidak ada data yang diperbarui.");
      }

      values.push(id);
      const query = {
        text: `
          UPDATE users 
          SET ${updates.join(", ")}, updated_at = NOW()
          WHERE id = $${values.length}
          RETURNING 
            id, npk, nama_lengkap, email, jabatan, golongan, 
            unit_kerja_kode, unit_kerja_nama, 
            no_hp, avatar_initials, role, is_active, created_at
        `,
        values,
      };

      const res = await client.query(query);
      const updatedUser = res.rows[0];

      if (data.role) {
        const roleRes = await client.query(
          `SELECT id FROM roles WHERE code = $1`,
          [data.role],
        );
        if (roleRes.rows.length > 0) {
          const roleId = roleRes.rows[0].id;
          await client.query(`DELETE FROM user_roles WHERE user_id = $1`, [id]);
          await client.query(
            `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
            [id, roleId],
          );
        }
      }

      await client.query("COMMIT");
      return updatedUser;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  // 🔘 6. Toggle Status Active / Inactive
  async updateStatus(id: string, isActive: boolean): Promise<UserListEntity> {
    const query = {
      text: `
        UPDATE users 
        SET is_active = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING 
          id, npk, nama_lengkap, email, jabatan, golongan, 
          unit_kerja_kode, unit_kerja_nama, 
          no_hp, avatar_initials, role, is_active, created_at
      `,
      values: [isActive, id],
    };
    const res = await this.pool.query(query);
    return res.rows[0];
  }
  async findEmployees(params: {
    search?: string;
    scope?: "my-unit" | "national";
    userUnitCode?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      search,
      scope = "my-unit",
      userUnitCode,
      page = 1,
      limit = 10,
    } = params;
    const offset = (page - 1) * limit;
    const queryParams: any[] = [];
    let whereConditions: string[] = [`is_active = TRUE`];

    // 1. Scope Filter: Unit Kerja Saya vs Nasional
    if (scope === "my-unit" && userUnitCode) {
      queryParams.push(userUnitCode);
      whereConditions.push(`unit_kerja_kode = $${queryParams.length}`);
    }

    // 2. Filter Search Query (NPK, Nama Lengkap, Email, Jabatan, Unit Kerja)
    if (search && search.trim() !== "") {
      queryParams.push(`%${search.trim().toLowerCase()}%`);
      const searchIdx = queryParams.length;
      whereConditions.push(`(
        LOWER(npk) LIKE $${searchIdx} OR
        LOWER(nama_lengkap) LIKE $${searchIdx} OR
        LOWER(email) LIKE $${searchIdx} OR
        LOWER(jabatan) LIKE $${searchIdx} OR
        LOWER(unit_kerja_nama) LIKE $${searchIdx}
      )`);
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Count Total Items
    const countQuery = `SELECT COUNT(id) FROM users ${whereClause}`;
    const countRes = await this.pool.query(countQuery, queryParams);
    const totalItems = parseInt(countRes.rows[0].count, 10);

    // Data Query
    queryParams.push(limit, offset);
    const dataQuery = `
      SELECT 
        id,
        nama_lengkap AS name,
        email,
        npk,
        jabatan,
        golongan,
        unit_kerja_nama AS "unitKerja",
        unit_kerja_kode AS "unitKerjaKode",
        no_hp AS phone,
        avatar_initials AS "avatarInitials"
      FROM users
      ${whereClause}
      ORDER BY nama_lengkap ASC
      LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const dataRes = await this.pool.query(dataQuery, queryParams);

    return {
      items: dataRes.rows,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };
  }
}
