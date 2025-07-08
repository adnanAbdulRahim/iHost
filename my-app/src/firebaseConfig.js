// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

import AsyncStorage from "@react-native-async-storage/async-storage";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCgJAii5geZKh5tVzBtIur0UlbNCGgiRvw",
  authDomain: "socialme-a482f.firebaseapp.com",
  projectId: "socialme-a482f",
  storageBucket: "socialme-a482f.firebasestorage.app",
  messagingSenderId: "37482403987",
  appId: "1:37482403987:web:f725ca1d8a1138f0e1d566"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);  

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});


const db = getFirestore(app);
const storage = getStorage(app); 

export { auth, db, storage };