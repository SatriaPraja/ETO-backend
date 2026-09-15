export const loginDoc = {
  post: {
    summary: 'Login Utama',
    description: 'Mengotentikasi user (via Email/NPK) dan menerbitkan Access Token awal dengan activeRole default.',
    tags: ['Authentication'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/LoginRequest' },
          examples: {
            SuperAdmin: {
              summary: '0. Super Admin',
              value: { username: 'super.admin@bpjsketenagakerjaan.go.id', password: 'Password123!' },
            },
            OfficialBooker: {
              summary: '1. Official Booker',
              value: { username: 'booker.test@bpjsketenagakerjaan.go.id', password: 'Password123!' },
            },
            PejabatApprover: {
              summary: '2. Pejabat Penyetuju (Kakanwil)',
              value: { username: 'approver.test@bpjsketenagakerjaan.go.id', password: 'Password123!' },
            },
            AdminTravel: {
              summary: '3. Admin Travel KP',
              value: { username: 'admin.travel@bpjsketenagakerjaan.go.id', password: 'Password123!' },
            },
            AdminAnggaran: {
              summary: '4. Admin Anggaran / OTI',
              value: { username: 'admin.anggaran@bpjsketenagakerjaan.go.id', password: 'Password123!' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: '200 OK - Login Berhasil',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Login berhasil.' },
                data: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
                    user: { $ref: '#/components/schemas/UserPayload' },
                    availableRoles: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/RoleDetail' },
                    },
                    activeRole: { type: 'string', example: 'OFFICIAL_BOOKER' },
                  },
                },
              },
            },
          },
        },
      },
      '400': {
        description: '400 Bad Request - Username/Password Salah atau Validasi Input Gagal',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '500': {
        description: '500 Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
}