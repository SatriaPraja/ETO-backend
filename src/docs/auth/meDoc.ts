export const meDoc = {
  get: {
    summary: 'Get Current User Profile',
    description: 'Digunakan oleh Frontend untuk me-hydrate state Pinia saat reload halaman.',
    tags: ['Authentication'],
    security: [{ BearerAuth: [] }],
    responses: {
      '200': {
        description: '200 OK - Profil Berhasil Diambil',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: true },
                message: { type: 'string', example: 'Data profil berhasil diambil.' },
                data: {
                  type: 'object',
                  properties: {
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
      '401': {
        description: '401 Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/ErrorResponse' },
          },
        },
      },
    },
  },
}