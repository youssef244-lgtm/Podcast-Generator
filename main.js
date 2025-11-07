// -----------------
//  main.js
// -----------------
//  ده "العقل" و "الوسيط".
//  ده الملف اللي بيربط كل الملفات التانية ببعض.

// (1) استيراد "الإعدادات" (علشان نتأكد إنها اشتغلت)
// ------------------------------------
import { auth, db } from './firebase.js';

// (2) استيراد "المواتير" (دوال جيميناي)
// ------------------------------------
import {
    initApi, // (دالة تهيئة المفتاح)
    generateTextOnly,
    generateAudioOnly,
    generatePodcastScript,
    generatePodcastAudio,
    MALE_VOICE, // (اسم صوت الذكر)
    FEMALE_VOICE // (اسم صوت الأنثى)
} from './api.js';

// (3) استيراد "البوابة" (دوال المصادقة)
// ------------------------------------
import {
    setupAuthObserver,
    handleLogin,
    handleRegister,
    handleLogout
} from './auth.js';

// (4) استيراد "غرفة التحكم" (دوال الأدمن)
// ------------------------------------
import {
    initAdmin,
    showAdminPanel,
    hideAdminPanel,
    setupAdminListeners,
    clearAdminListeners
} from './admin.js';

// (5) استيراد "قاعدة البيانات" (علشان نعدل الرصيد)
// ------------------------------------
import {
    doc,
    updateDoc,
    serverTimestamp,
    onSnapshot // (علشان نراقب الرصيد)
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";


// (6) متغيرات الحالة (State) - (لتخزين بيانات المستخدم)
// ------------------------------------
let currentUser = null; // (لتخزين بيانات المستخدم بالكامل)
let userBalanceUnsub = null; // (لتخزين مستمع الرصيد علشان نوقفه)
const DAILY_LIMIT_MINUTES = 10; // (الرصيد اليومي)
const ACTIVE_SESSION_KEY = 'podcast_active_session_v1'; // (علشان رسالة الـ VIP)

// (7) عناصر الواجهة (UI Elements) - (هنجيب كل الزراير)
// ------------------------------------
// (العناصر العامة)
const globalLoader = document.getElementById('global-loader');
const globalErrorModal = document.getElementById('global-error');
const globalErrorMessage = document.getElementById('global-error-message');
const closeErrorBtn = document.getElementById('close-error-btn');

// (عناصر الهيدر)
const userSessionControls = document.getElementById('user-session-controls');
const welcomeUser = document.getElementById('welcome-user');
const userDisplayName = document.getElementById('user-display-name');
const balanceDisplay = document.getElementById('balance-display');
const logoutBtn = document.getElementById('logout-btn');

// (عناصر المصادقة)
const authContainer = document.getElementById('auth-container');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const registerUsernameInput = document.getElementById('register-username');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');

// (عناصر التطبيق)
const appContainer = document.getElementById('app-container');
const generateBtn = document.getElementById('generate-btn');
const generateBtnText = document.getElementById('generate-btn-text');
const podcastIcon = document.getElementById('podcast-icon');
const textInput = document.getElementById('text-input');
const statusContainer = document.getElementById('status-container');
const errorContainer = document.getElementById('error-container');
const scriptContainer = document.getElementById('script-container');
const scriptTitle = document.getElementById('script-title');
const scriptOutput = document.getElementById('script-output');
const audioContainer = document.getElementById('audio-container');
const audioPlayer = document.getElementById('audio-player');
const [optionPodcast, optionExplain, optionAudioExplain, optionReadText] = [
    document.getElementById('option-podcast'),
    document.getElementById('option-explain'),
    document.getElementById('option-audio-explain'),
    document.getElementById('option-read-text')
];
const voiceOptionsContainer = document.getElementById('voice-options-container');
const optionVoiceMale = document.getElementById('option-voice-male');

// (عناصر الـ VIP)
const vipWelcomeModal = document.getElementById('vip-welcome-modal');
const vipUsername = document.getElementById('vip-username');
const closeVipModalBtn = document.getElementById('close-vip-modal-btn');

// (عناصر الملاحظات)
const feedbackTextarea = document.getElementById('feedback-textarea');
const sendFeedbackBtn = document.getElementById('send-feedback-btn');
const feedbackSuccessMsg = document.getElementById('feedback-success-msg');

// (عناصر الأدمن)
const adminPanelBtn = document.getElementById('admin-panel-btn');
const returnToUserViewBtn = document.getElementById('return-to-user-view-btn');
const adminPanelContainer = document.getElementById('admin-panel-container');
const closeAdminPanelBtn = document.getElementById('close-admin-panel-btn');
const adminIncognitoBtn = document.getElementById('admin-incognito-btn');
const adminUserCount = document.getElementById('admin-user-count');
const adminFeedbackList = document.getElementById('admin-feedback-list');
const adminUserListTable = document.getElementById('admin-user-list-table');


// (8) دوال الواجهة (UI Helpers)
// ------------------------------------
const showLoader = (show) => { globalLoader.style.display = show ? 'flex' : 'none'; };
const showError = (message) => {
    console.error(message);
    globalErrorMessage.textContent = message;
    globalErrorModal.style.display = 'flex';
};
const hideError = () => { globalErrorModal.style.display = 'none'; };

// (التحكم في إظهار الشاشات الرئيسية)
const showAuthUI = () => {
    appContainer.style.display = 'none';
    adminPanelContainer.style.display = 'none';
    authContainer.style.display = 'block';
    userSessionControls.style.display = 'none';
    adminPanelBtn.style.display = 'none';
    returnToUserViewBtn.style.display = 'none';
    showLoader(false);
};

const showAppUI = () => {
    authContainer.style.display = 'none';
    adminPanelContainer.style.display = 'none';
    appContainer.style.display = 'block';
    userSessionControls.style.display = 'flex';
    showLoader(false);
};

// (إظهار رسالة الـ VIP)
const showVipWelcomePopup = (username) => {
    vipUsername.textContent = username;
    vipWelcomeModal.style.display = 'flex';
};

// (تحديث شكل زرار "إنشاء")
function updateGenerateButtonUI() {
    if (optionPodcast.checked) {
        generateBtnText.textContent = 'إنشاء بودكاست';
        podcastIcon.style.display = 'inline';
        voiceOptionsContainer.style.display = 'none';
    } else if (optionExplain.checked) {
        generateBtnText.textContent = 'شرح / إجابة';
        podcastIcon.style.display = 'none';
        voiceOptionsContainer.style.display = 'none';
    } else if (optionAudioExplain.checked) {
        generateBtnText.textContent = 'إنشاء شرح صوتي';
        podcastIcon.style.display = 'none';
        voiceOptionsContainer.style.display = 'flex';
    } else if (optionReadText.checked) {
        generateBtnText.textContent = 'قراءة النص بصوت';
        podcastIcon.style.display = 'none';
        voiceOptionsContainer.style.display = 'flex';
    }
}

// (9) دوال الرصيد (Balance)
// ------------------------------------

// (تحديث واجهة الرصيد)
function updateBalanceUI(balance, isVip = false) {
     if (isVip) {
        balanceDisplay.innerHTML = `🌟 <span class="font-bold">VIP</span> (رصيد غير محدود)`;
        balanceDisplay.classList.remove('bg-gray-700');
        balanceDisplay.classList.add('bg-purple-600', 'text-white');
    } else {
        const minutes = Math.floor(balance);
        const seconds = Math.floor((balance - minutes) * 60);
        balanceDisplay.textContent = `الرصيد: ${minutes} دقيقة و ${seconds} ثانية`;
        balanceDisplay.classList.remove('bg-purple-600', 'text-white');
        balanceDisplay.classList.add('bg-gray-700');
    }
}

// (التحقق من الرصيد اليومي وتجديده)
async function checkAndResetDailyBalance(uid, lastResetDate) {
    const now = new Date();
    let needsReset = false;

    if (!lastResetDate || !(lastResetDate instanceof Date)) {
        // (إذا كانت البيانات غير صحيحة، أعطيه رصيد)
        needsReset = true;
    } else {
        const lastReset = new Date(lastResetDate);
        lastReset.setHours(0, 0, 0, 0); // (بداية يوم آخر إعادة تعيين)

        const today = new Date(now);
        today.setHours(0, 0, 0, 0); // (بداية اليوم)
        
        if (today > lastReset) {
            needsReset = true; // (مر يوم على الأقل)
        }
    }

    if (needsReset) {
        try {
            const userDocRef = doc(db, "users", uid);
            await updateDoc(userDocRef, {
                balanceMinutes: DAILY_LIMIT_MINUTES,
                lastReset: serverTimestamp()
            });
            // (المستمع (onSnapshot) سيتولى تحديث الواجهة)
        } catch (e) {
            console.error("خطأ في إعادة تعيين الرصيد اليومي:", e);
        }
    } else {
         // (الرصيد محدث، فقط قم بتحديث الواجهة)
         updateBalanceUI(currentUser.balanceMinutes, currentUser.isVip);
    }
}

// (هل المستخدم يقدر ينشئ؟)
function canUserGenerate(durationSeconds) {
    if (currentUser.isVip) {
        return true; // (VIP لديه رصيد غير محدود)
    }
    const durationMinutes = durationSeconds / 60;
    return (currentUser.balanceMinutes || 0) >= durationMinutes;
}

// (خصم الرصيد)
async function deductFromBalance(uid, durationSeconds) {
    if (currentUser.isVip) {
        return; // (VIP لا يتم الخصم منه)
    }
    
    const durationMinutes = durationSeconds / 60;
    const newBalance = Math.max(0, (currentUser.balanceMinutes || 0) - durationMinutes);
    
    try {
        const userDocRef = doc(db, "users", uid);
        await updateDoc(userDocRef, {
            balanceMinutes: newBalance
        });
        // (المستمع سيتولى تحديث الواجهة)
    } catch (e) {
        console.error("خطأ في خصم الرصيد:", e);
        showError("حدث خطأ أثناء تحديث رصيدك.");
    }
}


// (10) دوال ربط الأحداث (Event Listeners)
// ------------------------------------

// (أحداث المصادقة)
tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('tab-active');
    tabRegister.classList.remove('tab-active');
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
});
tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('tab-active');
    tabLogin.classList.remove('tab-active');
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
});
closeErrorBtn.addEventListener('click', hideError);
closeVipModalBtn.addEventListener('click', () => {
    vipWelcomeModal.style.display = 'none';
});

// (أحداث التطبيق)
[optionPodcast, optionExplain, optionAudioExplain, optionReadText].forEach(option => {
     option.addEventListener('change', updateGenerateButtonUI);
});

// (أحداث الأدمن)
// (تم نقل أزرار الفتح والإغلاق إلى initAdmin)
closeAdminPanelBtn.addEventListener('click', () => hideAdminPanel(false));
adminIncognitoBtn.addEventListener('click', () => hideAdminPanel(true));


// (11) معالجات الإرسال (Form Handlers)
// ------------------------------------

// (معالج تسجيل الدخول)
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    showLoader(true);
    const result = await handleLogin(email, password);
    if (!result.success) {
        showError(result.error);
        showLoader(false);
    }
    // (onAuthStateChanged سيتولى الباقي)
});

// (معالج التسجيل)
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = registerEmailInput.value;
    const password = registerPasswordInput.value;
    const username = registerUsernameInput.value;
    
    if (password.length < 6) {
         showError("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
         return;
    }
    if (!username.trim()) {
         showError("الرجاء إدخال اسمك.");
         return;
    }

    showLoader(true);
    const result = await handleRegister(email, password, username);
    if (!result.success) {
        showError(result.error);
        showLoader(false);
    }
    // (onAuthStateChanged سيتولى الباقي)
});

// (معالج تسجيل الخروج)
logoutBtn.addEventListener('click', async () => {
    const result = await handleLogout();
    if (!result.success) {
        showError(result.error);
    }
    // (onAuthStateChanged سيتولى الباقي)
});

// (معالج إرسال الملاحظات)
sendFeedbackBtn.addEventListener('click', async () => {
    // (الكود ده كان ناقص من الكود الأصلي، تم إضافته)
    const feedback = feedbackTextarea.value.trim();
    if (!feedback) {
        showError("الرجاء كتابة ملاحظتك أولاً.");
        return;
    }
    if (!currentUser) {
        showError("يجب تسجيل الدخول لإرسال ملاحظة.");
        return;
    }
    
    sendFeedbackBtn.disabled = true;
    sendFeedbackBtn.textContent = "جاري الإرسال...";
    
    try {
        await addDoc(collection(db, "feedback"), {
            userId: currentUser.uid,
            username: currentUser.displayName || "مستخدم غير معروف",
            email: currentUser.email,
            text: feedback,
            createdAt: serverTimestamp()
        });
        
        feedbackTextarea.value = "";
        feedbackSuccessMsg.style.display = 'block';
        setTimeout(() => { feedbackSuccessMsg.style.display = 'none'; }, 3000);

    } catch (e) {
        console.error("خطأ في إرسال الملاحظة:", e);
        showError("حدث خطأ أثناء إرسال الملاحظة.");
    } finally {
        sendFeedbackBtn.disabled = false;
        sendFeedbackBtn.textContent = "إرسال الملاحظة";
    }
});

// (معالج "الإنشاء" الرئيسي)
generateBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const text = textInput.value.trim();
    const option = document.querySelector('input[name="processing-option"]:checked').value;
    
    if (!text) {
        showError("الرجاء إدخال نص أولاً.");
        return;
    }
    if (!currentUser) {
         showError("يجب تسجيل الدخول أولاً.");
         return;
    }
    
    // (التحقق من الرصيد - 10 ثواني كحد أدنى)
    if (!canUserGenerate(10)) {
         showError("رصيدك الحالي (أقل من 10 ثواني) لا يسمح بإنشاء محتوى. يتم تجديد الرصيد يومياً.");
         return;
    }

    generateBtn.disabled = true;
    statusContainer.style.display = 'block';
    errorContainer.style.display = 'none';
    scriptContainer.style.display = 'none';
    audioContainer.style.display = 'none';
    
    let audioResult = null;

    try {
        // --- (1) خيار الشرح النصي ---
        if (option === 'explain') {
            statusContainer.textContent = "جاري إنشاء الشرح النصي...";
            const script = await generateTextOnly(text);
            scriptTitle.textContent = "الإجابة:";
            scriptOutput.textContent = script;
            scriptContainer.style.display = 'block';
            statusContainer.style.display = 'none';

        // --- (2) خيار قراءة النص (مباشر) ---
        } else if (option === 'read_text') {
            statusContainer.textContent = "جاري تحويل النص إلى صوت...";
            const voice = optionVoiceMale.checked ? MALE_VOICE : FEMALE_VOICE;
            audioResult = await generateAudioOnly(text, voice);
            
            scriptTitle.textContent = "النص المقروء:";
            scriptOutput.textContent = text;
            scriptContainer.style.display = 'block';

        // --- (3) خيار الشرح الصوتي (فردي) ---
        } else if (option === 'audio-explain') {
            statusContainer.textContent = "الخطوة 1 من 2: جاري إنشاء نص الشرح...";
            const script = await generateTextOnly(text);
            scriptTitle.textContent = "نص الشرح:";
            scriptOutput.textContent = script;
            scriptContainer.style.display = 'block';

            statusContainer.textContent = "الخطوة 2 من 2: جاري تحويل الشرح إلى صوت...";
            const voice = optionVoiceMale.checked ? MALE_VOICE : FEMALE_VOICE;
            audioResult = await generateAudioOnly(script, voice);

        // --- (4) خيار البودكاست (حواري) ---
        } else if (option === 'podcast') {
            statusContainer.textContent = "الخطوة 1 من 2: جاري كتابة سكريبت البودكاست...";
            const script = await generatePodcastScript(text);
            scriptTitle.textContent = "سكريبت البودكاست:";
            scriptOutput.textContent = script;
            scriptContainer.style.display = 'block';

            statusContainer.textContent = "الخطوة 2 من 2: جاري إنتاج أصوات البودكاست...";
            audioResult = await generatePodcastAudio(script);
        }
        
        // (إذا كان هناك ملف صوتي ناتج)
        if (audioResult) {
            const audioUrl = URL.createObjectURL(audioResult.audioBlob);
            audioPlayer.src = audioUrl;
            audioContainer.style.display = 'block';
            statusContainer.style.display = 'none';
            
            // (خصم الرصيد)
            await deductFromBalance(currentUser.uid, audioResult.duration);
        }

    } catch (e) {
        console.error("خطأ في عملية الإنشاء:", e);
        showError(`حدث خطأ: ${e.message}`);
        statusContainer.style.display = 'none';
        errorContainer.style.display = 'block';
        errorContainer.textContent = `فشل: ${e.message}`;
    } finally {
        generateBtn.disabled = false;
    }
});


// (12) دوال تشغيل التطبيق (App Lifecycle)
// ------------------------------------

/**
 * دالة "عند تسجيل الدخول"
 * (يتم استدعاؤها من auth.js)
 */
function onUserLoggedIn(userProfile) {
    currentUser = userProfile; // (تخزين بيانات المستخدم)
    
    // (تخزين علامة الجلسة لإظهار رسالة الـ VIP)
    localStorage.setItem(ACTIVE_SESSION_KEY, 'true');
    
    // (تحديث الواجهة)
    userDisplayName.textContent = userProfile.displayName || userProfile.email;
    showAppUI();
    
    // (التعامل مع الـ VIP)
    const isNewSession = localStorage.getItem(ACTIVE_SESSION_KEY) === 'true';
    if (userProfile.isVip && isNewSession) {
        showVipWelcomePopup(userProfile.displayName);
        localStorage.removeItem(ACTIVE_SESSION_KEY); // (مسح العلامة)
    }

    // (التعامل مع الأدمن)
    if (userProfile.role === 'admin') {
        adminPanelBtn.style.display = 'block';
        setupAdminListeners(); // (تشغيل مستمعات الأدمن)
    } else {
        adminPanelBtn.style.display = 'none';
        hideAdminPanel(false); // (التأكد من إغلاق اللوحة إذا فقد الصلاحية)
    }

    // (إلغاء أي مستمع رصيد قديم)
    if (userBalanceUnsub) {
        userBalanceUnsub();
    }

    // (إعداد مستمع الرصيد (لايف))
    const userDocRef = doc(db, "users", userProfile.uid);
    userBalanceUnsub = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            // (تحديث الرصيد في الكائن المخزن)
            currentUser.balanceMinutes = data.balanceMinutes || 0;
            currentUser.lastReset = data.lastReset?.toDate();
            
            // (التحقق من إعادة تعيين الرصيد اليومي)
            checkAndResetDailyBalance(userProfile.uid, currentUser.lastReset);
        }
    }, (error) => {
        console.error("خطأ في مستمع الرصيد:", error);
        showError("خطأ في الاتصال لتحديث رصيدك.");
    });
}

/**
 * دالة "عند تسجيل الخروج"
 * (يتم استدعاؤها من auth.js)
 */
function onUserLoggedOut() {
    currentUser = null;
    
    // (مسح علامة الجلسة)
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    
    // (إيقاف كل المستمعين)
    if (userBalanceUnsub) {
        userBalanceUnsub();
        userBalanceUnsub = null;
    }
    clearAdminListeners();
    
    // (إظهار واجهة الدخول)
    showAuthUI();
}


// (13) --- نقطة البداية ---
// ------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    showLoader(true); // (إظهار اللودر عند بدء التشغيل)
    
    // (1. تهيئة مفتاح جيميناي - حالياً فاضي)
    initApi(); 
    
    // (2. تهيئة عناصر واجهة الأدمن)
    initAdmin({
        adminPanelContainer, appContainer, adminPanelBtn, returnToUserViewBtn,
        adminUserCount, adminFeedbackList, adminUserListTable
    });

    // (3. تحديث واجهة زرار الإنشاء أول مرة)
    updateGenerateButtonUI(); 
    
    // (4. بدء مراقبة حالة الدخول)
    // (هي دي الدالة اللي بتشغل كل حاجة)
    setupAuthObserver(onUserLoggedIn, onUserLoggedOut);
});
