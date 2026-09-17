import { Pool } from 'pg'
import { UserEntity, RegisterDTO } from '../schemas/authSchema.ts'
import { GetUsersQueryDTO, UpdateUserDTO, UserListEntity } from '../schemas/userSchema.ts'

export class UserRepository {
  constructor(private pool: Pool) {}
async findByUsernameOrNpk(identifier: string): Promise<UserEntity | null> {
    const query = {
      text: `
        SELECT id, npk, nama_lengkap, email, password_hash, jabatan, 
               golongan, unit_kerja_kode, unit_kerja_nama, avatar_initials, 
               role, is_active 
        FROM users 
        WHERE (LOWER(email) = LOWER($1) OR npk = $1)
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
        WHERE id = $1
      `,
      values: [id],
    }
    const res = await this.pool.query(query)
    return res.rows[0] || null
  }

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

  // 🔴 METODE REPOSITORY YANG SUDAH DIPERBAIKI (Bebas Bug Query SQL)
  async findAll(params: GetUsersQueryDTO): Promise<{ users: UserListEntity[]; total: number }> {
    const { search, role, page = 1, limit = 10 } = params
    const offset = (page - 1) * limit
    
    const conditions: string[] = []
    const baseValues: any[] = []

    // 1. Filter Search
    if (search) {
      baseValues.push(`%${search.toLowerCase()}%`)
      conditions.push(`(LOWER(nama_lengkap) LIKE $${baseValues.length} OR npk LIKE $${baseValues.length} OR LOWER(email) LIKE $${baseValues.length})`)
    }

    // 2. Filter Role
    if (role && role !== 'ALL') {
      baseValues.push(role)
      conditions.push(`role = $${baseValues.length}`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // 3. Eksekusi Total Count (Gunakan shallow copy baseValues)
    const countQuery = `SELECT COUNT(*) FROM users ${whereClause}`
    const countRes = await this.pool.query(countQuery, [...baseValues])
    const total = parseInt(countRes.rows[0].count, 10)

    // 4. Eksekusi Data Query dengan Limit & Offset
    const dataValues = [...baseValues]
    dataValues.push(limit)
    const limitIndex = dataValues.length

    dataValues.push(offset)
    const offsetIndex = dataValues.length

    const dataQuery = `
      SELECT id, npk, nama_lengkap, email, jabatan, golongan, 
             unit_kerja_kode, unit_kerja_nama, avatar_initials, role, is_active, created_at
      FROM users
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitIndex} OFFSET $${offsetIndex}
    `
    const dataRes = await this.pool.query(dataQuery, dataValues)

    return { users: dataRes.rows, total }
  }

  // 🔴 METHOD BARU: Update Profile & Role User
  async update(id: string, data: UpdateUserDTO & { passwordHash?: string; avatarInitials?: string }): Promise<UserListEntity> {
    const updates: string[] = []
    const values: any[] = []

    if (data.namaLengkap) {
      values.push(data.namaLengkap)
      updates.push(`nama_lengkap = $${values.length}`)
    }
    if (data.email) {
      values.push(data.email)
      updates.push(`email = $${values.length}`)
    }
    if (data.passwordHash) {
      values.push(data.passwordHash)
      updates.push(`password_hash = $${values.length}`)
    }
    if (data.jabatan) {
      values.push(data.jabatan)
      updates.push(`jabatan = $${values.length}`)
    }
    if (data.golongan) {
      values.push(data.golongan)
      updates.push(`golongan = $${values.length}`)
    }
    if (data.unitKerjaKode) {
      values.push(data.unitKerjaKode)
      updates.push(`unit_kerja_kode = $${values.length}`)
    }
    if (data.unitKerjaNama) {
      values.push(data.unitKerjaNama)
      updates.push(`unit_kerja_nama = $${values.length}`)
    }
    if (data.avatarInitials) {
      values.push(data.avatarInitials)
      updates.push(`avatar_initials = $${values.length}`)
    }
    if (data.role) {
      values.push(data.role)
      updates.push(`role = $${values.length}`)
    }

    values.push(id)
    const query = {
      text: `
        UPDATE users 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $${values.length}
        RETURNING id, npk, nama_lengkap, email, jabatan, golongan, 
                  unit_kerja_kode, unit_kerja_nama, avatar_initials, role, is_active, created_at
      `,
      values,
    }

    const res = await this.pool.query(query)
    return res.rows[0]
  }

  // 🔴 METHOD BARU: Toggle Active Status User
  async updateStatus(id: string, isActive: boolean): Promise<UserListEntity> {
    const query = {
      text: `
        UPDATE users 
        SET is_active = $1, updated_at = NOW() 
        WHERE id = $2
        RETURNING id, npk, nama_lengkap, email, jabatan, golongan, 
                  unit_kerja_kode, unit_kerja_nama, avatar_initials, role, is_active, created_at
      `,
      values: [isActive, id],
    }
    const res = await this.pool.query(query)
    return res.rows[0]
  }
}