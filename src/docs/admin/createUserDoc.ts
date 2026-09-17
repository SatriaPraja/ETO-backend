export const createUserDoc = {
  post: {
    summary: 'Register User Baru',
    description: 'Mendaftarkan akun pengguna baru ke dalam database.',
    tags: ['User Management'],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/RegisterRequest' },
        },
      },
    },
    responses: {
      '201': {
        description: '201 Created - Pengguna Berhasil Didaftarkan',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Pengguna baru berhasil didaftarkan.' },
                data: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', example: 'b219e120-192a-4311-b01f-019234102941' },
                    npk: { type: 'string', example: '10000001' },
                    namaLengkap: { type: 'string', example: 'Super Admin E-TO' },
                    email: { type: 'string', example: 'super.admin@bpjsketenagakerjaan.go.id' },
                    role: { type: 'string', example: 'SUPER_ADMIN' },
                  },
                },
              },
            },
          },
        },
      },
      '400': {
        description: '400 Bad Request - NPK/Email Sudah Ada atau Validasi Gagal',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
}