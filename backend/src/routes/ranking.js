import express from 'express'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('users').orderBy('netWorth', 'desc').limit(50).get()
    const ranking = snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        name: data.name || '',
        netWorth: Number(data.netWorth || 0),
        balance: Number(data.balance || 0),
        updatedAt: data.updatedAt || null
      }
    })
    res.json({ ok: true, data: ranking })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
