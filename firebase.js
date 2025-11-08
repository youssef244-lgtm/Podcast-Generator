// -----------------
//  firebase.js
// -----------------
//  ده "ملف الإعدادات" اللي فيه "عنوان البيت" (مفاتيح Firebase).
//  المفاتيح دي "آمنة" لأننا عملنالها "قائمة بيضا" (Authorized Domains).

// (1) استيراد المكتبات الأساسية
// ------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// (2) المفاتيح بتاعتك (اللي إنت بعتهالي)
// ------------------------------------
const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAzIJvX_1JKIp_0PtQZz1jvgIodF7FNyq0",
  authDomain: "conm-cb12c.firebaseapp.com",
  projectId: "conm-cb12c",
  storageBucket: "conm-cb12c.firebasestorage.app",
  messagingSenderId: "514769211722",
  appId: "1:514769211722:web:afd3a9b3a5f5ccae6eb1b3",
  measurementId: "G-JZT7LC3TVK"
};

// (3) تهيئة وتشغيل الخدمات
// ------------------------------------
let db, auth;
try {
    const app = initializeApp(MANUAL_FIREBASE_CONFIG);
    db = getFirestore(app);
    auth = getAuth(app);
    // (تفعيل حفظ حالة تسجيل الدخول)
    setPersistence(auth, browserLocalPersistence);
} catch (e) {
    console.error("خطأ فادح في تهيئة Firebase:", e);
    // (ده هيظهر للمستخدم لو المفاتيح اتغيرت أو فيها مشكلة)
    document.body.innerHTML = `<div style="color: white; padding: 20px;">حدث خطأ فادح في تهيئة قاعدة البيانات. تأكد من صحة إعدادات Firebase.</div>`;
}

// (4) تصدير الأدوات للملفات التانية
// ------------------------------------
export { db, auth };


