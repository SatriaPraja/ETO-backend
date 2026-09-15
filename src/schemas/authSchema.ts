import { z } from 'zod'

export const loginSchema = z.object({
  username: z
    .string({ message: 'Username (NPK/Email) wajib diisi' })
    .min(1, 'Username tidak boleh kosong'),
  password: z
    .string({ message: 'Password wajib diisi' })
    .min(1, 'Password tidak boleh kosong'),
})

export const switchRoleSchema = z.object({
  targetRoleId: z.union([z.string(), z.number()]),
})

// Schema Baru: Register User
export const registerSchema = z.object({
  npk: z.string({ message: 'NPK wajib diisi' }).min(3, 'NPK minimal 3 karakter'),
  namaLengkap: z.string({ message: 'Nama lengkap wajib diisi' }).min(2, 'Nama minimal 2 karakter'),
  email: z.string({ message: 'Email wajib diisi' }).email('Format email tidak valid'),
  password: z.string({ message: 'Password wajib diisi' }).min(6, 'Password minimal 6 karakter'),
  jabatan: z.string({ message: 'Jabatan wajib diisi' }),
  golongan: z.string({ message: 'Golongan wajib diisi' }),
  unitKerjaKode: z.string({ message: 'Kode unit kerja wajib diisi' }),
  unitKerjaNama: z.string({ message: 'Nama unit kerja wajib diisi' }),
  role: z.enum([
    'OFFICIAL_BOOKER',
    'APPROVER_KAKANWIL',
    'ADMIN_TRAVEL_KP',
    'ASDEP_KEUANGAN',
    'SUPER_ADMIN',
  ]),
})

export type LoginDTO = z.infer<typeof loginSchema>
export type SwitchRoleDTO = z.infer<typeof switchRoleSchema>
export type RegisterDTO = z.infer<typeof registerSchema>

export type UserRole =
  | 'OFFICIAL_BOOKER'
  | 'APPROVER_KAKANWIL'
  | 'ADMIN_TRAVEL_KP'
  | 'ASDEP_KEUANGAN'
  | 'SUPER_ADMIN'

export interface UserEntity {
  id: string
  npk: string
  nama_lengkap: string
  email: string
  password_hash: string
  jabatan: string
  golongan: string
  unit_kerja_kode: string
  unit_kerja_nama: string
  avatar_initials: string
  role: UserRole
  is_active: boolean
}