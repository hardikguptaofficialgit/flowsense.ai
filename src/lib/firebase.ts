import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth, signInWithPopup, type Auth } from "firebase/auth";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export let hasFirebaseConfig = false;
let authInstance: Auth | null = null;
let googleProviderInstance: GoogleAuthProvider | null = null;

export interface GooglePopupSignInResult {
	uid: string;
	email: string;
	displayName?: string;
	photoURL?: string;
	googleIdToken?: string;
}

export function configureFirebase(config: FirebaseWebConfig | null | undefined) {
	const firebaseConfig = config || null;
	const isComplete = Boolean(
		firebaseConfig?.apiKey &&
		firebaseConfig?.authDomain &&
		firebaseConfig?.projectId &&
		firebaseConfig?.storageBucket &&
		firebaseConfig?.messagingSenderId &&
		firebaseConfig?.appId
	);

	hasFirebaseConfig = isComplete;
	if (!isComplete || !firebaseConfig) {
		authInstance = null;
		googleProviderInstance = null;
		return false;
	}

	const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
	authInstance = getAuth(app);
	googleProviderInstance = new GoogleAuthProvider();
	googleProviderInstance.setCustomParameters({ prompt: "select_account" });
	return true;
}

export const db = null;
export const analytics = null;

export async function signInWithGooglePopup() {
	if (!authInstance || !googleProviderInstance) {
		throw new Error("Firebase is not configured for Google sign-in.");
	}

	try {
		const result = await signInWithPopup(authInstance, googleProviderInstance);
		const credential = GoogleAuthProvider.credentialFromResult(result);
		const email = String(result.user.email || "").trim();

		if (!result.user.uid || !email) {
			throw new Error("Google account is missing required profile details.");
		}

		return {
			uid: result.user.uid,
			email,
			displayName: result.user.displayName || undefined,
			photoURL: result.user.photoURL || undefined,
			googleIdToken: credential?.idToken || undefined,
		} as GooglePopupSignInResult;
	} catch (error) {
		// Safely handle popup closure and COOP errors
		if (error instanceof Error) {
			if (error.code === 'auth/popup-closed-by-user') {
				throw new Error("Sign-in was cancelled.");
			}
			if (error.message?.includes('Cross-Origin')) {
				console.warn("[COOP] Popup policy: This is normal and doesn't affect sign-in.");
			}
		}
		throw error;
	}
}
