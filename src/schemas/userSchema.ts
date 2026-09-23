import { z } from 'zod'
import { UserRole } from './authSchema.ts'

export const getUsersQuerySchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? Number(val) : 1)),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => (val ? Number(val) : 10)),
})

export const updateUserSchema = z.object({
  namaLengkap: z.string().min(2, 'Nama minimal 2 karakter').optional(),
  email: z.string().email('Format email tidak valid').optional(),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  jabatan: z.string().optional(),
  golongan: z.string().optional(),
  unitKerjaKode: z.string().optional(),
  unitKerjaNama: z.string().optional(),
  noHp: z.string().optional(),
  role: z.enum([
    'OFFICIAL_BOOKER',
    'APPROVER_KAKANWIL',
    'ADMIN_TRAVEL_KP',
    'ASDEP_KEUANGAN',
    'SUPER_ADMIN',
  ]).optional(),
})

export const toggleUserStatusSchema = z.object({
  status: z.enum(['active', 'inactive'], {
    message: 'Status harus active atau inactive',
  }),
})

export const createUserSchema = z.object({
  body: z.object({
    npk: z.string().min(1, 'NPK wajib diisi'),
    namaLengkap: z.string().min(1, 'Nama lengkap wajib diisi'),
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    jabatan: z.string().min(1, 'Jabatan wajib diisi'),
    golongan: z.string().min(1, 'Golongan wajib diisi'),
    unitKerjaKode: z.string().min(1, 'Kode unit kerja wajib diisi'),
    unitKerjaNama: z.string().min(1, 'Nama unit kerja wajib diisi'),
    noHp: z.string().optional(),
    role: z.enum([
      'SUPER_ADMIN',
      'OFFICIAL_BOOKER',
      'APPROVER_KAKANWIL',
      'ADMIN_TRAVEL_KP',
      'ASDEP_KEUANGAN',
    ]),
  }),
})

export type CreateUserDTO = z.infer<typeof createUserSchema>['body']
export type GetUsersQueryDTO = z.infer<typeof getUsersQuerySchema>
export type UpdateUserDTO = z.infer<typeof updateUserSchema>
export type ToggleUserStatusDTO = z.infer<typeof toggleUserStatusSchema>

export interface UserListEntity {
  id: string
  npk: string
  nama_lengkap: string
  email: string
  jabatan: string
  golongan: string
  unit_kerja_kode: string
  unit_kerja_nama: string
  no_hp?: string
  avatar_initials: string
  role: UserRole
  is_active: boolean
  created_at: Date
}