/**
 * Firebase — cliente del panel admin · Condor Sky (condorsky-admin)
 *
 * Apunta SOLO al proyecto caidalibre-prod.
 */
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
     apiKey: "AIzaSyAx2BlGHw700bBp30-fy6IHfTYsbyabK-E",
    authDomain: "caidalibre-prod.firebaseapp.com",
    projectId: "caidalibre-prod",
    storageBucket: "caidalibre-prod.firebasestorage.app",
    messagingSenderId: "416159139708",
    appId: "1:416159139708:web:eb8dd81358363ce10f86f9",
    measurementId: "G-MLCMMGYTZ7"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const functions = getFunctions(app, "us-central1");
export const storage = getStorage(app);
