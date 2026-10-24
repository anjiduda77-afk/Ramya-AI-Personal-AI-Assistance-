import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInAnonymously, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHzFCuzWprdeLOK-XVcZYxhjlZuOEJbUI",
  authDomain: "ramya-ai-b22e4.firebaseapp.com",
  projectId: "ramya-ai-b22e4",
  storageBucket: "ramya-ai-b22e4.firebasestorage.app",
  messagingSenderId: "693743485680",
  appId: "1:693743485680:web:e682b4f7f5c0eda152b835",
  measurementId: "G-F7G6WP8KCP"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

// User Helper Methods
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    if (user) {
      // Sync user profile to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: user.displayName || "Ramya Member",
        email: user.email || "",
        photoUrl: user.photoURL || "",
        providerId: "google.com",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

export async function signInAsGuest(): Promise<User | null> {
  try {
    const result = await signInAnonymously(auth);
    const user = result.user;
    if (user) {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        displayName: "Guest Member",
        email: "",
        providerId: "anonymous",
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    return user;
  } catch (error) {
    console.error("Guest Sign-In Error:", error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function saveConversationToFirestore(
  userId: string,
  userTranscript: string,
  assistantResponse: string
) {
  try {
    await addDoc(collection(db, "users", userId, "conversations"), {
      userTranscript: userTranscript.substring(0, 2000),
      assistantResponse: assistantResponse.substring(0, 5000),
      timestamp: serverTimestamp()
    });
  } catch (error) {
    console.warn("Firestore sync skipped:", error);
  }
}
