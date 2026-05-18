import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'

const firebaseConfig = {
  apiKey: 'AIzaSyDNmpIAfUbIx-i6zawCFu8K7VdIwo6Thac',
  authDomain: 'huanan-stp.firebaseapp.com',
  projectId: 'huanan-stp',
  storageBucket: 'huanan-stp.firebasestorage.app',
  messagingSenderId: '152607600794',
  appId: '1:152607600794:web:3c7e663ede95497ff9ef23',
  measurementId: 'G-5KNN13FRW1',
}

const app = initializeApp(firebaseConfig)
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null

export { app, analytics }
