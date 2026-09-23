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

export type LoginDTO = z.infer<typeof loginSchema>
export type SwitchRoleDTO = z.infer<typeof switchRoleSchema>

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
  no_hp?: string
  avatar_initials: string
  role: UserRole
  is_active: boolean
  status?: string
  failed_login_attempts?: number
  locked_until?: Date | string | null
  password_changed_at?: Date | string | null
}