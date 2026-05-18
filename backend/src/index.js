import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import dotenv from 'dotenv'
import ordersRouter from './routes/orders.js'
import rankingRouter from './routes/ranking.js'
import loginRouter from './routes/login.js'
import usersRouter from './routes/users.js'
import portfolioRouter from './routes/portfolio.js'
import balanceRouter from './routes/balance.js'
import chatRouter from './routes/chat.js'
import marketRouter from './routes/market.js'
import aiRouter from './routes/ai.js'
import { initFirestore } from './services/firebase.js'

dotenv.config()

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST', 'OPTIONS']
  }
})

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.set('io', io)
app.use('/login', loginRouter)
app.use('/users', usersRouter)
app.use('/portfolio', portfolioRouter)
app.use('/balance', balanceRouter)
app.use('/chat', chatRouter)
app.use('/market', marketRouter)
app.use('/ai', aiRouter)
app.use('/orders', ordersRouter)
app.use('/ranking', rankingRouter)

app.get('/health', (req, res) => {
  res.json({ ok: true, status: 'backend running' })
})

io.on('connection', socket => {
  console.log('Socket connected:', socket.id)

  socket.on('subscribe', room => {
    if (room) {
      socket.join(room)
      console.log('Socket joined room:', room)
    }
  })

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id)
  })
})

const port = Number(process.env.PORT || 4000)

initFirestore()
  .then(() => {
    server.listen(port, () => {
      console.log(`huanan-stp backend listening on http://localhost:${port}`)
    })
  })
  .catch(error => {
    console.error('Failed to initialize Firebase:', error)
    process.exit(1)
  })
