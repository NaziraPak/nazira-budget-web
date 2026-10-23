import { initializeApp } from "firebase/app";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBbYw5GBeSI2Ws39EfOZ5montORU_2ciRk",
  authDomain: "nazira-budget.firebaseapp.com",
  projectId: "nazira-budget",
  storageBucket: "nazira-budget.firebasestorage.app",
  messagingSenderId: "323130426715",
  appId: "1:323130426715:web:1772a183f17e86b8d7467e"
};

const app = initializeApp(firebaseConfig);

// Инициализируем базу данных с настройками для Safari
export const db = getFirestore(app, {
  experimentalAutoDetectLongPolling: true, // <-- ВАЖНО: обходит блокировку Safari
  experimentalForceLongPolling: false
});

export const auth = getAuth(app);

console.log("✅ Firebase (DB + Auth) успешно подключен!");