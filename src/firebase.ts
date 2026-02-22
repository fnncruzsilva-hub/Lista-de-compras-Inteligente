import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3W3SG5RdPBeSHDSKB4qtZVvGuctERMxI",
  authDomain: "listou-app-5535f.firebaseapp.com",
  projectId: "listou-app-5535f",
  storageBucket: "listou-app-5535f.firebasestorage.app",
  messagingSenderId: "221502013994",
  appId: "1:221502013994:web:25a35708c1fbec65f67953"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
        console.warn("Persistence failed: Multiple tabs open");
    } else if (err.code === 'unimplemented') {
        console.warn("Persistence is not available in this browser");
    }
});
