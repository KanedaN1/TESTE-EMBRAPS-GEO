import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqKLYUtCgf9kPh8tBCWg6jjCBu87R6CVk",
  authDomain: "embraps-geo.firebaseapp.com",
  projectId: "embraps-geo",
  storageBucket: "embraps-geo.firebasestorage.app",
  messagingSenderId: "603153232486",
  appId: "1:603153232486:web:4efe6f2b5d435757be73a7",
  measurementId: "G-L04H64GE6M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
