import express from 'express'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('users').orderBy('name').get()
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ ok: true, data: users })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

router.get('/:userId', async (req, res) => {
  const { userId } = req.params
  try {
    const doc = await getDb().collection('users').doc(userId).get()
    if (!doc.exists) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }
    res.json({ ok: true, data: { id: doc.id, ...doc.data() } })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
