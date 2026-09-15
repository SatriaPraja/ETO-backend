export const authSchemas = {
  ErrorResponse: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Pesan kesalahan dijelaskan di sini.' },
      errors: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            field: { type: 'string', example: 'username' },
            message: { type: 'string', example: 'Username (NPK/Email) wajib diisi' },
          },
        },
      },
    },
  },
  LoginRequest: {
    type: 'object',
    required: ['username', 'password'],
    properties: {
      username: { type: 'string', description: 'Email atau NPK Pengguna' },
      password: { type: 'string', description: 'Password akun' },
    },
  },
  RegisterRequest: {
    type: 'object',
    required: ['npk', 'namaLengkap', 'email', 'password', 'jabatan', 'golongan', 'unitKerjaKode', 'unitKerjaNama', 'role'],
    properties: {
      npk: { type: 'string', example: '10000001', description: 'Nomor Pokok Karyawan' },
      namaLengkap: { type: 'string', example: 'Super Admin E-TO' },
      email: { type: 'string', example: 'super.admin@bpjsketenagakerjaan.go.id' },
      password: { type: 'string', example: 'Password123!' },
      jabatan: { type: 'string', example: 'System Administrator' },
      golongan: { type: 'string', example: 'IV/E' },
      unitKerjaKode: { type: 'string', example: 'KP-TI' },
      unitKerjaNama: { type: 'string', example: 'Kantor Pusat - TI & Transformasi Digital' },
      role: { 
        type: 'string', 
        enum: ['OFFICIAL_BOOKER', 'APPROVER_KAKANWIL', 'ADMIN_TRAVEL_KP', 'ASDEP_KEUANGAN', 'SUPER_ADMIN'],
        example: 'SUPER_ADMIN' 
      },
    },
  },
  SwitchRoleRequest: {
    type: 'object',
    required: ['targetRoleId'],
    properties: {
      targetRoleId: {
        type: 'string',
        example: '03',
        description: 'ID/Kode Role target (01: SUPER_ADMIN, 02: OFFICIAL_BOOKER, 03: APPROVER_KAKANWIL, 05: ADMIN_TRAVEL_KP, 21: ASDEP_KEUANGAN)',
      },
    },
  },
  UserPayload: {
    type: 'object',
    properties: {
      id: { type: 'string', example: 'c1f728c3-42e5-4d7a-85d2-098230193892' },
      npk: { type: 'string', example: '982144' },
      namaLengkap: { type: 'string', example: 'Booker User Test' },
      email: { type: 'string', example: 'booker.test@bpjsketenagakerjaan.go.id' },
      jabatan: { type: 'string', example: 'Official Booker' },
      golongan: { type: 'string', example: 'III/C' },
      unitKerjaKode: { type: 'string', example: 'KP-UMUM-SDM' },
      unitKerjaNama: { type: 'string', example: 'Kantor Pusat - Divisi Umum & SDM' },
      avatarInitials: { type: 'string', example: 'BT' },
    },
  },
  RoleDetail: {
    type: 'object',
    properties: {
      roleId: { type: 'string', example: '02' },
      roleName: { type: 'string', example: 'OFFICIAL_BOOKER' },
      description: { type: 'string', example: 'Pembuat Travel Order; hanya melihat & mengelola order sendiri.' },
    },
  },
}