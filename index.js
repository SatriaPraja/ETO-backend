import app from './app.js'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 Server e-TO BPJS Ketenagakerjaan Berjalan di http://localhost:${PORT}`)
})