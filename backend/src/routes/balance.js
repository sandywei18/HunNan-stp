import express from 'express'
import admin from 'firebase-admin'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.post('/update', async (req, res) => {
  const { userId, amount } = req.body
  if (!userId || amount == null) {
    return res.status(400).json({ ok: false, error: 'userId and amount are required.' })
  }

  const delta = Number(amount)
  if (Number.isNaN(delta)) {
    return res.status(400).json({ ok: false, error: 'Amount must be a number.' })
  }

  try {
    const db = getDb()
    const userRef = db.collection('users').doc(userId)
    const userSnap = await userRef.get()
    if (!userSnap.exists) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const user = userSnap.data()
    const balance = Number(user.balance || 0)
    const newBalance = balance + delta
    if (newBalance < 0) {
      return res.status(400).json({ ok: false, error: 'Balance cannot go below zero.' })
    }

    await userRef.update({
      balance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    const updatedUser = await userRef.get()
    res.json({ ok: true, data: { id: updatedUser.id, ...updatedUser.data() } })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
