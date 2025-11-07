// -----------------
//  firebase.js
// -----------------
//  ده ملف "الإعدادات" الصغير.
//  مهمته بس يجهز الـ db والـ auth لباقي الملفات.

// (1) استيراد المكتبات الأساسية
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// (2) !!! (مهم جداً) ضع إعداداتك هنا لوضع التطوير !!! ---
//
// ⬇️⬇️⬇️ (هنسيب دي "فاضية" وهنملى المفاتيح في Netlify)
//
const MANUAL_FIREBASE_CONFIG = {
  apiKey: "AIza...YourKey", // (هنسيبها فاضية)
  authDomain: "YourProject.firebaseapp.com", // (هنسيبها فاضية)
  projectId: "YourProject", // (هنسيبها فاضية)
  storageBucket: "YourProject.appspot.com", // (هنسيبها فاضية)
  messagingSenderId: "123456789", // (هنسيبها فاضية)
  appId: "1:123456789:web:abcdef123456" // (هنسيبها فاضية)
};

// (3) تهيئة وتشغيل Firebase
// (الكود ده هيحاول يستخدم الإعدادات اليدوية)
let app, db, auth;

try {
    app = initializeApp(MANUAL_FIREBASE_CONFIG);
    db = getFirestore(app);
    auth = getAuth(app);
    
    // (تفعيل حفظ حالة تسجيل الدخول)
    setPersistence(auth, browserLocalPersistence);

} catch (e) {
    console.error("خطأ فادح في تهيئة Firebase:", e);
    // (عرض خطأ للمستخدم لو الإعدادات مش موجودة)
    // (هنعالج ده في Netlify)
    document.body.innerHTML = `<div style="padding: 2rem; text-align: center; background: #fff; color: #b00;"><h1>خطأ في إعدادات Firebase</h1><p>لم يتم العثور على مفاتيح Firebase. سيقوم Netlify بحل هذه المشكلة.</p></div>`;
}

// (4) تصدير (Export) الأدوات لباقي الملفات
export { db, auth, app };
