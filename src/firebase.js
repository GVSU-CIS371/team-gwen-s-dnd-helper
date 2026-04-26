import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBe3bPChp7dlcKiniahgrKaIv1KkhnZ9FQ',
  authDomain: 'gwens-dnd-companion.firebaseapp.com',
  projectId: 'gwens-dnd-companion',
  storageBucket: 'gwens-dnd-companion.firebasestorage.app',
  messagingSenderId: '260446913287',
  appId: '1:260446913287:web:a3af97561315e629f6bba2',
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
