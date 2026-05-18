import admin from 'firebase-admin'
import { initFirestore } from './services/firebase.js'

const users = [
  {
    id: 'user1',
    name: '小明',
    email: 'xiaoming@example.com',
    balance: 200000000,
    netWorth: 200000000,
    role: 'trader',
    updatedAt: new Date()
  },
  {
    id: 'user2',
    name: '小華',
    email: 'xiaohua@example.com',
    balance: 180000000,
    netWorth: 180000000,
    role: 'analyst',
    updatedAt: new Date()
  },
  {
    id: 'user3',
    name: '阿美',
    email: 'amei@example.com',
    balance: 190000000,
    netWorth: 190000000,
    role: 'risk',
    updatedAt: new Date()
  }
]

const orders = [
  {
    userId: 'user1',
    symbol: '2330.TW',
    action: 'buy',
    quantity: 100,
    price: 930,
    type: 'market',
    notes: '長期持有台積電',
    status: 'filled'
  },
  {
    userId: 'user2',
    symbol: '0050.TW',
    action: 'buy',
    quantity: 500,
    price: 198,
    type: 'market',
    notes: '追蹤大盤',
    status: 'filled'
  }
]

const chatMessages = [
  {
    userId: 'user1',
    userName: '小明',
    content: '大家好，今天目標是把勝率提高到 70%。',
    type: 'user'
  },
  {
    userId: 'user2',
    userName: '小華',
    content: '我推薦先觀察 2330 的 MA 走勢，再決定是否加碼。',
    type: 'user'
  }
]

async function seed() {
  try {
    const db = await initFirestore()

    console.log('Seeding users...')
    for (const user of users) {
      await db.collection('users').doc(user.id).set({
        ...user,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    console.log('Seeding orders...')
    const ordersCol = db.collection('orders')
    for (const order of orders) {
      await ordersCol.add({
        ...order,
        quantity: order.quantity,
        price: order.price,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    console.log('Seeding chat messages...')
    const chatCol = db.collection('chat')
    for (const msg of chatMessages) {
      await chatCol.add({
        ...msg,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      })
    }

    console.log('Seed complete.')
    process.exit(0)
  } catch (error) {
    console.error('Seed failed:', error)
    process.exit(1)
  }
}

seed()
