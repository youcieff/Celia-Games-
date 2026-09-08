import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
    apiKey: "AIzaSyAygCJaU8BS6gcAyistyDojD7l2aCFwgnw",
    authDomain: "celia-games-9ed83.firebaseapp.com",
    databaseURL: "https://celia-games-9ed83-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "celia-games-9ed83",
    storageBucket: "celia-games-9ed83.firebasestorage.app",
    messagingSenderId: "519214921029",
    appId: "1:519214921029:web:9b15f179dc386e17b33a2c",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
