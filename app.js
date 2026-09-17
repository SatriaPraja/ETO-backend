import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { apiReference } from '@scalar/express-api-reference'
import { pool } from './src/config/database.ts'
import './src/config/redis.ts' // Menyalakan Redis Connection

// 1. Import Routes
import authRoutes from './src/routes/authRoutes.ts'
import userRoutes from './src/routes/userRoutes.ts' // 🟢 Tambahkan ini

import { swaggerSpec } from './src/docs/index.ts'

const app = express()

// Konfigurasi CORS agar mendukung credentials (Cookie)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
)

app.use(express.json())
app.use(cookieParser())

// Scalar OpenAPI Documentation
app.use(
  '/docs',
  apiReference({
    theme: 'purple',
    spec: { content: swaggerSpec },
  })
)

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() as current_time, current_database() as db_name')
    return res.status(200).json({
      status: 'OK',
      message: 'Server, Database PostgreSQL, dan Redis berjalan normal',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        name: dbResult.rows[0].db_name,
        serverTime: dbResult.rows[0].current_time,
      },
    })
  } catch (error) { // 👈 Hapus ': any' di sini
    return res.status(500).json({
      status: 'ERROR',
      message: 'Gagal terhubung ke database',
      error: error.message,
    })
  }
})

app.get('/', (req, res) => res.redirect('/docs'))

// 2. Mount API Routes
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes) // 🟢 Mount rute manajemen pengguna disini

export default app