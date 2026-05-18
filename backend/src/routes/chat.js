import express from 'express'
import admin from 'firebase-admin'
import { getDb } from '../services/firebase.js'
const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const snapshot = await getDb().collection('chat').orderBy('createdAt', 'asc').limit(200).get()
    const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    res.json({ ok: true, data: messages })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

router.post('/', async (req, res) => {
  const io = req.app.get('io')
  const { userId, userName, content, type } = req.body
  if (!userId || !content) {
    return res.status(400).json({ ok: false, error: 'userId and content are required.' })
  }

  try {
    const message = {
      userId,
      userName: userName || '匿名',
      content,
      type: type || 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }

    const docRef = await getDb().collection('chat').add(message)
    const docSnap = await docRef.get()
    const newMessage = { id: docRef.id, ...docSnap.data() }

    io.emit('chat.message', newMessage)
    res.status(201).json({ ok: true, data: newMessage })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
})

export default router
