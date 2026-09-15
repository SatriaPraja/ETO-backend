import { authSchemas } from './schemas/authSchemas.ts'
import { loginDoc } from './auth/loginDoc.ts'
import { registerDoc } from './auth/registerDoc.ts'
import { logoutDoc } from './auth/logoutDoc.ts'
import { switchRoleDoc } from './auth/switchRoleDoc.ts'
import { meDoc } from './auth/meDoc.ts'

export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'API E-TO BPJS Ketenagakerjaan',
    version: '1.0.0',
    description: 'Dokumentasi REST API Sistem E-TO (Electronic Travel Order) BPJS Ketenagakerjaan - Domain Autentikasi & Manajemen Role.',
  },
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
        description: 'Masukkan Token JWT yang didapat setelah login.',
      },
    },
    schemas: {
      ...authSchemas,
    },
  },
  paths: {
    '/api/auth/login': loginDoc,
    '/api/auth/register': registerDoc,
    '/api/auth/logout': logoutDoc,
    '/api/auth/switch-role': switchRoleDoc,
    '/api/auth/me': meDoc,
  },
}