import bcrypt from 'bcryptjs'
import { redis } from '../config/redis.ts'
import { UserRepository } from '../repositories/userRepository.ts'
import { CreateUserDTO, GetUsersQueryDTO, UpdateUserDTO } from '../schemas/userSchema.ts'

export class UserService {
  constructor(private userRepo: UserRepository) {}

  // 1. Create User Baru
  async createUser(payload: CreateUserDTO) {
    const existingUser = await this.userRepo.findByUsernameOrNpk(payload.npk)
    if (existingUser) {
      throw new Error('NPK atau Email sudah terdaftar di sistem.')
    }

    const passwordHash = await bcrypt.hash(payload.password, 10)
    const initials = payload.namaLengkap
      .trim()
      .split(/\s+/)
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
      status: newUser.is_active ? 'active' : 'inactive',
    }
  }

  // 2. Get All Users
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
      noHp: u.no_hp,
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

  // 3. Update User Profile & Role
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
        .trim()
        .split(/\s+/)
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

    // Invalidate Cache Profil Redis
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
      noHp: updatedUser.no_hp,
      avatarInitials: updatedUser.avatar_initials,
      role: updatedUser.role,
      status: updatedUser.is_active ? 'active' : 'inactive',
    }
  }

  // 4. Toggle Status (Active / Inactive)
  async toggleStatus(id: string, status: 'active' | 'inactive') {
    const existingUser = await this.userRepo.findById(id)
    if (!existingUser) {
      throw new Error('Pengguna tidak ditemukan.')
    }

    const isActive = status === 'active'
    const updatedUser = await this.userRepo.updateStatus(id, isActive)

    // Invalidate Cache Profil Redis
    await redis.del(`user:profile:${id}`)

    return {
      id: updatedUser.id,
      npk: updatedUser.npk,
      namaLengkap: updatedUser.nama_lengkap,
      status: updatedUser.is_active ? 'active' : 'inactive',
    }
  }

  async getEmployeesForLOV(params: {
    search?: string
    scope?: 'my-unit' | 'national'
    userUnitCode?: string
    page?: number
    limit?: number
  }) {
    const result = await this.userRepo.findEmployees(params)

    // Mapping ke format EmployeeItem Frontend
    const mappedItems = result.items.map((emp) => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      npk: emp.npk,
      jabatan: emp.jabatan,
      golongan: emp.golongan ? `Gol. ${emp.golongan}` : 'Gol. III/A',
      unitKerja: emp.unitKerja,
      unitKerjaKode: emp.unitKerjaKode,
      phone: emp.phone || '-',
      status: 'Tersedia', // Statis atau bisa disesuaikan dengan skema jadwal cuti
      avatarInitials: emp.avatarInitials || emp.name.substring(0, 2).toUpperCase(),
    }))

    return {
      employees: mappedItems,
      pagination: {
        totalItems: result.totalItems,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    }
  }
}