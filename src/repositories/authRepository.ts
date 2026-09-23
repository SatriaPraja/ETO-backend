import { Pool } from 'pg'
import { UserEntity } from '../schemas/authSchema.ts'

export class AuthRepository {
  constructor(private pool: Pool) {}

  // 🔍 Cari User Berdasarkan Email atau NPK
  async findByEmailOrNpk(identifier: string): Promise<UserEntity | null> {
    const query = {
      text: `
        SELECT 
          u.id, 
          u.npk, 
          u.nama_lengkap, 
          u.email, 
          u.password_hash, 
          u.jabatan, 
          u.golongan, 
          u.unit_kerja_kode, 
          u.unit_kerja_nama, 
          u.no_hp,
          u.avatar_initials, 
          u.role, 
          u.is_active,
          u.status,
          u.failed_login_attempts,
          u.locked_until,
          u.password_changed_at
        FROM users u
        WHERE (LOWER(u.email) = LOWER($1) OR u.npk = $1)
      `,
      values: [identifier],
    }

    const res = await this.pool.query(query)
    return res.rows[0] || null
  }

  // 🔍 Cari User Berdasarkan ID
  async findById(id: string): Promise<UserEntity | null> {
    const query = {
      text: `
        SELECT 
          u.id, 
          u.npk, 
          u.nama_lengkap, 
          u.email, 
          u.password_hash,
          u.jabatan, 
          u.golongan, 
          u.unit_kerja_kode, 
          u.unit_kerja_nama, 
          u.no_hp,
          u.avatar_initials, 
          u.role, 
          u.is_active,
          u.status
        FROM users u
        WHERE u.id = $1
      `,
      values: [id],
    }

    const res = await this.pool.query(query)
    return res.rows[0] || null
  }

  // ⏱️ Update Timestamp Login Terakhir & Reset Counter Gagal Login
  async updateLastLogin(id: string): Promise<void> {
    const query = {
      text: `
        UPDATE users 
        SET 
          last_login_at = NOW(),
          failed_login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      values: [id],
    }
    await this.pool.query(query)
  }

  // 🛡️ Keamanan: Increment Percobaan Gagal Login & Kunci Akun Jika >= 3x Gagal
  async incrementFailedAttempts(id: string, lockDurationMinutes: number = 15): Promise<void> {
    const query = {
      text: `
        UPDATE users 
        SET 
          failed_login_attempts = failed_login_attempts + 1,
          locked_until = CASE 
            WHEN failed_login_attempts + 1 >= 3 THEN NOW() + ($2 || ' minutes')::INTERVAL 
            ELSE locked_until 
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      values: [id, lockDurationMinutes],
    }
    await this.pool.query(query)
  }
}