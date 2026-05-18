import express from 'express'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const holdingsSnap = await getDb()
      .collection('portfolios')
      .where('userId', '==', userId)
      .get()

    if (holdingsSnap.empty) {
      return res.json({ ok: true, data: { userId, holdings: [] } })
    }

    const holdings = holdingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ ok: true, data: { userId, holdings } })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
