import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Твой конфиг со скриншота
const firebaseConfig = {
  apiKey: "AIzaSyA-_UZ3UoEvVBATAr4RDRyll3CQv1wB0k",
  authDomain: "triplegis.firebaseapp.com",
  projectId: "triplegis",
  storageBucket: "triplegis.firebasestorage.app",
  messagingSenderId: "619959387494",
  appId: "1:619959387494:web:1b041156bff5fa67b97f27",
  measurementId: "G-ET83TZLHK2"
};

// Инициализируем Firebase
const app = initializeApp(firebaseConfig);

// Экспортируем базу данных Firestore
export const db = getFirestore(app);