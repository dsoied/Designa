import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, serverTimestamp, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, getDocs, limit } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from 'firebase/storage';

// Import the Firebase configuration
import firebaseAppletConfig from '../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseAppletConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseAppletConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseAppletConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseAppletConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseAppletConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseAppletConfig.appId,
};

const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseAppletConfig.firestoreDatabaseId;

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);

// Log configuration for debugging (masking sensitive parts)
console.log('Firebase: Inicializando com Project ID:', firebaseConfig.projectId);
console.log('Firebase: Auth Domain:', firebaseConfig.authDomain);
console.log('Firebase: Storage Bucket:', firebaseConfig.storageBucket);

export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling for Firestore
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth Helper Functions
export const signInWithGoogle = async () => {
  try {
    console.log("Firebase: Iniciando login com Google Popup...");
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("Firebase: Login bem-sucedido para:", user.email);
    
    // Small delay to ensure Firestore picks up the auth state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check if user exists in Firestore, if not create profile
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    const isOwner = user.email === 'dissooquevemdepois@gmail.com';
    
    if (!userSnap.exists()) {
      try {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          role: isOwner ? 'admin' : 'user',
          planSelected: false,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Firebase: Erro ao criar documento de usuário:", err);
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }
    } else if (isOwner && userSnap.data().role !== 'admin') {
      await updateDoc(userRef, { role: 'admin' });
    }
    
    return user;
  } catch (error: any) {
    console.error("Firebase: Erro no login com Google:", error);
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("A janela de login foi fechada antes de completar. Tente novamente.");
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error("Este domínio não está autorizado no Firebase. Adicione " + window.location.hostname + " aos domínios autorizados.");
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error("O login com Google não está ativado no console do Firebase.");
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

export const signUpWithEmail = async (email: string, pass: string, name: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    const user = result.user;
    
    await updateProfile(user, { displayName: name });
    
    const userRef = doc(db, 'users', user.uid);
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: name,
        role: 'user',
        planSelected: false, // Explicitly false to trigger modal
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error("Firebase: Erro ao criar documento de usuário no cadastro:", err);
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
    }
    
    return user;
  } catch (error) {
    console.error("Error signing up with email:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string, remember: boolean = true) => {
  try {
    await setPersistence(auth, remember ? browserLocalPersistence : browserSessionPersistence);
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return result.user;
  } catch (error) {
    console.error("Error logging in with email:", error);
    throw error;
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

export const uploadImageToStorage = async (base64Data: string, fileName: string, path: string): Promise<string> => {
  if (!auth.currentUser) throw new Error("Usuário não autenticado");
  
  if (!firebaseConfig.storageBucket) {
    console.error("Firebase: Storage Bucket não configurado! Verifique o arquivo firebase-applet-config.json");
    throw new Error("Erro de configuração: Storage Bucket não encontrado.");
  }

  try {
    const storageRef = ref(storage, `${path}/${fileName}`);
    console.log(`Firebase: Iniciando upload para ${path}/${fileName} (Bucket: ${firebaseConfig.storageBucket})`);
    
    // If it's a data URL, use 'data_url' format, otherwise assume 'base64'
    const format = base64Data.startsWith('data:') ? 'data_url' : 'base64';
    
    // For large files, uploadString can be slow. Let's add a timeout log if needed
    const uploadTask = uploadString(storageRef, base64Data, format);
    
    await uploadTask;
    const url = await getDownloadURL(storageRef);
    console.log("Firebase: Upload concluído com sucesso. URL gerada.");
    return url;
  } catch (error: any) {
    console.error('Firebase: Erro detalhado no upload:', error);
    if (error.code === 'storage/retry-limit-exceeded') {
      throw new Error("Erro de conexão com o Firebase Storage. Verifique se o serviço está ativo e se o domínio está autorizado.");
    }
    throw error;
  }
};

export { onAuthStateChanged, doc, setDoc, getDoc, serverTimestamp, collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, updateDoc, getDocs, limit, ref, uploadString, getDownloadURL, deleteObject, updateProfile };
export type { FirebaseUser };
