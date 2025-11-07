// -----------------
//  auth.js
// -----------------
//  ده "بوابة" الموقع.
//  مسئول عن تسجيل الدخول، إنشاء الحسابات، وتسجيل الخروج.

// (1) استيراد الأدوات اللي محتاجينها
// (هنجيب "الأمن" من مكتبة "الأمن")
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

// (هنجيب "قاعدة البيانات" علشان نسجل بيانات المستخدم)
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// (هنجيب "الإعدادات" اللي عملناها)
import { auth, db } from './firebase.js';

// (2) متغيرات ثابتة
// ------------------------------------
const DAILY_LIMIT_MINUTES = 10; // (الرصيد اليومي الافتراضي)

// (3) دوال المصادقة (للتصدير)
// ------------------------------------

/**
 * دالة مراقبة حالة المستخدم (الدالة الرئيسية)
 * دي اللي بتعرفنا مين اللي فاتح الموقع.
 */
export function setupAuthObserver(onUserLoggedIn, onUserLoggedOut) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // (المستخدم سجل دخوله)
            // (محاولة جلب بيانات المستخدم من قاعدة البيانات)
            const userDocRef = doc(db, "users", user.uid);
            const roleDocRef = doc(db, "roles", user.uid);

            const [userDocSnap, roleDocSnap] = await Promise.all([
                getDoc(userDocRef),
                getDoc(roleDocRef)
            ]);

            let userData = {};
            let userRoles = { role: 'user', isVip: false };

            if (userDocSnap.exists()) {
                userData = userDocSnap.data();
            } else {
                // (ده معناه إنه مستخدم جديد جداً ولسه بياناته متعملتش)
                // (هنعملها دلوقتي)
                console.log(`مستخدم جديد (${user.uid}). جاري إنشاء بياناته...`);
                userData = await createNewUserInFirestore(user.uid, user.displayName, user.email);
            }

            if (roleDocSnap.exists()) {
                userRoles = roleDocSnap.data();
            }

            // (دمج كل بيانات المستخدم في كائن واحد)
            const fullUserProfile = {
                ...user,       // (بيانات المصادقة: uid, email, displayName)
                ...userData,   // (بيانات التطبيق: balanceMinutes, lastReset)
                ...userRoles   // (بيانات الصلاحيات: role, isVip)
            };

            onUserLoggedIn(fullUserProfile);

        } else {
            // (المستخدم سجل خروجه)
            onUserLoggedOut();
        }
    });
}

/**
 * دالة معالجة "تسجيل الدخول"
 */
export async function handleLogin(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // (مش محتاجين نعمل حاجة، دالة onAuthStateChanged هتحس بالتغيير)
        return { success: true };
    } catch (e) {
        console.error("خطأ في تسجيل الدخول:", e.code);
        if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found') {
            return { success: false, error: "البريد الإلكتروني أو كلمة المرور غير صحيحة." };
        }
        return { success: false, error: "حدث خطأ أثناء تسجيل الدخول." };
    }
}

/**
 * دالة معالجة "إنشاء حساب جديد"
 */
export async function handleRegister(email, password, username) {
    try {
        // (1. إنشاء المستخدم في "الأمن")
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // (2. تحديث اسمه)
        await updateProfile(user, {
            displayName: username
        });

        // (3. إنشاء بياناته في "قاعدة البيانات")
        await createNewUserInFirestore(user.uid, username, email);

        // (مش محتاجين نعمل حاجة، دالة onAuthStateChanged هتحس بالمستخدم الجديد)
        return { success: true };

    } catch (e) {
        console.error("خطأ في التسجيل:", e.code);
        if (e.code === 'auth/email-already-in-use') {
            return { success: false, error: "هذا البريد الإلكترائي مسجل بالفعل." };
        } else if (e.code === 'auth/weak-password') {
             return { success: false, error: "كلمة المرور ضعيفة جداً." };
        }
        return { success: false, error: "حدث خطأ أثناء إنشاء الحساب." };
    }
}

/**
 * دالة معالجة "تسجيل الخروج"
 */
export async function handleLogout() {
    try {
        await signOut(auth);
        // (onAuthStateChanged هتحس بالتغيير)
        return { success: true };
    } catch (e) {
        console.error("خطأ في تسجيل الخروج:", e);
        return { success: false, error: "حدث خطأ أثناء تسجيل الخروج." };
    }
}


// (4) دوال مساعدة (داخلية)
// ------------------------------------

/**
 * دالة إنشاء بيانات المستخدم في Firestore
 * (دي دالة داخلية، الملفات التانية مش محتاجة تعرفها)
 */
async function createNewUserInFirestore(uid, displayName, email) {
    const userDocRef = doc(db, "users", uid);
    const roleDocRef = doc(db, "roles", uid);

    const newUserBaseData = {
        displayName: displayName,
        email: email,
        createdAt: serverTimestamp(),
        balanceMinutes: DAILY_LIMIT_MINUTES, // (رصيد أول مرة)
        lastReset: serverTimestamp() // (تاريخ أول رصيد)
    };

    const newUserRoleData = {
        role: 'user',
        isVip: false
    };

    try {
        // (كتابة البيانات في المستندين)
        await setDoc(userDocRef, newUserBaseData);
        await setDoc(roleDocRef, newUserRoleData);

        // (إرجاع البيانات الجديدة علشان نستخدمها فوراً)
        return newUserBaseData;

    } catch (e) {
        console.error("خطأ في إنشاء مستند المستخدم:", e);
        // (لو حصل خطأ، المستخدم هيفضل "مسجل" بس ملهوش بيانات.. هيحصل خطأ لاحقاً)
        // (ده هيخلينا نعرف لو حصلت مشكلة)
        throw new Error("حدث خطأ أثناء إعداد حسابك في قاعدة البيانات.");
    }
          }
