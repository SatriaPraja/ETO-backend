import { authSchemas } from './schemas/authSchemas.ts'
import { userSchemas } from './schemas/userSchemas.ts'
import { travelOrderDocsSchema } from './schemas/travelOrderDocsSchema.ts'

import { loginDoc } from './auth/loginDoc.ts'
import { logoutDoc } from './auth/logoutDoc.ts'
import { switchRoleDoc } from './auth/switchRoleDoc.ts'
import { meDoc } from './auth/meDoc.ts'

import { createUserDoc } from './admin/createUserDoc.ts'
import { getUsersDoc, updateUserDoc, toggleUserStatusDoc } from './admin/userDoc.ts'

import { travelOrderDocs } from './travel-orders/travelOrderDocs.ts'

export const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'API E-TO BPJS Ketenagakerjaan',
    version: '1.0.0',
    description: 'Dokumentasi REST API Sistem E-TO (Electronic Travel Order) BPJS Ketenagakerjaan[cite: 8].',
  },
  tags: [
    { name: 'Authentication', description: 'Endpoint Autentikasi & Sesi' },
    { name: 'User Management', description: 'Endpoint Pengelolaan Pengguna & Role' },
    { name: 'Travel Orders', description: 'Endpoint Pengajuan & Pengelolaan Travel Order' },
  ],
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      ...authSchemas,
      ...userSchemas,
      ...travelOrderDocsSchema,
    },
  },
  paths: {
    // 🟢 AUTH GROUP
    '/api/auth/login': loginDoc,
    '/api/auth/logout': logoutDoc,
    '/api/auth/switch-role': switchRoleDoc,
    '/api/auth/me': meDoc,

    // 🟢 USER MANAGEMENT GROUP
    '/api/users': {
      ...getUsersDoc,
      ...createUserDoc,
    },
    '/api/users/{id}': updateUserDoc,
    '/api/users/{id}/status': toggleUserStatusDoc,

    // 🟢 TRAVEL ORDER GROUP
    ...travelOrderDocs,
  },
}