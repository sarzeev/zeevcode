import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyBUMq1zVlZUTD6zgtpoX_He5LB-nZPwqpI",
  authDomain: "zeevcode1.firebaseapp.com",
  projectId: "zeevcode1",
  storageBucket: "zeevcode1.firebasestorage.app",
  messagingSenderId: "850363196503",
  appId: "1:850363196503:web:21dc64d1048ef483b56f12",
  measurementId: "G-BW8HJLMT76"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
