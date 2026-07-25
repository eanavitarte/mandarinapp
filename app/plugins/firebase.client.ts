import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  const firebaseConfig = {
    apiKey: config.public.firebaseApiKey,
    authDomain: config.public.firebaseAuthDomain,
    projectId: config.public.firebaseProjectId,
    storageBucket: config.public.firebaseStorageBucket,
    messagingSenderId: config.public.firebaseMessagingSenderId,
    appId: config.public.firebaseAppId,
    measurementId: config.public.firebaseMeasurementId
  };

  let app;
  let db;

  try {
    app = initializeApp(firebaseConfig);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
  } catch (error) {
    console.error("Firebase client initialization error:", error);
  }

  return {
    provide: {
      firebaseApp: app,
      db: db
    }
  };
});

