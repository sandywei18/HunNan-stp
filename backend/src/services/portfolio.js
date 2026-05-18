import admin from 'firebase-admin'
import { getDb } from './firebase.js'

const SYMBOL_REFERENCE = {
  '2330.TW': 950,
  '2317.TW': 135,
  '2454.TW': 1180,
  '0050.TW': 195,
  '0056.TW': 42,
  '00878.TW': 18,
  '00929.TW': 22,
  '006208.TW': 105,
  '00631L.TW': 68,
  '00632R.TW': 18,
}

export async function updatePortfolioHoldings(userId, symbol, action, quantity, price) {
  const db = getDb()
  const key = `${userId}_${symbol}`
  const docRef = db.collection('portfolios').doc(key)
  const docSnap = await docRef.get()
  const qty = Number(quantity)
  const existing = docSnap.exists ? docSnap.data() : null

  if (action === 'buy') {
    const newLots = existing ? existing.lots + qty : qty
    const existingValue = existing ? existing.lots * existing.avgPrice : 0
    const newValue = existingValue + qty * price
    const avgPrice = newValue / newLots
    await docRef.set({
      userId,
      symbol,
      lots: newLots,
      avgPrice: parseFloat(avgPrice.toFixed(2)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  } else {
    if (!existing || existing.lots < qty) {
      throw new Error('Not enough holdings to sell.')
    }
    const newLots = existing.lots - qty
    if (newLots === 0) {
      await docRef.delete()
      return
    }
    await docRef.update({
      lots: newLots,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })
  }
}

export async function calculateNetWorth(userId) {
  const db = getDb()
  const userRef = db.collection('users').doc(userId)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new Error('User not found.')
  const userData = userSnap.data()
  const balance = Number(userData.balance || 0)

  const holdingsSnap = await db.collection('portfolios').where('userId', '==', userId).get()
  let holdingsValue = 0
  holdingsSnap.forEach(doc => {
    const data = doc.data()
    const price = SYMBOL_REFERENCE[data.symbol] || data.avgPrice || 0
    holdingsValue += Number(data.lots || 0) * Number(price) * 1000
  })

  const netWorth = balance + holdingsValue
  await userRef.update({
    netWorth,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  })
  return netWorth
}

export async function getPortfolio(userId) {
  const db = getDb()
  const holdingsSnap = await db.collection('portfolios').where('userId', '==', userId).get()
  return holdingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}
