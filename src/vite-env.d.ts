/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  /** reCAPTCHA Enterprise site key for App Check. Public; empty disables App Check entirely. */
  readonly VITE_APP_CHECK_SITE_KEY?: string;
  /** Firestore database id. Empty or "(default)" → the project's default database. */
  readonly VITE_FIREBASE_DATABASE_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
