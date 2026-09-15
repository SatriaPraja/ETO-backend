import { Pool } from 'pg'
import { UserEntity, RegisterDTO } from '../schemas/authSchema.ts'

export class UserRepository {
  constructor(private pool: Pool) {}

  async findByUsernameOrNpk(identifier: string): Promise<UserEntity | null> {
    const query = {
      text: `
        SELECT id, npk, nama_lengkap, email, password_hash, jabatan, 
               golongan, unit_kerja_kode, unit_kerja_nama, avatar_initials, 
               role, is_active 
        FROM users 
        WHERE (LOWER(email) = LOWER($1) OR npk = $1) AND is_active = TRUE
      `,
      values: [identifier],
    }
    const res = await this.pool.query(query)
    return res.rows[0] || null
  }

  async findById(id: string): Promise<UserEntity | null> {
    const query = {
      text: `
        SELECT id, npk, nama_lengkap, email, password_hash, jabatan, 
               golongan, unit_kerja_kode, unit_kerja_nama, avatar_initials, 
               role, is_active 
        FROM users 
        WHERE id = $1 AND is_active = TRUE
      `,
      values: [id],
    }
    const res = await this.pool.query(query)
    return res.rows[0] || null
  }

  // Method Baru: Simpan User Baru
  async create(data: RegisterDTO & { passwordHash: string; avatarInitials: string }): Promise<UserEntity> {
    const query = {
      text: `
        INSERT INTO users (
          npk, nama_lengkap, email, password_hash, jabatan, 
          golongan, unit_kerja_kode, unit_kerja_nama, avatar_initials, role
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, npk, nama_lengkap, email, jabatan, golongan, 
                  unit_kerja_kode, unit_kerja_nama, avatar_initials, role, is_active
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
        data.avatarInitials,
        data.role,
      ],
    }
    const res = await this.pool.query(query)
    return res.rows[0]
  }

  async updateLastLogin(id: string): Promise<void> {
    const query = {
      text: `UPDATE users SET last_login_at = NOW() WHERE id = $1`,
      values: [id],
    }
    await this.pool.query(query)
  }
}