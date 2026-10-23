import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // <-- Добавили авторизацию

const firebaseConfig = {
  apiKey: "AIzaSyBbYw5GBeSI2Ws39EfOZ5montORU_2ciRk",
  authDomain: "nazira-budget.firebaseapp.com",
  projectId: "nazira-budget",
  storageBucket: "nazira-budget.firebasestorage.app",
  messagingSenderId: "323130426715",
  appId: "1:323130426715:web:1772a183f17e86b8d7467e"
};

const app = initializeApp(firebaseConfig);

// Инициализируем базу данных и авторизацию
export const db = getFirestore(app);
export const auth = getAuth(app); // <-- Экспортируем объект auth

export function resolveDisplayName(firebaseUser) {
  if (!firebaseUser) return ''
  const fromProfile = firebaseUser.displayName?.trim()
  if (fromProfile) return fromProfile
  const fromProvider = firebaseUser.providerData?.find((profile) => profile.displayName?.trim())?.displayName?.trim()
  return fromProvider || ''
}

console.log("✅ Firebase (DB + Auth) успешно подключен!");