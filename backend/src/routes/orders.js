import express from 'express'
import admin from 'firebase-admin'
import { getDb } from '../services/firebase.js'
import { updatePortfolioHoldings, calculateNetWorth } from '../services/portfolio.js'
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('orders').orderBy('createdAt', 'desc').limit(200).get()
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ ok: true, data: orders })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

router.post('/create', async (req, res) => {
  const io = req.app.get('io')
  const { userId, symbol, action, quantity, price, type, notes } = req.body

  if (!userId || !symbol || !action || quantity == null || price == null) {
    return res.status(400).json({ ok: false, error: 'Missing required fields.' })
  }

  const qty = Number(quantity)
  const pri = Number(price)
  if (Number.isNaN(qty) || qty <= 0 || Number.isNaN(pri) || pri <= 0) {
    return res.status(400).json({ ok: false, error: 'Quantity and price must be positive numbers.' })
  }

  try {
    const db = getDb()
    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const userData = userSnap.data()
    const balance = Number(userData.balance || 0)
    const orderCost = qty * pri

    if (action === 'buy' && orderCost > balance) {
      return res.status(400).json({ ok: false, error: 'Insufficient balance.' })
    }

    const orderDoc = {
      userId,
      symbol,
      action,
      quantity: qty,
      price: pri,
      type: type || 'market',
      notes: notes || '',
      status: 'filled',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const orderRef = await db.collection('orders').add(orderDoc)

    const updatedBalance = action === 'buy' ? balance - orderCost : balance + orderCost
    await userRef.update({ balance: updatedBalance, updatedAt: admin.firestore.FieldValue.serverTimestamp() })

    await updatePortfolioHoldings(userId, symbol, action, qty, pri)
    await calculateNetWorth(userId)

    const newOrderSnap = await orderRef.get()
    const newOrder = { id: orderRef.id, ...newOrderSnap.data() }

    io.emit('order.created', newOrder)
    io.emit('ranking.updated', { userId })

    res.status(201).json({ ok: true, data: newOrder })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
