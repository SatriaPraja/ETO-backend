import Redis from 'ioredis'
import dotenv from 'dotenv'

dotenv.config()

export const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
})

redis.on('connect', () => {
  console.log('⚡ Terhubung ke Redis Server (Docker Desktop)')
})

redis.on('error', (err) => {
  console.error('❌ Redis Connection Error:', err.message)
})