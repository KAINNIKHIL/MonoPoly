import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDq_6PGNlfnoo1sxs9tym6T5j_xnN0dE5w",
  authDomain: "monopoly-2e9d1.firebaseapp.com",
  projectId: "monopoly-2e9d1",
  storageBucket: "monopoly-2e9d1.firebasestorage.app",
  messagingSenderId: "1029720534993",
  appId: "1:1029720534993:web:faa7bbf5f0a517c31c7af0"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

