import admin from 'firebase-admin'
import fs from 'fs'

export async function initFirestore() {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT || './serviceAccountKey.json'
    const options = {}

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))
      options.credential = admin.credential.cert(serviceAccount)
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      options.credential = admin.credential.applicationDefault()
    } else if (process.env.FIRESTORE_EMULATOR_HOST) {
      options.credential = admin.credential.applicationDefault()
    } else {
      throw new Error('Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.')
    }

    admin.initializeApp(options)
  }

  return admin.firestore()
}

export function getDb() {
  if (!admin.apps.length) {
    throw new Error('Firebase has not been initialized.')
  }
  return admin.firestore()
}
