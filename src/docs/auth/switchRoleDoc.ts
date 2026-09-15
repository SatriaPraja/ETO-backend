export const switchRoleDoc = {
  post: {
    summary: 'Ganti Peran (Switch Role)',
    description: 'Re-issue token JWT baru berdasarkan targetRoleId yang dipilih.',
    tags: ['Authentication'],
    security: [{ BearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SwitchRoleRequest' },
          examples: {
            SwitchToApprover: {
              summary: 'Ganti ke Approver (Kode: 03)',
              value: { targetRoleId: '03' },
            },
            SwitchToBooker: {
              summary: 'Ganti ke Booker (Kode: 02)',
              value: { targetRoleId: '02' },
            },
          },
        },
      },
    },
    responses: {
      '200': {
        description: '200 OK - Peran Berhasil Diubah',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Peran berhasil diubah.' },
                data: {
                  type: 'object',
                  properties: {
                    accessToken: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR...' },
                    activeRole: { type: 'string', example: 'APPROVER_KAKANWIL' },
                  },
                },
              },
            },
          },
        },
      },
      '400': {
        description: '400 Bad Request - Target Role Tidak Valid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
      '401': {
        description: '401 Unauthorized - Token Tidak Valid',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
}