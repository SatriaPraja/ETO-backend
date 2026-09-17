import { authSchemas } from './schemas/authSchemas.ts'
import { userSchemas } from './schemas/userSchemas.ts'

import { loginDoc } from './auth/loginDoc.ts'
import { logoutDoc } from './auth/logoutDoc.ts'
import { switchRoleDoc } from './auth/switchRoleDoc.ts'
import { meDoc } from './auth/meDoc.ts'

import { createUserDoc } from './admin/createUserDoc.ts' // Atau dari admin/
import { getUsersDoc, updateUserDoc, toggleUserStatusDoc } from './admin/userDoc.ts'

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API E-TO BPJS Ketenagakerjaan',
    version: '1.0.0',
    description: 'Dokumentasi REST API Sistem E-TO (Electronic Travel Order) BPJS Ketenagakerjaan.',
  },
  tags: [
    { name: 'Authentication', description: 'Endpoint Autentikasi & Sesi' },
    { name: 'User Management', description: 'Endpoint Pengelolaan Pengguna & Role' },
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
    },
  },
  paths: {
    // 🟢 AUTH GROUP (Hanya 4 Endpoint Sesi)
    '/api/auth/login': loginDoc,
    '/api/auth/logout': logoutDoc,
    '/api/auth/switch-role': switchRoleDoc,
    '/api/auth/me': meDoc,

    // 🟢 USER MANAGEMENT GROUP (Register/Create dipindah ke sini)
    '/api/users': {
      ...getUsersDoc,   // GET  /api/users
      ...createUserDoc,   // POST /api/users (Register User Baru)
    },
    '/api/users/{id}': updateUserDoc,         // PUT   /api/users/{id}
    '/api/users/{id}/status': toggleUserStatusDoc, // PATCH /api/users/{id}/status
  },
}