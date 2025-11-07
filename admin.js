// -----------------
//  admin.js
// -----------------
//  ده ملف "غرفة التحكم".
//  مسئول عن لوحة الأدمن، جلب المستخدمين، والملاحظات.
//  *** (تم إصلاح خطأ الأزرار هنا) ***

// (1) استيراد الأدوات اللي محتاجينها
// (هنجيب "قاعدة البيانات" علشان نقرأ منها)
import {
    getFirestore,
    doc,
    setDoc,
    collection,
    query,
    onSnapshot,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// (هنجيب "الإعدادات" اللي عملناها)
import { db, auth } from './firebase.js';

// (2) متغيرات داخلية (للتخزين المؤقت)
// ------------------------------------
let adminUsersList = []; // (لتخزين قائمة المستخدمين)
let adminRolesMap = new Map(); // (لتخزين صلاحيات المستخدمين)
let adminListeners = []; // (لتخزين المستمعين لإيقافهم عند الخروج)

// (3) عناصر الواجهة (UI Elements)
// ------------------------------------
// (هنحتاج "العقل" (main.js) يدينا العناصر دي، بس هنجهز الدوال من دلوقتي)
let adminPanelContainer, appContainer, adminPanelBtn, returnToUserViewBtn;
let adminUserCount, adminFeedbackList, adminUserListTable;

// (دالة "تهيئة" بيستدعيها العقل (main.js) علشان يدينا العناصر)
export function initAdmin(elements) {
    adminPanelContainer = elements.adminPanelContainer;
    appContainer = elements.appContainer;
    adminPanelBtn = elements.adminPanelBtn;
    returnToUserViewBtn = elements.returnToUserViewBtn;
    adminUserCount = elements.adminUserCount;
    adminFeedbackList = elements.adminFeedbackList;
    adminUserListTable = elements.adminUserListTable;
    // (ربط أزرار الفتح والإغلاق)
    adminPanelBtn.addEventListener('click', () => showAdminPanel());
    returnToUserViewBtn.addEventListener('click', () => showAdminPanel());
    // (أزرار الإغلاق والتخفي هيتم ربطها في main.js)
}

// (4) دوال التحكم في الواجهة (للتصدير)
// ------------------------------------

/**
 * دالة إظهار لوحة الأدمن
 */
export function showAdminPanel() {
    appContainer.style.display = 'none';
    adminPanelContainer.style.display = 'block';
    adminPanelBtn.style.display = 'none'; // (إخفاء زر "لوحة التحكم")
    returnToUserViewBtn.style.display = 'block'; // (إظهار زر "الرجوع")
}

/**
 * دالة إخفاء لوحة الأدمن
 */
export function hideAdminPanel(isIncognito = false) {
    adminPanelContainer.style.display = 'none';
    appContainer.style.display = 'block';
    
    if (isIncognito) {
        adminPanelBtn.style.display = 'none'; // (إخفاء زر "لوحة التحكم")
        returnToUserViewBtn.style.display = 'block'; // (إظهار زر "الرجوع لوضع الأدمن")
    } else {
        adminPanelBtn.style.display = 'block'; // (إظهار زر "لوحة التحكم")
        returnToUserViewBtn.style.display = 'none'; // (إخفاء زر "الرجوع")
    }
}

/**
 * دالة مسح مستمعين الأدمن (عند تسجيل الخروج)
 */
export function clearAdminListeners() {
    adminListeners.forEach(unsub => unsub());
    adminListeners = [];
}

/**
 * دالة إعداد مستمعات بيانات الأدمن (المستخدمين والملاحظات)
 */
export function setupAdminListeners() {
    // (مسح المستمعين القدامى لضمان عدم التكرار)
    clearAdminListeners();

    // 1. مستمع للملاحظات (feedback)
    try {
        const feedbackQuery = query(collection(db, "feedback"), orderBy("createdAt", "desc"), limit(50));
        const feedbackUnsub = onSnapshot(feedbackQuery, (querySnapshot) => {
            const feedbacks = [];
            querySnapshot.forEach((doc) => {
                feedbacks.push({ id: doc.id, ...doc.data() });
            });
            renderFeedbackList(feedbacks);
        }, (error) => console.error("خطأ في مستمع الملاحظات:", error));
        adminListeners.push(feedbackUnsub);
    } catch (e) {
        console.error("خطأ في جلب الملاحظات (قد يكون بسبب الفهرسة):", e.message);
        adminFeedbackList.innerHTML = `<p class="text-red-400 text-center">خطأ في جلب الملاحظات. ${e.message}</p>`;
    }


    // 2. مستمع للمستخدمين (users)
    try {
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const usersUnsub = onSnapshot(usersQuery, (querySnapshot) => {
            adminUsersList = [];
            querySnapshot.forEach((doc) => {
                adminUsersList.push({ id: doc.id, ...doc.data() });
            });
            adminUserCount.textContent = adminUsersList.length;
            renderUserList(); // (إعادة العرض بالبيانات الجديدة)
        }, (error) => console.error("خطأ في مستمع المستخدمين:", error));
        adminListeners.push(usersUnsub);
    } catch (e) {
         console.error("خطأ في جلب المستخدمين (قد يكون بسبب الفهرسة):", e.message);
         adminUserListTable.innerHTML = `<tr><td colspan="4" class="text-red-400 text-center">خطأ في جلب المستخدمين. ${e.message}</td></tr>`;
    }


    // 3. مستمع للصلاحيات (roles)
    const rolesQuery = query(collection(db, "roles"));
    const rolesUnsub = onSnapshot(rolesQuery, (querySnapshot) => {
        adminRolesMap.clear();
        querySnapshot.forEach((doc) => {
            adminRolesMap.set(doc.id, doc.data());
        });
        renderUserList(); // (إعادة العرض بالبيانات الجديدة)
    }, (error) => console.error("خطأ في مستمع الصلاحيات:", error));
    adminListeners.push(rolesUnsub);
}


// (5) دوال العرض (داخلية)
// ------------------------------------

// (عرض قائمة الملاحظات)
function renderFeedbackList(feedbacks) {
    if (!adminFeedbackList) return; // (للتأكد من أن العنصر جاهز)
    adminFeedbackList.innerHTML = "";
    if (feedbacks.length === 0) {
        adminFeedbackList.innerHTML = '<p class="text-gray-400 text-center">لا توجد ملاحظات حالياً.</p>';
        return;
    }
    
    feedbacks.forEach(fb => {
        const item = document.createElement('div');
        item.className = 'feedback-list-item';
        
        const text = document.createElement('p');
        text.textContent = fb.text;
        
        const meta = document.createElement('span');
        const date = fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleString('ar-EG') : '...';
        meta.textContent = `من: ${fb.username} (${fb.email}) - في: ${date}`;
        
        item.appendChild(text);
        item.appendChild(meta);
        adminFeedbackList.appendChild(item);
    });
}

// (عرض قائمة المستخدمين)
function renderUserList() {
    if (!adminUserListTable) return; // (للتأكد من أن العنصر جاهز)
    
    adminUserListTable.innerHTML = "";
    if (adminUsersList.length === 0) {
        adminUserListTable.innerHTML = '<tr><td colspan="4" class="text-center text-gray-400">لا يوجد مستخدمين.</td></tr>';
        return;
    }

    // (جلب اليوزر الحالي للتأكد من عدم تعديل نفسه)
    const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

    adminUsersList.forEach(user => {
        const roles = adminRolesMap.get(user.id) || { role: 'user', isVip: false };
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${user.displayName || 'بلا اسم'}</td>
            <td>${user.email}</td>
            <td>${getRoleBadges(roles)}</td>
            <td class="flex flex-col gap-2">${getActionButtons(user.id, roles, currentUserId)}</td>
        `;
        
        // (إضافة معالجات الأحداث للأزرار)
        tr.querySelector('.btn-promote-vip')?.addEventListener('click', (e) => updateUserRole(e.target.dataset.uid, { ...roles, isVip: true }));
        tr.querySelector('.btn-demote-vip')?.addEventListener('click', (e) => updateUserRole(e.target.dataset.uid, { ...roles, isVip: false }));
        tr.querySelector('.btn-promote-admin')?.addEventListener('click', (e) => updateUserRole(e.target.dataset.uid, { ...roles, role: 'admin' }));
        tr.querySelector('.btn-demote-admin')?.addEventListener('click', (e) => updateUserRole(e.target.dataset.uid, { ...roles, role: 'user' }));

        adminUserListTable.appendChild(tr);
    });
}

// (دالة جلب شارات المستخدمين)
function getRoleBadges(roles) {
    let badges = '';
    if (roles.role === 'admin') {
        badges += '<span class="role-badge role-badge-admin ml-1">أدمن</span>';
    }
    if (roles.isVip) {
        badges += '<span class="role-badge role-badge-vip ml-1">VIP</span>';
    }
    if (!badges) {
        badges = '<span class="role-badge role-badge-user">مستخدم</span>';
    }
    return badges;
}

// 
// (!!! 💡💡💡 --- تم الإصلاح --- 💡💡💡 !!!)
//
// (دالة جلب أزرار الإجراءات - تم إصلاح الخطأ هنا)
function getActionButtons(uid, roles, currentUserId) {
    // (لا يمكن للأدمن تعديل صلاحيات نفسه)
    if (uid === currentUserId) {
        return '<span class="text-xs text-gray-400">لا يمكن تعديل صلاحياتك</span>';
    }
    
    let buttons = '';
    
    // (تم الإصلاح: استخدام `...` (Backticks) بدلاً من '...' (Quotes))
    // (علشان المتغير ${uid} يشتغل صح)
    
    // (زر ترقية/إلغاء VIP)
    if (roles.isVip) {
        buttons += `<button class="action-btn btn-demote btn-demote-vip" data-uid="${uid}">إلغاء VIP</button>`;
    } else {
        buttons += `<button class="action-btn btn-promote btn-promote-vip" data-uid="${uid}">ترقية لـ VIP</button>`;
    }
    
    // (زر ترقية/إلغاء أدمن)
    if (roles.role === 'admin') {
        buttons += `<button class="action-btn btn-demote btn-demote-admin mt-2" data-uid="${uid}">إلغاء الأدمن</button>`;
    } else {
        buttons += `<button class="action-btn btn-promote btn-promote-admin mt-2" data-uid="${uid}">ترقية لـ أدمن</button>`;
    }
    
    return buttons;
}
// 
// (!!! 💡💡💡 --- نهاية الإصلاح --- 💡💡💡 !!!)
// 


/**
 * دالة تحديث صلاحيات المستخدم (لـ VIP أو Admin)
 */
async function updateUserRole(uid, newRoles) {
    if (!uid) {
        console.error("UID غير معرف، لا يمكن التحديث.");
        return;
    }
    
    // (للتأكيد مرة أخرى)
    if (uid === auth.currentUser.uid) {
        alert("لا يمكنك تعديل صلاحياتك الخاصة."); // (هنا سنستخدم alert لأنها لوحة الأدمن)
        return;
    }
    
    try {
        const roleDocRef = doc(db, "roles", uid);
        // (استخدام setDoc لضمان إنشاء المستند إذا لم يكن موجوداً)
        await setDoc(roleDocRef, {
            role: newRoles.role,
            isVip: newRoles.isVip
        }, { merge: true }); // (merge لضمان عدم مسح بيانات أخرى)
        
    } catch (e) {
        console.error("خطأ في تحديث الصلاحية:", e);
        alert("حدث خطأ أثناء تحديث صلاحية المستخدم.");
    }
    // (لا نحتاج loader هنا لأن onSnapshot هيعيد العرض أوتوماتيك)
                                    }
