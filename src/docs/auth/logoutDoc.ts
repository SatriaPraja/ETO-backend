export const logoutDoc = {
  post: {
    summary: 'Logout Pengguna',
    description: 'Mengakhiri sesi autentikasi pengguna dan memberikan sinyal untuk menghapus token di frontend.',
    tags: ['Authentication'],
    security: [{ BearerAuth: [] }],
    responses: {
      '200': {
        description: '200 OK - Logout Berhasil',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Logout berhasil. Sesi telah diakhiri.' },
              },
            },
          },
        },
      },
      '401': {
        description: '401 Unauthorized - Token Tidak Ditemukan',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
}