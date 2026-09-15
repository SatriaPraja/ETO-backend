import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { redis } from '../config/redis.ts'
import { UserRepository } from '../repositories/userRepository.ts'
import { UserRole, LoginDTO, RegisterDTO } from '../schemas/authSchema.ts'

const JWT_SECRET = process.env.JWT_SECRET || 'secret_key_eto_bpjs_2026'

const ROLE_DETAILS_MAP: Record<UserRole, { id: string; name: UserRole; desc: string }> = {
  SUPER_ADMIN: {
    id: '01',
    name: 'SUPER_ADMIN',
    desc: 'Administrator Sistem Utama; memiliki hak penuh mengelola user & seluruh fungsi sistem.',
  },
  OFFICIAL_BOOKER: {
    id: '02',
    name: 'OFFICIAL_BOOKER',
    desc: 'Pembuat Travel Order; hanya dapat melihat & mengelola order sendiri.',
  },
  APPROVER_KAKANWIL: {
    id: '03',
    name: 'APPROVER_KAKANWIL',
    desc: 'Pejabat Penyetuju tingkat pertama untuk wewenang operasionalnya.',
  },
  ADMIN_TRAVEL_KP: {
    id: '05',
    name: 'ADMIN_TRAVEL_KP',
    desc: 'Admin Travel Pusat; pengelola master data dan verifikasi akhir.',
  },
  ASDEP_KEUANGAN: {
    id: '21',
    name: 'ASDEP_KEUANGAN',
    desc: 'Admin Anggaran & OTI; pengelola alokasi pagu kegiatan & mata anggaran.',
  },
}


export class AuthService {
  constructor(private userRepo: UserRepository) {}

  private generateToken(payload: { userId: string; npk: string; activeRole: UserRole }): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' })
  }

  // 1. Register User Baru
  async register(payload: RegisterDTO) {
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

  // 2. Login (Simpan Token & User Cache ke Redis)
  async login(payload: LoginDTO) {
    const user = await this.userRepo.findByUsernameOrNpk(payload.username)
    if (!user) {
      throw new Error('Username (NPK/Email) atau password salah.')
    }

    const isMatch = await bcrypt.compare(payload.password, user.password_hash)
    if (!isMatch) {
      throw new Error('Username (NPK/Email) atau password salah.')
    }

    const activeRole = user.role
    const availableRoles = [ROLE_DETAILS_MAP[activeRole]]

    if (activeRole === 'SUPER_ADMIN') {
      availableRoles.push(
        ROLE_DETAILS_MAP['OFFICIAL_BOOKER'],
        ROLE_DETAILS_MAP['APPROVER_KAKANWIL'],
        ROLE_DETAILS_MAP['ADMIN_TRAVEL_KP'],
        ROLE_DETAILS_MAP['ASDEP_KEUANGAN']
      )
    } else if (activeRole !== 'OFFICIAL_BOOKER') {
      availableRoles.push(ROLE_DETAILS_MAP['OFFICIAL_BOOKER'])
    }

    const accessToken = this.generateToken({
      userId: user.id,
      npk: user.npk,
      activeRole,
    })

    const userPayload = {
      id: user.id,
      npk: user.npk,
      namaLengkap: user.nama_lengkap,
      email: user.email,
      jabatan: user.jabatan,
      golongan: user.golongan,
      unitKerjaKode: user.unit_kerja_kode,
      unitKerjaNama: user.unit_kerja_nama,
      avatarInitials: user.avatar_initials,
    }

    // Cache profil user ke Redis selama 8 jam (28800 detik)
    await redis.set(`user:profile:${user.id}`, JSON.stringify(userPayload), 'EX', 28800)
    await this.userRepo.updateLastLogin(user.id)

    return {
      accessToken,
      user: userPayload,
      availableRoles,
      activeRole,
    }
  }

  // 3. Logout (Masukkan Token ke Blacklist Redis)
  async logout(token: string, tokenExp?: number) {
    const nowInSeconds = Math.floor(Date.now() / 1000)
    const ttl = tokenExp ? tokenExp - nowInSeconds : 28800

    if (ttl > 0) {
      await redis.set(`blacklist:${token}`, 'true', 'EX', ttl)
    }
  }

  // 4. Switch Role
  async switchRole(userId: string, targetRoleId: string | number) {
    const user = await this.userRepo.findById(userId)
    if (!user) {
      throw new Error('User tidak ditemukan.')
    }

    const foundRole = Object.values(ROLE_DETAILS_MAP).find(
      (r) => r.id === String(targetRoleId) || r.name === String(targetRoleId)
    )

    if (!foundRole) {
      throw new Error('Target Role ID tidak valid.')
    }

    const newAccessToken = this.generateToken({
      userId: user.id,
      npk: user.npk,
      activeRole: foundRole.name,
    })

    return {
      accessToken: newAccessToken,
      activeRole: foundRole.name,
    }
  }

  // 5. Get Profile (Cek Redis Cache terlebih dahulu & Kembalikan Opsi Available Roles Lengkap)
  async getProfile(userId: string, currentActiveRole: UserRole) {
    let userPayload: any = null

    // Cek cache Redis
    const cachedUser = await redis.get(`user:profile:${userId}`)
    if (cachedUser) {
      userPayload = JSON.parse(cachedUser)
    } else {
      // Miss cache: Query PostgreSQL
      const dbUser = await this.userRepo.findById(userId)
      if (!dbUser) throw new Error('User tidak ditemukan.')

      userPayload = {
        id: dbUser.id,
        npk: dbUser.npk,
        namaLengkap: dbUser.nama_lengkap,
        email: dbUser.email,
        jabatan: dbUser.jabatan,
        golongan: dbUser.golongan,
        unitKerjaKode: dbUser.unit_kerja_kode,
        unitKerjaNama: dbUser.unit_kerja_nama,
        avatarInitials: dbUser.avatar_initials,
      }
      await redis.set(`user:profile:${dbUser.id}`, JSON.stringify(userPayload), 'EX', 28800)
    }

    // Ambil data user dari database untuk mengetahui base role aslinya
    const dbUser = await this.userRepo.findById(userId)
    const baseRole = (dbUser?.role as UserRole) || currentActiveRole

    const availableRoles = [ROLE_DETAILS_MAP[baseRole]]

    if (baseRole === 'SUPER_ADMIN') {
      availableRoles.push(
        ROLE_DETAILS_MAP['OFFICIAL_BOOKER'],
        ROLE_DETAILS_MAP['APPROVER_KAKANWIL'],
        ROLE_DETAILS_MAP['ADMIN_TRAVEL_KP'],
        ROLE_DETAILS_MAP['ASDEP_KEUANGAN']
      )
    } else if (baseRole !== 'OFFICIAL_BOOKER') {
      availableRoles.push(ROLE_DETAILS_MAP['OFFICIAL_BOOKER'])
    }

    return {
      user: userPayload,
      availableRoles,
      activeRole: currentActiveRole,
    }
  }
}