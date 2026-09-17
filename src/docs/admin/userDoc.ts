// GET /api/users
export const getUsersDoc = {
  get: {
    summary: 'Daftar Seluruh Pengguna',
    description: 'Mengambil daftar pengguna dengan pencarian (Search), filter Role, dan Pagination.',
    tags: ['User Management'],
    parameters: [
      {
        name: 'search',
        in: 'query',
        required: false,
        schema: { type: 'string', example: 'Super Admin' },
      },
      {
        name: 'role',
        in: 'query',
        required: false,
        schema: {
          type: 'string',
          enum: ['ALL', 'SUPER_ADMIN', 'OFFICIAL_BOOKER', 'APPROVER_KAKANWIL', 'ADMIN_TRAVEL_KP', 'ASDEP_KEUANGAN'],
          default: 'ALL',
        },
      },
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 } },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 } },
    ],
    responses: {
      '200': {
        description: '200 OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Daftar pengguna berhasil diambil.' },
                data: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/UserManagementItem' },
                },
              },
            },
          },
        },
      },
    },
  },
}

// PUT /api/users/{id}
export const updateUserDoc = {
  put: {
    summary: 'Perbarui Data Pengguna',
    description: 'Memperbarui profil, jabatan, unit kerja, dan role pengguna.',
    tags: ['User Management'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/UpdateUserRequest' },
        },
      },
    },
    responses: {
      '200': {
        description: '200 OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Data pengguna berhasil diperbarui.' },
                data: { $ref: '#/components/schemas/UserManagementItem' },
              },
            },
          },
        },
      },
    },
  },
}

// PATCH /api/users/{id}/status
export const toggleUserStatusDoc = {
  patch: {
    summary: 'Ubah Status Aktif/Nonaktif',
    description: 'Mengaktifkan atau memblokir akses pengguna.',
    tags: ['User Management'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/ToggleStatusRequest' },
        },
      },
    },
    responses: {
      '200': {
        description: '200 OK',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Status pengguna berhasil diubah.' },
              },
            },
          },
        },
      },
    },
  },
}