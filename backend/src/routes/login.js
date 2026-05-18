import express from 'express'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.post('/', async (req, res) => {
  const { userId, email } = req.body
  if (!userId && !email) {
    return res.status(400).json({ ok: false, error: 'userId or email is required.' })
  }

  try {
    const db = getDb()
    let userSnap
    if (userId) {
      userSnap = await db.collection('users').doc(userId).get()
    } else {
      const query = await db.collection('users').where('email', '==', email).limit(1).get()
      userSnap = query.docs[0]
    }

    if (!userSnap || !userSnap.exists) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const user = { id: userSnap.id, ...userSnap.data() }
    res.json({ ok: true, data: user })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
