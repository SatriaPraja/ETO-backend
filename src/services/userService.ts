import bcrypt from 'bcryptjs'
import { redis } from '../config/redis.ts'
import { UserRepository } from '../repositories/userRepository.ts'
import { GetUsersQueryDTO, UpdateUserDTO } from '../schemas/userSchema.ts'
import { RegisterDTO } from '../schemas/authSchema.ts'

export class UserService {
  constructor(private userRepo: UserRepository) {}
async createUser(payload: RegisterDTO) {
    const existingUser = await this.userRepo.findByUsernameOrNpk(payload.npk)
    if (existingUser) {
      throw new Error('NPK atau Email sudah terdaftar di sistem.')
    }

    const passwordHash = await bcrypt.hash(payload.password, 10)
    const initials = payload.namaLengkap
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()

    const newUser = await this.userRepo.create({
      ...payload,
      passwordHash,
      avatarInitials: initials,
    })

    return {
      id: newUser.id,
      npk: newUser.npk,
      namaLengkap: newUser.nama_lengkap,
      email: newUser.email,
      role: newUser.role,
    }
  }

  // 1. Get All Users
  async getAllUsers(params: GetUsersQueryDTO) {
    const { users, total } = await this.userRepo.findAll(params)
    
    const mappedUsers = users.map((u) => ({
      id: u.id,
      npk: u.npk,
      namaLengkap: u.nama_lengkap,
      email: u.email,
      jabatan: u.jabatan,
      golongan: u.golongan,
      unitKerjaKode: u.unit_kerja_kode,
      unitKerjaNama: u.unit_kerja_nama,
      avatarInitials: u.avatar_initials,
      role: u.role,
      status: u.is_active ? 'active' : 'inactive',
      createdAt: u.created_at,
    }))

    return {
      users: mappedUsers,
      meta: {
        total,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: Math.ceil(total / (params.limit || 10)),
      },
    }
  }

  // 2. Update User Profile & Role
  async updateUser(id: string, payload: UpdateUserDTO) {
    const existingUser = await this.userRepo.findById(id)
    if (!existingUser) {
      throw new Error('Pengguna tidak ditemukan.')
    }

    let passwordHash: string | undefined
    if (payload.password) {
      passwordHash = await bcrypt.hash(payload.password, 10)
    }

    let avatarInitials: string | undefined
    if (payload.namaLengkap) {
      avatarInitials = payload.namaLengkap
        .split(' ')
        .map((n) => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase()
    }

    const updatedUser = await this.userRepo.update(id, {
      ...payload,
      passwordHash,
      avatarInitials,
    })

    // Invalidate Cache Profil di Redis jika user diupdate
    await redis.del(`user:profile:${id}`)

    return {
      id: updatedUser.id,
      npk: updatedUser.npk,
      namaLengkap: updatedUser.nama_lengkap,
      email: updatedUser.email,
      jabatan: updatedUser.jabatan,
      golongan: updatedUser.golongan,
      unitKerjaKode: updatedUser.unit_kerja_kode,
      unitKerjaNama: updatedUser.unit_kerja_nama,
      avatarInitials: updatedUser.avatar_initials,
      role: updatedUser.role,
      status: updatedUser.is_active ? 'active' : 'inactive',
    }
  }

  // 3. Toggle Status (Active / Inactive)
  async toggleStatus(id: string, status: 'active' | 'inactive') {
    const existingUser = await this.userRepo.findById(id)
    if (!existingUser) {
      throw new Error('Pengguna tidak ditemukan.')
    }

    const isActive = status === 'active'
    const updatedUser = await this.userRepo.updateStatus(id, isActive)

    // Invalidate Cache Redis
    await redis.del(`user:profile:${id}`)

    return {
      id: updatedUser.id,
      npk: updatedUser.npk,
      namaLengkap: updatedUser.nama_lengkap,
      status: updatedUser.is_active ? 'active' : 'inactive',
    }
  }
}