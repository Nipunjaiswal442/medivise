import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyD4z6CmPq9QwJDWTUF5o95hnxd97KqnzLU",
    authDomain: "medivise-45810.firebaseapp.com",
    projectId: "medivise-45810",
    storageBucket: "medivise-45810.firebasestorage.app",
    messagingSenderId: "665723565952",
    appId: "1:665723565952:web:559e059705e0016b717365",
    measurementId: "G-DH0BM4NL1S",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
