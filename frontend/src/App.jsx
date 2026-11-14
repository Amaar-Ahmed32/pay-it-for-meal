// App.jsx — Chunky 3D dark-blue rebuild (2026-11-10).
// Approved look from the visuals board: deep navy page, cream cards,
// 3px ink borders, hard offset shadows, press-down pill buttons.
// Hero: "One meal forward, one plate filled today." + real serving photo.
// FULL translation: every UI string lives in T below (en / ur / sd) —
// no hard-coded English UI text outside these dictionaries (proper nouns
// and numbers excepted). Restaurant owners manage their own staff.
// Pages: Home, Finder, Donate, My Donations, Staff, Restaurant (owner),
// Admin, Leaderboard, Transparency, Join, Login. All data from the API.

import React, { useEffect, useState } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5001/api';
const PILOT_DONATION_GOAL = 50; // pilot target from the teacher plan — change this one number if the target changes
// Standard meals a restaurant can tick on the join / add-restaurant forms.
const MEAL_OPTIONS = ['Chicken Biryani', 'Beef Biryani', 'Daal', 'Chicken Karahi', 'Vegetable', 'Roti/Naan'];
// Areas a restaurant can pick on the join / add-restaurant forms, plus
// "Other" with a free-text box for anywhere not listed.
const AREAS = ['Bhittaibad', 'Sukkur', 'Karachi', 'Hyderabad', 'Larkana', 'Khairpur', 'Mirpurkhas', 'Nawabshah', 'Jacobabad', 'Shikarpur', 'Dadu'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (e) => typeof e === 'string' && EMAIL_RE.test(e.trim());
const validPhonePK = (p) => /^03\d{9}$/.test(String(p || '').replace(/[\s-]/g, ''));
// Opening times are two <input type="time"> values ("HH:MM"); end must be
// after start, same day. String compare works for 24-hour HH:MM times.
const validTimes = (a, b) => !!a && !!b && b > a;

// ---------- FULL TRANSLATION DICTIONARIES ----------
// {n} is replaced at render time with a number. Restaurant names, "Pay It
// Forward Meal" and "SDG 1 / SDG 2" stay in English inside translations.
const T = {
  en: {
    home: 'Home', finder: 'Find a free meal', donate: 'Donate', mine: 'My donations', staff: 'Staff', restaurant: 'Restaurant', admin: 'Admin', board: 'Leaderboard', transparency: 'Transparency', request: 'Join as restaurant', auth: 'Login / Sign Up',
    dashboard: 'Dashboard', login: 'Log in', logout: 'Logout', menu: 'Menu',
    eyebrow: '● Live in Pakistan · Test pilot',
    heroHead1: 'One meal forward,', heroHead2: 'one plate filled today.',
    heroLead: 'A diner pays for their own meal — and one extra. That extra meal waits at a verified partner restaurant for anyone who needs it. No explanation, no payment, no shame.',
    oldLine: 'A normal dinner becomes someone else’s dinner.',
    donateBtn: 'Donate a meal', findBtn: 'Find a free meal',
    needLine: 'Need a meal? No login, no questions, no form — just ask staff at a listed restaurant.',
    availLine: '{n} {m} available right now — find one near you, or donate to keep the shelf full.',
    mealOne: 'meal', mealMany: 'meals',
    noAvailLine: 'No meals available right now — be the first donor today.',
    servedChip: 'Your meal was served!', availChip: '{m} available today', 
    
    liveDash: 'Live dashboard', liveNote: 'Numbers come live from the database. Nothing is typed in by hand.',
    donated: 'Donated', served: 'Served', available: 'Available now', byRest: 'By restaurant', noRest: 'No partner restaurants with meals right now. Be the first donor!',
    goal: 'Pilot goal: {n} of {g} meals donated', goalPct: '{p}% of pilot goal', goalServed: '{n} served so far', goalReached: '🎉 Pilot goal reached!',
    howTitle: 'How it works',
    step1t: 'Donate', step1d: 'Choose a verified restaurant and pay for one or more extra meals.',
    step2t: 'Served', step2d: 'A person in need asks staff for a Pay It Forward meal. No questions, no payment.',
    step3t: 'You get a message', step3d: '“Your meal was served.” You see proof and never learn who received it.',
    trust1: '✓ Verified restaurants only', trust2: '✓ No recipient data stored', trust3: '✓ Money released only after serving',
    urgent: 'Urgent:', mealsLeft: '{n} {m} left', giveMost: '💛 Give where most needed', giveMostName: '💛 Give where most needed — {n}',
    partnerTitle: 'Run a restaurant?', partnerText: 'Join as a partner and serve free meals paid for by your own customers.', partnerBtn: 'Become a partner',
    activityTitle: 'Recent activity (recipients never named)', activityServed: '🍲 A meal was served', activityDonated: '💛 {n} donated {q}', activityAt: 'at {n}', activityNone: 'No activity yet — be the first donor.',
    finderTitle: 'Free meals today', finderNote: 'Free meals available here today. Just ask staff for a Pay It Forward meal.',
    finderArea: 'Area / city', finderOnly: 'Only show restaurants with meals available',
    finderUrgent: '⚠️ {n} left — urgent', finderMeals: '{n} {m}', finderPerMeal: 'Rs {n} per meal', finderServed: '{n} served so far',
    finderEmptyAvail: 'No restaurant with meals available in that area right now — try All areas, or check back after a donation.',
    finderEmptyArea: 'No verified restaurant in that area yet.', finderNoLogin: 'No login. No form. We never ask for or store anything about you.',
    allAreas: 'All areas',
    donateTitle: 'Donate a meal', donateLoginFirst: 'Please log in as a donor first — public sign-up creates a donor account.',
    donateMost: '💛 Give where most needed', donateMostName: '💛 Give where most needed — {n} ({m} left)',
    donateRest: '1. Restaurant', donateChoose: 'Choose a verified restaurant…', donateVerified: 'verified',
    donateQty: '2. Number of meals', donateCustom: '(1–10, custom allowed)',
    donateMethod: '3. Pay with', methodWallet: 'Mobile wallet', methodCard: 'Debit / Credit',
    summary: 'Summary', summaryMeals: 'Meals:', summaryMethod: 'Method:', summaryPrice: 'Price:', summaryPerMeal: 'per meal at {n} — admin sets each restaurant’s price',
    summaryChoose: 'Choose a restaurant first to see its meal price. Each restaurant has its own price, set by admin.',
    testMode: 'Test mode: no real money moves in the pilot.', continueBtn: 'Continue to Sandbox Checkout',
    statusNote: 'Status: Pending → Paid (sandbox) → Available → Served. Meals are NOT Available while Pending.',
    sandboxTitle: 'Sandbox Checkout — {n} (SIMULATOR, not the real gateway site)',
    sandboxPay: 'Pay Rs {n} for {q} {m}', sandboxTxn: 'Txn ref:', sandboxNote: 'This is our own sandbox simulator for the contest demo. No real money moves. Real JazzCash/Easypaisa gateway needs merchant sandbox keys in backend/.env.',
    sandboxMobile: 'Test mobile number (any test number, e.g. 0300-1234567)', sandboxPayBtn: 'Pay Rs {n} in Sandbox', sandboxCancel: 'Cancel payment',
    pendingMsg: 'Sandbox payment created — it is PENDING. Meals become Available only after you confirm on the Sandbox Checkout below.',
    paidMsg: 'Sandbox payment successful! {n} PKR paid in sandbox (no real money). Meals are now Available.',
    cancelMsg: 'Sandbox payment cancelled. No meals were created.',
    mineTitle: 'My donations', mineLogin: 'Log in to see your donations and messages.',
    mineDonated: 'Donated', mineServed: 'Served', mineAvail: 'Still available', yourBadge: 'Your badge:',
    privacy: 'Show my name on Leaderboard and Transparency (untick = Anonymous donor)',
    donationsTitle: 'Donations', mealsAt: '{q} {m} at {n}', servedOf: '{s}/{q} served', noDonations: 'No donations yet.',
    printReceipt: 'Print receipt', messagesTitle: 'Messages', noMessages: 'No messages yet — you’ll get one here when your meal is served.',
    markRead: 'Mark read', readMark: '✓ read', popups: 'Please allow pop-ups for this site to print the receipt.',
    signedIn: 'Signed in as {n} ({r})',
    staffTitle: 'Staff', staffNoRest: 'no restaurant linked yet', staffLogin: 'Staff accounts are created by admin and linked to ONE restaurant. Log in as staff (or admin to test).',
    staffAvail: 'Available meals today', serveBtn: 'Serve 1 meal', servedTotal: 'Served in total', restLabel: 'Restaurant',
    serveNote: 'Tap Serve, no questions. Only a count and the time are recorded, nothing about the person.',
    servedMsg: 'Served! Available now: {a}, served total: {s}. Donor (if any) got a message.',
    restTitle: 'Restaurant — my team', restLogin: 'Log in as a restaurant owner to manage your team. Owners are created by admin and linked to ONE restaurant.',
    teamTitle: 'Your team', teamMembers: '{n} team members', teamNone: 'No staff yet — add your first team member below.',
    addStaffTitle: 'Add a staff member', addStaffNote: 'They get a sign-in with their email and password — no password to remember for you.',
    fullName: 'Full name', phoneEmail: 'Email', password: 'Password', roleLabel: 'Role', addBtn: 'Add to team', removeBtn: 'Remove',
    roleOwner: 'Owner', roleManager: 'Manager', roleCounter: 'Counter', roleKitchen: 'Kitchen', active: 'Active',
    permTitle: 'What each role can do',
    permOwner: 'Owner — everything, including staff and payouts',
    permManager: 'Manager — mark meals served, see daily totals',
    permCounter: 'Counter — mark meals served only',
    permKitchen: 'Kitchen — see how many meals to prepare',
    staffAdded: 'Staff member added.', staffRemoved: 'Staff member removed.', staffAddFail: 'Could not add staff member.',
    adminTitle: 'Admin dashboard', adminLogin: 'Admin only. Log in as admin@payitforward.school (seeded account, change the password before real use).',
    adminLoading: 'Loading admin data… if this stays blank, read the message above — it is the backend error.',
    dailyTitle: 'Daily check', dailyText: 'Donated − served = available', matches: 'matches', mismatch: 'MISMATCH — check!',
    overviewLine: '{u} users • {d} donations • {p} pending requests',
    verifyTitle: 'Verify restaurants', noUnverified: 'No unverified restaurants. All {n} are verified.', verifyBtn: 'Verify',
    reqTitle: 'Restaurant requests', noReq: 'No requests yet.', approveBtn: 'Approve', rejectBtn: 'Reject',
    weeklyTitle: 'Weekly report (last 7 days)', weeklyChart: 'Donated vs served per restaurant (last 7 days)', weeklyNote: 'Paid donations and serves in the last 7 days, per restaurant. No recipient data — counts only.',
    loadReport: 'Load weekly report', downloadCsv: 'Download CSV',
    weeklyRow: '{n} — {d} donated, {s} served (last 7 days) • {a} available now • {t} served total',
    weeklyTotal: 'Total: {d} donated, {s} served (last 7 days) • {a} available now',
    gTitle: 'Graphs — meals at a glance', gNote: 'Admin only. Counts only — no recipient data.', gDaily: 'Last 7 days — donated vs served', gAvail: 'Available meals per restaurant', gDonated: 'Donated', gServed: 'Served', gServedPct: 'Served %', 
    pricesTitle: 'Restaurant prices (per restaurant)', pricePerMeal: 'Rs {n}/meal', unverified: '(unverified)',
    chooseRest: 'Choose restaurant…', newPrice: 'New meal price (Rs 50–2000)', savePrice: 'Save price', priceSaved: 'Meal price updated.',
    createStaffTitle: 'Create staff / admin account', roleRestLabel: 'Role + linked restaurant (staff must have one)',
    createStaffBtn: 'Create staff account', staffCreated: 'Staff account created.', 
    addRestTitle: 'Add a restaurant', restName: 'Name', restArea: 'Area', mealPrice: 'Meal price (Rs)',
    addRestBtn: 'Add restaurant (unverified)', restAdded: 'Restaurant added (unverified until you Verify it).',
    boardDonors: 'Top donors (by meals served)', boardRest: 'Top restaurants', noDonors: 'No donors yet.',
    boardDonated: '{d} donated, {s} served',
    transTitle: 'Transparency — every paid meal, in public',
    transNote: 'Graphs from real donation and serve records. No recipient is ever named, photographed, or described. Donors appear by name on the Leaderboard only if they chose to — otherwise ‘Anonymous donor’.',
    transGraphTitle: 'Meals by month — donated vs served',
    transGraphNote: 'Last 6 months, from real donation and serve records. Counts only — no recipient is ever named.',
    transAvailTitle: 'Available meals per restaurant',
    transTotals: '{d} donated • {s} served • {a} available now',
    photoLabel: 'Photo of staff member (required)',
    photoHint: 'JPG or PNG, max 500KB. The photo shows in the team list.',
    photoRequired: 'A photo of the staff member is required.',
    photoTooLarge: 'Photo is too large — max 500KB.',
    photoType: 'Photo must be a JPG or PNG image.',
    photoChoose: 'Choose photo',
    mealOptions: 'Which meals do you serve?', mealOther: 'Other meal (type the name)', mealPriceEach: 'Price per meal (Rs)',
    emailLabel: 'Email', phoneLabel: 'Phone (03XX-XXXXXXX)',
    invalidEmail: 'Please enter a valid email address (e.g. name@example.com)',
    invalidPhone: 'Please enter a valid Pakistani mobile number (e.g. 0300-1234567)',
    startTime: 'Start time', endTime: 'End time',
    ownerPassLabel: 'Password for your restaurant dashboard', ownerPassNote: 'You will log in with your email and this password after approval.',
    passTooShort: 'Password must be at least 8 characters',
    invalidTimes: 'Please pick a start time and an end time — the end time must be after the start time',
    ownerCreated: 'Owner account created — the owner can now log in with {e}',
    ownerTempPass: 'Temporary owner password — please share it with the owner: {p}',
    ownerExists: 'An account with that email already exists — no new owner account was created',
    menuTitle: 'Menu', menuNone: 'No menu yet — add your first meal below.',
    mealName: 'Meal name', mealPrice: 'Price (Rs)', addMealBtn: 'Add meal',
    mealAdded: 'Meal added.', mealUpdated: 'Meal updated.', mealDeleted: 'Meal deleted.',
    mealDeleteConfirm: 'Delete this meal from the menu?', saveBtn: 'Save',
    reqMealTitle: 'Request a meal',
    reqMealNote: 'No login, no name, no phone — just pick a restaurant and how many meals you need. The restaurant sees only the number and the time.',
    reqRest: 'Restaurant', reqQty: 'How many meals? (1–3)', reqNote: 'Note (optional)', reqSend: 'Send request',
    reqSent: 'Request sent to the restaurant. Show this line at the counter: ',
    reqSentLine: 'Requested {n} {m} • {t}',
    reqPending: 'Pending requests', reqNone: 'No meal requests right now.', refreshBtn: 'Refresh', updatedAt: 'Updated {t}',
    reqFulfil: 'Serve 1 meal', reqCancel: 'Cancel',
    reqFulfilled: 'Request fulfilled — 1 meal served.', reqCancelled: 'Request cancelled.',
    reqExpired: 'Expired', reqStatus: 'Status', reqTime: 'Requested at',
    receiptServeTitle: '💛 Pay It Forward Meal — Serve receipt',
    receiptMeal: 'Meal:', receiptQty: 'Quantity:', receiptPrice: 'Price per meal:', receiptTotal: 'Total:',
    receiptServedBy: 'Served by:', receiptServedToday: 'Meals served today here:', receiptAvailLeft: 'Meals available left:',
    printSlip: 'Print slip', receiptsTitle: 'Served receipts', receiptsNone: 'No served receipts yet.',
    detailMenu: 'Menu', detailStaff: 'Staff', detailClose: 'Close',
    claimNote: 'To claim a meal, just ask staff at the restaurant — no login, no form.',
    lowStock: '⚠️ Only {n} {m} left — ask for donations!',
    lowStockBadge: 'Low stock — {n} left', closedToday: 'Closed today', openNow: 'Open now',
    toggleClose: 'Mark closed for today', toggleOpen: 'Mark open for today',
    closedMsg: 'This restaurant is closed today — please donate to another restaurant or try tomorrow.',
    closedServe: 'This restaurant is closed today — serving is paused until it reopens.',
    closedReq: 'This restaurant is closed today — please request a meal at another restaurant or try tomorrow.',
    delRestBtn: 'Delete restaurant',
    delRestConfirm: 'Delete this restaurant? Its menu, meal requests, receipts and staff accounts will be deleted too.',
    restDeleted: 'Restaurant deleted.', delUserBtn: 'Delete',
    delUserConfirm: 'Delete this user account?', userDeleted: 'User deleted.', delMealBtn: 'Delete',
    adminMealsTitle: 'All menus (delete a meal)', adminReceiptsTitle: 'Recent serve receipts',
    adminReqsTitle: 'Meal requests (all restaurants)',
    serveMealLabel: 'Which meal was served?', serveReceiptMsg: 'Served! Receipt saved.',
    staffPhoneLabel: 'Phone (counter number)',
    staffPhoneNote: 'Use the restaurant\u2019s counter number \u2014 this shows publicly on the Finder.',
    staffPhoneNone: 'No counter number listed',
    staffProfile: 'Staff profile',
    profileRest: 'Restaurant:',
    profileRole: 'Role:',
    profilePhone: 'Phone:',
    profileEmail: 'Email:',
    profileStatus: 'Status:',
    slipTitle: 'Your request slip',
    slipShow: 'Show this slip at the counter',
    slipCode: 'Request code:',
    slipMeals: 'Meals requested:',
    reqCodeLabel: 'Code:',
    reqSentShort: 'Request sent! Your slip is below \u2014 show it at the counter.',
    hopeLine1: 'Only 1 meal left \u2014 someone nearby is hoping for a plate today.',
    hopeLine2: 'Only 2 meals left \u2014 your kindness can fill the next plate.',
    boardChartDonors: 'Top donors \u2014 meals served',
    boardChartRest: 'Top restaurants \u2014 meals served',
    boardSummary: 'Donated vs served',
    roleOther: 'Other (custom role)',
    roleCustom: 'Custom role',
    roleCustomPh: 'e.g. Cashier',
    invalidRole: 'Please pick a role or type a custom role',
    areaOther: 'Other (type your area)',
    areaChoose: 'Choose an area\u2026',
    areaCustom: 'Your area',
    invalidArea: 'Please pick an area or type your own',
    restPhotoLabel: 'Restaurant photo (optional)',
    restPhotoHint: 'JPG or PNG, max 500KB. Shows on the Finder card and the restaurant profile.',
    mapBtn: 'Find on map',
    photoSoon: 'Photo coming soon',
    
    anon: 'Anonymous donor',
    joinTitle: 'Join as a restaurant', joinNote: 'Your request starts UNVERIFIED and hidden from the public Finder until admin approves it. Checklist: name, area, the meals you serve and your opening times, and you agree to serve without questions.',
    sendBtn: 'Send request', joinSent: 'Request sent! Admin will review it. It will NOT show publicly until approved.',
    authTitle: 'Login / Sign Up', authNote: 'Public sign-up creates a donor account. Staff and admin accounts are created by an admin.',
    authName: 'Full name', authEmail: 'Email', authPass: 'Password (min 6 characters, stored hashed)',
    createAccount: 'Create donor account', loginBtn: 'Login', toLogin: 'Already have an account? Login', toRegister: 'New here? Create an account',
    seedNote: 'School admin (seeded, change before real use): admin@payitforward.school / Admin123!',
    ownerSeedNote: 'Demo restaurant owner: owner@payitforward.school / Owner123! (Sindh Biryani House)',
    welcome: 'Welcome, {n} ({r}).', backendErr: 'Backend not running? Start it: cd backend && npm start  •  {e}',
    footerExplore: 'Explore', footerLang: 'Languages', footerCopy: '© 2026 Pay It Forward Meal • Supports SDG 1 (No Poverty) and SDG 2 (Zero Hunger). No recipient data is ever stored.',
    badgeHero: '🏆 Meal Hero (10+ served)', badgeHeart: '💛 Kind Heart (5+ served)', badgeNew: '🌱 New Giver (1+ served)', badgeNone: '— no badge yet, donate first',
    receiptTitle: '💛 Pay It Forward Meal — Donation receipt', receiptDonor: 'Donor:', receiptRest: 'Restaurant:', receiptMeals: 'Meals donated:', receiptServed: 'Served so far from this donation:', receiptAmount: 'Amount:', receiptMethod: 'Method:', receiptStatus: 'Status:', receiptTxn: 'Txn ref:', receiptDate: 'Date:',
    receiptNote: 'Thank you — your meal will be served with no questions asked, and no recipient data is ever stored. Payment: test/sandbox mode in the pilot — no real money moves.',
  },
  ur: {
    home: 'ہوم', finder: 'مفت کھانا تلاش کریں', donate: 'عطیہ دیں', mine: 'میرے عطیات', staff: 'اسٹاف', restaurant: 'ریسٹورنٹ', admin: 'ایڈمن', board: 'لیڈر بورڈ', transparency: 'شفافیت', request: 'ریسٹورنٹ بنیں', auth: 'لاگ ان / سائن اپ',
    dashboard: 'ڈیش بورڈ', login: 'لاگ ان', logout: 'لاگ آؤٹ', menu: 'مینیو',
    eyebrow: '● پاکستان میں لائیو · آزمائشی منصوبہ',
    heroHead1: 'ایک کھانا آگے،', heroHead2: 'آج ایک پلیٹ بھر گئی۔',
    heroLead: 'کھانے والا اپنے کھانے کے ساتھ ایک اضافی کھانا ادا کرتا ہے۔ وہ اضافی کھانا کسی ضرورت مند کے لیے تصدیق شدہ پارٹنر ریسٹورنٹ میں انتظار کرتا ہے۔ کوئی وضاحت نہیں، کوئی ادائیگی نہیں، کوئی شرم نہیں۔',
    oldLine: 'ایک عام رات کا کھانا کسی اور کا رات کا کھانا بن جاتا ہے۔',
    donateBtn: 'کھانا عطیہ کریں', findBtn: 'مفت کھانا تلاش کریں',
    needLine: 'کھانا چاہیے؟ کوئی لاگ ان نہیں، کوئی سوال نہیں، کوئی فارم نہیں — بس درج ریسٹورنٹ کے عملے سے پوچھیں۔',
    availLine: 'ابھی {n} {m} دستیاب ہیں — اپنے قریب تلاش کریں، یا عطیہ دے کر شیلف بھرا رکھیں۔',
    mealOne: 'کھانا', mealMany: 'کھانے',
    noAvailLine: 'ابھی کوئی کھانا دستیاب نہیں — آج پہلے عطیہ دہندہ بنیں۔',
    servedChip: 'آپ کا کھانا پیش کر دیا گیا!', availChip: 'آج {m} دستیاب ہیں', 
    
    liveDash: 'لائیو ڈیش بورڈ', liveNote: 'اعداد ڈیٹا بیس سے براہ راست آتے ہیں۔ کچھ بھی ہاتھ سے نہیں لکھا جاتا۔',
    donated: 'عطیہ شدہ', served: 'پیش شدہ', available: 'ابھی دستیاب', byRest: 'ریسٹورنٹ کے حساب سے', noRest: 'ابھی کسی پارٹنر ریسٹورنٹ میں کھانا نہیں ہے۔ پہلے عطیہ دہندہ بنیں!',
    goal: 'پائلٹ ہدف: {g} میں سے {n} کھانے عطیہ ہوئے', goalPct: 'ہدف کا {p}٪', goalServed: 'اب تک {n} پیش ہوئے', goalReached: '🎉 پائلٹ ہدف مکمل!',
    howTitle: 'یہ کیسے کام کرتا ہے',
    step1t: 'عطیہ دیں', step1d: 'تصدیق شدہ ریسٹورنٹ منتخب کریں اور ایک یا زیادہ اضافی کھانوں کی ادائیگی کریں۔',
    step2t: 'پیش کیا گیا', step2d: 'ضرورت مند شخص عملے سے Pay It Forward کھانا مانگتا ہے۔ کوئی سوال نہیں، کوئی ادائیگی نہیں۔',
    step3t: 'آپ کو پیغام ملتا ہے', step3d: '”آپ کا کھانا پیش کر دیا گیا۔“ آپ کو ثبوت ملتا ہے اور آپ کبھی نہیں جانتے کہ کس نے وصول کیا۔',
    trust1: '✓ صرف تصدیق شدہ ریسٹورنٹ', trust2: '✓ وصول کنندہ کا کوئی ڈیٹا محفوظ نہیں', trust3: '✓ رقم صرف پیش کرنے کے بعد ملتی ہے',
    urgent: 'فوری:', mealsLeft: '{n} {m} باقی', giveMost: '💛 جہاں سب سے زیادہ ضرورت ہے وہاں دیں', giveMostName: '💛 جہاں سب سے زیادہ ضرورت ہے — {n}',
    partnerTitle: 'ریسٹورنٹ چلاتے ہیں؟', partnerText: 'پارٹنر بنیں اور اپنے صارفین کے پیسوں سے مفت کھانے پیش کریں۔', partnerBtn: 'پارٹنر بنیں',
    activityTitle: 'تازہ سرگرمی (وصول کنندہ کا نام کبھی نہیں)', activityServed: '🍲 ایک کھانا پیش کیا گیا', activityDonated: '💛 {n} نے {q} عطیہ کیے', activityAt: '{n} میں', activityNone: 'ابھی کوئی سرگرمی نہیں — پہلے عطیہ دہندہ بنیں۔',
    finderTitle: 'آج کے مفت کھانے', finderNote: 'آج یہاں مفت کھانے دستیاب ہیں۔ بس عملے سے Pay It Forward کھانا مانگیں۔',
    finderArea: 'علاقہ / شہر', finderOnly: 'صرف وہ ریسٹورنٹ دکھائیں جن میں کھانا دستیاب ہے',
    finderUrgent: '⚠️ {n} باقی — فوری', finderMeals: '{n} {m}', finderPerMeal: 'فی کھانا {n} روپے', finderServed: 'اب تک {n} پیش ہوئے',
    finderEmptyAvail: 'اس علاقے میں ابھی کوئی ریسٹورنٹ میں کھانا دستیاب نہیں — تمام علاقے آزمائیں، یا عطیے کے بعد دوبارہ دیکھیں۔',
    finderEmptyArea: 'اس علاقے میں ابھی کوئی تصدیق شدہ ریسٹورنٹ نہیں۔', finderNoLogin: 'کوئی لاگ ان نہیں۔ کوئی فارم نہیں۔ ہم آپ کے بارے میں کچھ نہیں پوچھتے اور نہ محفوظ کرتے ہیں۔',
    allAreas: 'تمام علاقے',
    donateTitle: 'کھانا عطیہ کریں', donateLoginFirst: 'پہلے عطیہ دہندہ کے طور پر لاگ ان کریں — عوامی سائن اپ سے عطیہ دہندہ کا اکاؤنٹ بنتا ہے۔',
    donateMost: '💛 جہاں سب سے زیادہ ضرورت ہے وہاں دیں', donateMostName: '💛 جہاں سب سے زیادہ ضرورت ہے — {n} ({m} باقی)',
    donateRest: '1۔ ریسٹورنٹ', donateChoose: 'تصدیق شدہ ریسٹورنٹ منتخب کریں…', donateVerified: 'تصدیق شدہ',
    donateQty: '2۔ کھانوں کی تعداد', donateCustom: '(1–10، اپنی مرضی بھی)',
    donateMethod: '3۔ ادائیگی کا طریقہ', methodWallet: 'موبائل والیٹ', methodCard: 'ڈیبٹ / کریڈٹ',
    summary: 'خلاصہ', summaryMeals: 'کھانے:', summaryMethod: 'طریقہ:', summaryPrice: 'قیمت:', summaryPerMeal: 'فی کھانا {n} میں — ہر ریسٹورنٹ کی قیمت ایڈمن طے کرتا ہے',
    summaryChoose: 'کھانے کی قیمت دیکھنے کے لیے پہلے ریسٹورنٹ منتخب کریں۔ ہر ریسٹورنٹ کی اپنی قیمت ہے، جو ایڈمن طے کرتا ہے۔',
    testMode: 'ٹیسٹ موڈ: پائلٹ میں کوئی اصلی رقم نہیں چلتی۔', continueBtn: 'سینڈ باکس چیک آؤٹ پر جائیں',
    statusNote: 'حالت: زیر التواء → ادا شدہ (سینڈ باکس) → دستیاب → پیش شدہ۔ زیر التواء کھانے دستیاب نہیں ہوتے۔',
    sandboxTitle: 'سینڈ باکس چیک آؤٹ — {n} (سیمولیٹر، اصلی گیٹ وے سائٹ نہیں)',
    sandboxPay: '{q} {m} — {n} روپے ادا کریں', sandboxTxn: 'لین دین نمبر:', sandboxNote: 'یہ مقابلے کے ڈیمو کے لیے ہمارا اپنا سینڈ باکس سیمولیٹر ہے۔ کوئی اصلی رقم نہیں چلتی۔ اصلی JazzCash/Easypaisa گیٹ وے کے لیے backend/.env میں مرچنٹ سینڈ باکس کیز چاہییں۔',
    sandboxMobile: 'ٹیسٹ موبائل نمبر (کوئی بھی ٹیسٹ نمبر، مثلاً 0300-1234567)', sandboxPayBtn: 'سینڈ باکس میں {n} روپے ادا کریں', sandboxCancel: 'ادائیگی منسوخ کریں',
    pendingMsg: 'سینڈ باکس ادائیگی بن گئی — یہ زیر التواء ہے۔ کھانے صرف نیچے سینڈ باکس چیک آؤٹ پر تصدیق کے بعد دستیاب ہوں گے۔',
    paidMsg: 'سینڈ باکس ادائیگی کامیاب! سینڈ باکس میں {n} روپے ادا ہوئے (کوئی اصلی رقم نہیں)۔ کھانے اب دستیاب ہیں۔',
    cancelMsg: 'سینڈ باکس ادائیگی منسوخ کر دی گئی۔ کوئی کھانا نہیں بنا۔',
    mineTitle: 'میرے عطیات', mineLogin: 'اپنے عطیات اور پیغامات دیکھنے کے لیے لاگ ان کریں۔',
    mineDonated: 'عطیہ شدہ', mineServed: 'پیش شدہ', mineAvail: 'ابھی دستیاب', yourBadge: 'آپ کا بیج:',
    privacy: 'لیڈر بورڈ اور شفافیت پر میرا نام دکھائیں (ان ٹک کریں تو Anonymous donor)',
    donationsTitle: 'عطیات', mealsAt: '{n} میں {q} {m}', servedOf: '{s}/{q} پیش ہوئے', noDonations: 'ابھی کوئی عطیہ نہیں۔',
    printReceipt: 'رسید پرنٹ کریں', messagesTitle: 'پیغامات', noMessages: 'ابھی کوئی پیغام نہیں — جب آپ کا کھانا پیش ہوگا تو یہاں پیغام آئے گا۔',
    markRead: 'پڑھا ہوا کریں', readMark: '✓ پڑھا ہوا', popups: 'رسید پرنٹ کرنے کے لیے اس سائٹ کے لیے پاپ اپ کی اجازت دیں۔',
    signedIn: '{n} ({r}) کے طور پر لاگ ان ہیں',
    staffTitle: 'اسٹاف', staffNoRest: 'ابھی کوئی ریسٹورنٹ منسلک نہیں', staffLogin: 'اسٹاف اکاؤنٹ ایڈمن بناتا ہے اور ایک ریسٹورنٹ سے منسلک ہوتا ہے۔ اسٹاف کے طور پر لاگ ان کریں (یا جانچ کے لیے ایڈمن)۔',
    staffAvail: 'آج دستیاب کھانے', serveBtn: '1 کھانا پیش کریں', servedTotal: 'کل پیش شدہ', restLabel: 'ریسٹورنٹ',
    serveNote: 'Serve دبائیں، کوئی سوال نہیں۔ صرف تعداد اور وقت ریکارڈ ہوتا ہے، اس شخص کے بارے میں کچھ نہیں۔',
    servedMsg: 'پیش کر دیا! اب دستیاب: {a}، کل پیش شدہ: {s}۔ عطیہ دہندہ (اگر کوئی ہو) کو پیغام مل گیا۔',
    restTitle: 'ریسٹورنٹ — میری ٹیم', restLogin: 'اپنی ٹیم سنبھالنے کے لیے ریسٹورنٹ مالک کے طور پر لاگ ان کریں۔ مالک اکاؤنٹ ایڈمن بناتا ہے اور ایک ریسٹورنٹ سے منسلک ہوتا ہے۔',
    teamTitle: 'آپ کی ٹیم', teamMembers: '{n} ٹیم ممبر', teamNone: 'ابھی کوئی اسٹاف نہیں — نیچے پہلا ٹیم ممبر شامل کریں۔',
    addStaffTitle: 'اسٹاف ممبر شامل کریں', addStaffNote: 'وہ اپنے ای میل اور پاس ورڈ سے سائن ان کریں گے — آپ کو پاس ورڈ یاد رکھنے کی ضرورت نہیں۔',
    fullName: 'پورا نام', phoneEmail: 'ای میل', password: 'پاس ورڈ', roleLabel: 'کردار', addBtn: 'ٹیم میں شامل کریں', removeBtn: 'ہٹائیں',
    roleOwner: 'مالک', roleManager: 'مینجر', roleCounter: 'کاؤنٹر', roleKitchen: 'باورچی خانہ', active: 'فعال',
    permTitle: 'ہر کردار کیا کر سکتا ہے',
    permOwner: 'مالک — سب کچھ، بشمول اسٹاف اور ادائیگیاں',
    permManager: 'مینجر — کھانے پیش کریں، روزانہ کل دیکھیں',
    permCounter: 'کاؤنٹر — صرف کھانے پیش کریں',
    permKitchen: 'باورچی خانہ — دیکھیں کتنے کھانے تیار کرنے ہیں',
    staffAdded: 'اسٹاف ممبر شامل کر دیا گیا۔', staffRemoved: 'اسٹاف ممبر ہٹا دیا گیا۔', staffAddFail: 'اسٹاف ممبر شامل نہیں ہو سکا۔',
    adminTitle: 'ایڈمن ڈیش بورڈ', adminLogin: 'صرف ایڈمن۔ admin@payitforward.school سے لاگ ان کریں (سیڈ اکاؤنٹ، اصلی استعمال سے پہلے پاس ورڈ بدل لیں)۔',
    adminLoading: 'ایڈمن ڈیٹا لوڈ ہو رہا ہے… اگر یہ خالی رہے تو اوپر والا پیغام پڑھیں — وہی بیک اینڈ کی خرابی ہے۔',
    dailyTitle: 'روزانہ جانچ', dailyText: 'عطیہ − پیش شدہ = دستیاب', matches: 'ملتا ہے', mismatch: 'غلط ہے — جانچیں!',
    overviewLine: '{u} صارفین • {d} عطیات • {p} زیر التواء درخواستیں',
    verifyTitle: 'ریسٹورنٹ کی تصدیق کریں', noUnverified: 'کوئی غیر تصدیق شدہ ریسٹورنٹ نہیں۔ تمام {n} تصدیق شدہ ہیں۔', verifyBtn: 'تصدیق کریں',
    reqTitle: 'ریسٹورنٹ کی درخواستیں', noReq: 'ابھی کوئی درخواست نہیں۔', approveBtn: 'منظور کریں', rejectBtn: 'مسترد کریں',
    weeklyTitle: 'ہفتہ وار رپورٹ (پچھلے 7 دن)', weeklyChart: 'فی ریسٹورنٹ عطیہ بمقابلہ پیش شدہ (پچھلے 7 دن)', weeklyNote: 'پچھلے 7 دنوں میں ادا شدہ عطیات اور پیش شدہ کھانے، فی ریسٹورنٹ۔ وصول کنندہ کا کوئی ڈیٹا نہیں — صرف تعداد۔',
    loadReport: 'ہفتہ وار رپورٹ لوڈ کریں', downloadCsv: 'CSV ڈاؤن لوڈ کریں',
    weeklyRow: '{n} — {d} عطیہ، {s} پیش شدہ (پچھلے 7 دن) • {a} ابھی دستیاب • {t} کل پیش شدہ',
    weeklyTotal: 'کل: {d} عطیہ، {s} پیش شدہ (پچھلے 7 دن) • {a} ابھی دستیاب',
    gTitle: 'گراف — کھانوں کا جائزہ', gNote: 'صرف ایڈمن کے لیے۔ صرف تعداد — وصول کنندہ کا کوئی ڈیٹا نہیں۔', gDaily: 'آخری 7 دن — عطیہ بمقابلہ پیش کردہ', gAvail: 'ہر ریسٹورنٹ میں دستیاب کھانے', gDonated: 'عطیہ', gServed: 'پیش کردہ', gServedPct: 'پیش کردہ ٪', 
    pricesTitle: 'ریسٹورنٹ کی قیمتیں (فی ریسٹورنٹ)', pricePerMeal: 'فی کھانا {n} روپے', unverified: '(غیر تصدیق شدہ)',
    chooseRest: 'ریسٹورنٹ منتخب کریں…', newPrice: 'کھانے کی نئی قیمت (50–2000 روپے)', savePrice: 'قیمت محفوظ کریں', priceSaved: 'کھانے کی قیمت اپ ڈیٹ ہو گئی۔',
    createStaffTitle: 'اسٹاف / ایڈمن اکاؤنٹ بنائیں', roleRestLabel: 'کردار + منسلک ریسٹورنٹ (اسٹاف کے لیے ضروری)',
    createStaffBtn: 'اسٹاف اکاؤنٹ بنائیں', staffCreated: 'اسٹاف اکاؤنٹ بن گیا۔', 
    addRestTitle: 'ریسٹورنٹ شامل کریں', restName: 'نام', restArea: 'علاقہ', mealPrice: 'کھانے کی قیمت (روپے)',
    addRestBtn: 'ریسٹورنٹ شامل کریں (غیر تصدیق شدہ)', restAdded: 'ریسٹورنٹ شامل کر دیا گیا (تصدیق تک غیر تصدیق شدہ)۔',
    boardDonors: 'سب سے زیادہ عطیہ دہندگان (پیش شدہ کھانوں کے حساب سے)', boardRest: 'سب سے زیادہ ریسٹورنٹ', noDonors: 'ابھی کوئی عطیہ دہندہ نہیں۔',
    boardDonated: '{d} عطیہ، {s} پیش شدہ',
    transTitle: 'شفافیت — ہر ادا شدہ کھانا، سب کے سامنے',
    transNote: 'اصلی عطیہ اور پیش کردہ ریکارڈ سے گراف۔ وصول کنندہ کا نام، تصویر یا تفصیل کبھی نہیں۔ عطیہ دہندہ کا نام صرف لیڈر بورڈ پر ظاہر ہوتا ہے جب اس نے چاہا ہو — ورنہ ‘Anonymous donor’۔',
    transGraphTitle: 'ماہ کے حساب سے کھانے — عطیہ بمقابلہ پیش کردہ',
    transGraphNote: 'پچھلے 6 ماہ، اصلی عطیہ اور پیش کردہ ریکارڈ سے۔ صرف تعداد — وصول کنندہ کا نام کبھی نہیں۔',
    transAvailTitle: 'ہر ریسٹورنٹ میں دستیاب کھانے',
    transTotals: '{d} عطیہ • {s} پیش شدہ • {a} ابھی دستیاب',
    photoLabel: 'اسٹاف ممبر کی تصویر (ضروری)',
    photoHint: 'JPG یا PNG، زیادہ سے زیادہ 500KB۔ تصویر ٹیم کی فہرست میں دکھائی دے گی۔',
    photoRequired: 'اسٹاف ممبر کی تصویر ضروری ہے۔',
    photoTooLarge: 'تصویر بہت بڑی ہے — زیادہ سے زیادہ 500KB۔',
    photoType: 'تصویر JPG یا PNG ہونی چاہیے۔',
    photoChoose: 'تصویر منتخب کریں',
    mealOptions: 'آپ کون سے کھانے پیش کرتے ہیں؟', mealOther: 'دوسرا کھانا (نام لکھیں)', mealPriceEach: 'فی کھانا قیمت (روپے)',
    emailLabel: 'ای میل', phoneLabel: 'فون (03XX-XXXXXXX)',
    invalidEmail: 'براہ کرم درست ای میل لکھیں (مثلاً name@example.com)',
    invalidPhone: 'براہ کرم درست پاکستانی موبائل نمبر لکھیں (مثلاً 0300-1234567)',
    startTime: 'شروع کا وقت', endTime: 'ختم کا وقت',
    ownerPassLabel: 'اپنے ریسٹورنٹ ڈیش بورڈ کا پاس ورڈ', ownerPassNote: 'منظوری کے بعد آپ اپنے ای میل اور اس پاس ورڈ سے لاگ ان کریں گے۔',
    passTooShort: 'پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے',
    invalidTimes: 'براہ کرم شروع اور ختم کا وقت منتخب کریں — ختم کا وقت شروع کے بعد ہونا چاہیے',
    ownerCreated: 'مالک کا اکاؤنٹ بن گیا — مالک اب {e} سے لاگ ان کر سکتا ہے',
    ownerTempPass: 'مالک کا عارضی پاس ورڈ — براہ کرم مالک کو بتائیں: {p}',
    ownerExists: 'اس ای میل کا اکاؤنٹ پہلے سے موجود ہے — نیا مالک اکاؤنٹ نہیں بنایا گیا',
    menuTitle: 'مینیو', menuNone: 'ابھی کوئی مینیو نہیں — نیچے پہلا کھانا شامل کریں۔',
    mealName: 'کھانے کا نام', mealPrice: 'قیمت (روپے)', addMealBtn: 'کھانا شامل کریں',
    mealAdded: 'کھانا شامل کر دیا گیا۔', mealUpdated: 'کھانا اپ ڈیٹ ہو گیا۔', mealDeleted: 'کھانا حذف کر دیا گیا۔',
    mealDeleteConfirm: 'کیا یہ کھانا مینیو سے حذف کریں؟', saveBtn: 'محفوظ کریں',
    reqMealTitle: 'کھانے کی درخواست کریں',
    reqMealNote: 'کوئی لاگ ان نہیں، کوئی نام نہیں، کوئی فون نہیں — بس ریسٹورنٹ منتخب کریں اور بتائیں کتنے کھانے چاہییں۔ ریسٹورنٹ کو صرف تعداد اور وقت نظر آتا ہے۔',
    reqRest: 'ریسٹورنٹ', reqQty: 'کتنے کھانے؟ (1–3)', reqNote: 'نوٹ (اختیاری)', reqSend: 'درخواست بھیجیں',
    reqSent: 'درخواست ریسٹورنٹ کو بھیج دی گئی۔ کاؤنٹر پر یہ لائن دکھائیں: ',
    reqSentLine: '{n} {m} کی درخواست • {t}',
    reqPending: 'زیر التواء درخواستیں', reqNone: 'ابھی کوئی درخواست نہیں۔', refreshBtn: 'ریفریش', updatedAt: 'اپ ڈیٹ ہوا: {t}',
    reqFulfil: '1 کھانا پیش کریں', reqCancel: 'منسوخ کریں',
    reqFulfilled: 'درخواست مکمل — 1 کھانا پیش کر دیا گیا۔', reqCancelled: 'درخواست منسوخ کر دی گئی۔',
    reqExpired: 'میعاد ختم', reqStatus: 'حالت', reqTime: 'درخواست کا وقت',
    receiptServeTitle: '💛 Pay It Forward Meal — پیش کرنے کی رسید',
    receiptMeal: 'کھانا:', receiptQty: 'تعداد:', receiptPrice: 'فی کھانا قیمت:', receiptTotal: 'کل رقم:',
    receiptServedBy: 'پیش کرنے والا:', receiptServedToday: 'آج یہاں پیش شدہ کھانے:', receiptAvailLeft: 'باقی دستیاب کھانے:',
    printSlip: 'پرچی پرنٹ کریں', receiptsTitle: 'پیش کردہ رسیدیں', receiptsNone: 'ابھی کوئی رسید نہیں۔',
    detailMenu: 'مینیو', detailStaff: 'اسٹاف', detailClose: 'بند کریں',
    claimNote: 'کھانا لینے کے لیے بس ریسٹورنٹ کے عملے سے پوچھیں — کوئی لاگ ان نہیں، کوئی فارم نہیں۔',
    lowStock: '⚠️ صرف {n} {m} باقی — عطیات مانگیں!',
    lowStockBadge: 'کم اسٹاک — {n} باقی', closedToday: 'آج بند ہے', openNow: 'ابھی کھلا ہے',
    toggleClose: 'آج کے لیے بند کریں', toggleOpen: 'آج کے لیے کھولیں',
    closedMsg: 'یہ ریسٹورنٹ آج بند ہے — براہ کرم کسی اور ریسٹورنٹ کو عطیہ دیں یا کل آزمائیں۔',
    closedServe: 'یہ ریسٹورنٹ آج بند ہے — دوبارہ کھلنے تک پیش کرنا رکا ہوا ہے۔',
    closedReq: 'یہ ریسٹورنٹ آج بند ہے — براہ کرم کسی اور ریسٹورنٹ سے کھانا مانگیں یا کل آزمائیں۔',
    delRestBtn: 'ریسٹورنٹ حذف کریں',
    delRestConfirm: 'کیا یہ ریسٹورنٹ حذف کریں؟ اس کا مینیو، درخواستیں، رسیدیں اور اسٹاف اکاؤنٹ بھی حذف ہو جائیں گے۔',
    restDeleted: 'ریسٹورنٹ حذف کر دیا گیا۔', delUserBtn: 'حذف کریں',
    delUserConfirm: 'کیا یہ صارف اکاؤنٹ حذف کریں؟', userDeleted: 'صارف حذف کر دیا گیا۔', delMealBtn: 'حذف کریں',
    adminMealsTitle: 'تمام مینیو (کھانا حذف کریں)', adminReceiptsTitle: 'حالیہ پیش کرنے کی رسیدیں',
    adminReqsTitle: 'کھانے کی درخواستیں (تمام ریسٹورنٹ)',
    serveMealLabel: 'کون سا کھانا پیش کیا گیا؟', serveReceiptMsg: 'پیش کر دیا! رسید محفوظ ہو گئی۔',
    staffPhoneLabel: 'فون (کاؤنٹر نمبر)',
    staffPhoneNote: 'ریسٹورنٹ کا کاؤنٹر نمبر لکھیں — یہ Finder پر سب کو نظر آئے گا۔',
    staffPhoneNone: 'کاؤنٹر نمبر درج نہیں',
    staffProfile: 'اسٹاف پروفائل',
    profileRest: 'ریسٹورنٹ:',
    profileRole: 'کردار:',
    profilePhone: 'فون:',
    profileEmail: 'ای میل:',
    profileStatus: 'حالت:',
    slipTitle: 'آپ کی درخواست کی پرچی',
    slipShow: 'یہ پرچی کاؤنٹر پر دکھائیں',
    slipCode: 'درخواست کوڈ:',
    slipMeals: 'مانگے گئے کھانے:',
    reqCodeLabel: 'کوڈ:',
    reqSentShort: 'درخواست بھیج دی گئی! آپ کی پرچی نیچے ہے — کاؤنٹر پر دکھائیں۔',
    hopeLine1: 'صرف 1 کھانا باقی ہے — قریب ہی کوئی آج ایک پلیٹ کی امید لگائے بیٹھا ہے۔',
    hopeLine2: 'صرف 2 کھانے باقی ہیں — آپ کی مہربانی اگلی پلیٹ بھر سکتی ہے۔',
    boardChartDonors: 'سب سے زیادہ عطیہ دہندگان — پیش شدہ کھانے',
    boardChartRest: 'سب سے زیادہ ریسٹورنٹ — پیش شدہ کھانے',
    boardSummary: 'عطیہ بمقابلہ پیش شدہ',
    roleOther: 'دیگر (اپنا کردار لکھیں)',
    roleCustom: 'اپنا کردار',
    roleCustomPh: 'مثلاً کیشیئر',
    invalidRole: 'براہ کرم کردار منتخب کریں یا اپنا کردار لکھیں',
    areaOther: 'دیگر (اپنا علاقہ لکھیں)',
    areaChoose: 'علاقہ منتخب کریں…',
    areaCustom: 'آپ کا علاقہ',
    invalidArea: 'براہ کرم علاقہ منتخب کریں یا اپنا علاقہ لکھیں',
    restPhotoLabel: 'ریسٹورنٹ کی تصویر (اختیاری)',
    restPhotoHint: 'JPG یا PNG، زیادہ سے زیادہ 500KB۔ Finder کارڈ اور ریسٹورنٹ پروفائل پر دکھائی دے گی۔',
    mapBtn: 'نقشے پر تلاش کریں',
    photoSoon: 'تصویر جلد آئے گی',
    
    anon: 'Anonymous donor',
    joinTitle: 'ریسٹورنٹ بنیں', joinNote: 'آپ کی درخواست غیر تصدیق شدہ شروع ہوتی ہے اور ایڈمن کی منظوری تک عوامی Finder میں چھپی رہتی ہے۔ چیک لسٹ: نام، علاقہ، جو کھانے آپ پیش کرتے ہیں اور آپ کے کھلنے کے اوقات، اور آپ بغیر سوال پوچھے پیش کرنے پر راضی ہیں۔',
    sendBtn: 'درخواست بھیجیں', joinSent: 'درخواست بھیج دی گئی! ایڈمن جائزہ لے گا۔ منظوری تک یہ عوامی طور پر نہیں دکھائی دے گی۔',
    authTitle: 'لاگ ان / سائن اپ', authNote: 'عوامی سائن اپ سے عطیہ دہندہ کا اکاؤنٹ بنتا ہے۔ اسٹاف اور ایڈمن اکاؤنٹ ایڈمن بناتا ہے۔',
    authName: 'پورا نام', authEmail: 'ای میل', authPass: 'پاس ورڈ (کم از کم 6 حروف، ہیش کر کے محفوظ)',
    createAccount: 'عطیہ دہندہ اکاؤنٹ بنائیں', loginBtn: 'لاگ ان', toLogin: 'پہلے سے اکاؤنٹ ہے؟ لاگ ان کریں', toRegister: 'نئے ہیں؟ اکاؤنٹ بنائیں',
    seedNote: 'اسکول ایڈمن (سیڈ، اصلی استعمال سے پہلے پاس ورڈ بدل لیں): admin@payitforward.school / Admin123!',
    ownerSeedNote: 'ڈیمو ریسٹورنٹ مالک: owner@payitforward.school / Owner123! (سندھ بریانی ہاؤس)',
    welcome: 'خوش آمدید، {n} ({r})۔', backendErr: 'بیک اینڈ نہیں چل رہا؟ شروع کریں: cd backend && npm start  •  {e}',
    footerExplore: 'دریافت کریں', footerLang: 'زبانیں', footerCopy: '© 2026 Pay It Forward Meal • SDG 1 (غربت ختم کریں) اور SDG 2 (بھوک ختم کریں) کی حمایت کرتا ہے۔ وصول کنندہ کا کوئی ڈیٹا کبھی محفوظ نہیں ہوتا۔',
    badgeHero: '🏆 Meal Hero (10+ پیش شدہ)', badgeHeart: '💛 Kind Heart (5+ پیش شدہ)', badgeNew: '🌱 New Giver (1+ پیش شدہ)', badgeNone: '— ابھی کوئی بیج نہیں، پہلے عطیہ دیں',
    receiptTitle: '💛 Pay It Forward Meal — عطیہ کی رسید', receiptDonor: 'عطیہ دہندہ:', receiptRest: 'ریسٹورنٹ:', receiptMeals: 'عطیہ شدہ کھانے:', receiptServed: 'اس عطیے سے اب تک پیش شدہ:', receiptAmount: 'رقم:', receiptMethod: 'طریقہ:', receiptStatus: 'حالت:', receiptTxn: 'لین دین نمبر:', receiptDate: 'تاریخ:',
    receiptNote: 'شکریہ — آپ کا کھانا بغیر سوال پوچھے پیش کیا جائے گا، اور وصول کنندہ کا کوئی ڈیٹا کبھی محفوظ نہیں ہوتا۔ ادائیگی: پائلٹ میں ٹیسٹ/سینڈ باکس موڈ — کوئی اصلی رقم نہیں چلتی۔',
  },
  sd: {
    home: 'گھر', finder: 'مفت کاڌو ڳوليو', donate: 'عطيو ڏيو', mine: 'منهنجا عطيا', staff: 'اسٽاف', restaurant: 'ريسٽورنٽ', admin: 'ايڊمن', board: 'ليڊر بورڊ', transparency: 'شفافيت', request: 'ريسٽورنٽ ٿيو', auth: 'لاگ ان / سائن اپ',
    dashboard: 'ڊيش بورڊ', login: 'لاگ ان', logout: 'لاگ آئوٽ', menu: 'مينيو',
    eyebrow: '● پاڪستان ۾ لائيو · آزمائشي منصوبو',
    heroHead1: 'هڪ کاڌو اڳتي،', heroHead2: 'اڄ هڪ پليٽ ڀرجي وئي۔',
    heroLead: 'کاڌو کائڻ وارو پنهنجي کاڌي سان گڏ هڪ اضافي کاڌو ادا ڪري ٿو. اهو اضافي کاڌو ڪنهن ضرورت مند لاءِ تصديق ٿيل پارٽنر ريسٽورنٽ ۾ انتظار ڪري ٿو. ڪا وضاحت ناهي، ڪا ادائيگي ناهي، ڪا شرم ناهي.',
    oldLine: 'هڪ عام رات جو کاڌو ڪنهن ٻئي جو رات جو کاڌو بڻجي وڃي ٿو.',
    donateBtn: 'کاڌو عطيو ڪريو', findBtn: 'مفت کاڌو ڳوليو',
    needLine: 'کاڌو گهرجي؟ ڪو لاگ ان ناهي، ڪو سوال ناهي، ڪو فارم ناهي — بس درج ٿيل ريسٽورنٽ جي اسٽاف کان پڇو.',
    availLine: 'هاڻي {n} {m} دستياب آهن — پنهنجي ويجهو ڳوليو، يا عطيو ڏئي شيلف ڀريو رکو.',
    mealOne: 'کاڌو', mealMany: 'کاڌا',
    noAvailLine: 'هاڻي ڪو کاڌو دستياب ناهي — اڄ پهريون عطيو ڏيندڙ ٿيو.',
    servedChip: 'توهان جو کاڌو پيش ڪيو ويو!', availChip: 'اڄ {m} دستياب آهن', 
    
    liveDash: 'لائيو ڊيش بورڊ', liveNote: 'انگ ڊيٽابيس مان سڌو اچن ٿا. ڪجهه به هٿ سان ناهي لکيو ويندو.',
    donated: 'عطيو ٿيل', served: 'پيش ٿيل', available: 'هاڻي دستياب', byRest: 'ريسٽورنٽ موجب', noRest: 'هاڻي ڪنهن پارٽنر ريسٽورنٽ ۾ کاڌو ناهي. پهريون عطيو ڏيندڙ ٿيو!',
    goal: 'پائلٽ هدف: {g} مان {n} کاڌا عطيا ٿيا', goalPct: 'هدف جو {p}٪', goalServed: 'هينئر تائين {n} پيش ٿيا', goalReached: '🎉 پائلٽ هدف پورو!',
    howTitle: 'هي ڪيئن ڪم ڪري ٿو',
    step1t: 'عطيو ڏيو', step1d: 'تصديق ٿيل ريسٽورنٽ چونڊيو ۽ هڪ يا وڌيڪ اضافي کاڌن جي ادائيگي ڪريو.',
    step2t: 'پيش ڪيو ويو', step2d: 'ضرورت مند ماڻهو اسٽاف کان Pay It Forward کاڌو گهري ٿو. ڪو سوال ناهي، ڪا ادائيگي ناهي.',
    step3t: 'توهان کي پيغام ملي ٿو', step3d: '”توهان جو کاڌو پيش ڪيو ويو.“ توهان کي ثبوت ملي ٿو ۽ توهان ڪڏهن نٿا ڄاڻو ته ڪنهن وصول ڪيو.',
    trust1: '✓ صرف تصديق ٿيل ريسٽورنٽ', trust2: '✓ وصول ڪندڙ جو ڪو ڊيٽا محفوظ ناهي', trust3: '✓ رقم صرف پيش ڪرڻ کان پوءِ ملي ٿي',
    urgent: 'تڪڙ:', mealsLeft: '{n} {m} باقي', giveMost: '💛 جتي سڀ کان وڌيڪ ضرورت آهي اتي ڏيو', giveMostName: '💛 جتي سڀ کان وڌيڪ ضرورت آهي — {n}',
    partnerTitle: 'ريسٽورنٽ هلايو ٿا؟', partnerText: 'پارٽنر ٿيو ۽ پنهنجن گراهڪن جي پئسن سان مفت کاڌا پيش ڪريو.', partnerBtn: 'پارٽنر ٿيو',
    activityTitle: 'تازي سرگرمي (وصول ڪندڙ جو نالو ڪڏهن ناهي)', activityServed: '🍲 هڪ کاڌو پيش ڪيو ويو', activityDonated: '💛 {n} {q} عطيا ڪيا', activityAt: '{n} ۾', activityNone: 'هينئر تائين ڪا سرگرمي ناهي — پهريون عطيو ڏيندڙ ٿيو.',
    finderTitle: 'اڄ جا مفت کاڌا', finderNote: 'اڄ هتي مفت کاڌا دستياب آهن. بس اسٽاف کان Pay It Forward کاڌو گهرو.',
    finderArea: 'علائقو / شهر', finderOnly: 'صرف اهي ريسٽورنٽ ڏيکاريو جن ۾ کاڌو دستياب آهي',
    finderUrgent: '⚠️ {n} باقي — تڪڙ', finderMeals: '{n} {m}', finderPerMeal: 'في کاڌو {n} رپيا', finderServed: 'هينئر تائين {n} پيش ٿيا',
    finderEmptyAvail: 'هن علائقي ۾ هاڻي ڪنهن ريسٽورنٽ ۾ کاڌو دستياب ناهي — سڀ علائقا آزمايو، يا عطيي کان پوءِ واپس ڏسو.',
    finderEmptyArea: 'هن علائقي ۾ هينئر تائين ڪو تصديق ٿيل ريسٽورنٽ ناهي.', finderNoLogin: 'ڪو لاگ ان ناهي. ڪو فارم ناهي. اسان توهان بابت ڪجهه نٿا پڇون ۽ نه محفوظ ڪريون ٿا.',
    allAreas: 'سڀ علائقا',
    donateTitle: 'کاڌو عطيو ڪريو', donateLoginFirst: 'پهرين عطيو ڏيندڙ طور لاگ ان ڪريو — عوامي سائن اپ سان عطيو ڏيندڙ جو اڪائونٽ ٺهي ٿو.',
    donateMost: '💛 جتي سڀ کان وڌيڪ ضرورت آهي اتي ڏيو', donateMostName: '💛 جتي سڀ کان وڌيڪ ضرورت آهي — {n} ({m} باقي)',
    donateRest: '1. ريسٽورنٽ', donateChoose: 'تصديق ٿيل ريسٽورنٽ چونڊيو…', donateVerified: 'تصديق ٿيل',
    donateQty: '2. کاڌن جو تعداد', donateCustom: '(1–10، پنهنجي مرضي به)',
    donateMethod: '3. ادائيگي جو طريقو', methodWallet: 'موبائل واليٽ', methodCard: 'ڊيبٽ / ڪريڊٽ',
    summary: 'خلاصو', summaryMeals: 'کاڌا:', summaryMethod: 'طريقو:', summaryPrice: 'قيمت:', summaryPerMeal: 'في کاڌو {n} ۾ — هر ريسٽورنٽ جي قيمت ايڊمن طئي ڪري ٿو',
    summaryChoose: 'کاڌي جي قيمت ڏسڻ لاءِ پهرين ريسٽورنٽ چونڊيو. هر ريسٽورنٽ جي پنهنجي قيمت آهي، جيڪا ايڊمن طئي ڪري ٿو.',
    testMode: 'ٽيسٽ موڊ: پائلٽ ۾ ڪا حقيقي رقم نٿي هلي.', continueBtn: 'سينڊ باڪس چيڪ آئوٽ ڏانهن وڃو',
    statusNote: 'حالت: التوا ۾ → ادا ٿيل (سينڊ باڪس) → دستياب → پيش ٿيل. التوا وارا کاڌا دستياب ناهن.',
    sandboxTitle: 'سينڊ باڪس چيڪ آئوٽ — {n} (سيموليٽر، حقيقي گيٽ وي سائيٽ ناهي)',
    sandboxPay: '{q} {m} — {n} رپيا ادا ڪريو', sandboxTxn: 'لين دين نمبر:', sandboxNote: 'هي مقابلي جي ڊيمو لاءِ اسان جو پنهنجو سينڊ باڪس سيموليٽر آهي. ڪا حقيقي رقم نٿي هلي. حقيقي JazzCash/Easypaisa گيٽ وي لاءِ backend/.env ۾ مرچنٽ سينڊ باڪس ڪيز گهرجن.',
    sandboxMobile: 'ٽيسٽ موبائل نمبر (ڪو به ٽيسٽ نمبر، مثال 0300-1234567)', sandboxPayBtn: 'سينڊ باڪس ۾ {n} رپيا ادا ڪريو', sandboxCancel: 'ادائيگي رد ڪريو',
    pendingMsg: 'سينڊ باڪس ادائيگي ٺهي وئي — اها التوا ۾ آهي. کاڌا صرف هيٺ سينڊ باڪس چيڪ آئوٽ تي تصديق کان پوءِ دستياب ٿيندا.',
    paidMsg: 'سينڊ باڪس ادائيگي ڪامياب! سينڊ باڪس ۾ {n} رپيا ادا ٿيا (ڪا حقيقي رقم ناهي). کاڌا هاڻي دستياب آهن.',
    cancelMsg: 'سينڊ باڪس ادائيگي رد ڪئي وئي. ڪو کاڌو ناهي ٺهيو.',
    mineTitle: 'منهنجا عطيا', mineLogin: 'پنهنجا عطيا ۽ پيغام ڏسڻ لاءِ لاگ ان ڪريو.',
    mineDonated: 'عطيو ٿيل', mineServed: 'پيش ٿيل', mineAvail: 'اڃا دستياب', yourBadge: 'توهان جو بيج:',
    privacy: 'ليڊر بورڊ ۽ شفافيت تي منهنجو نالو ڏيکاريو (ان ٽڪ ڪريو ته Anonymous donor)',
    donationsTitle: 'عطيا', mealsAt: '{n} ۾ {q} {m}', servedOf: '{s}/{q} پيش ٿيا', noDonations: 'هينئر تائين ڪو عطيو ناهي.',
    printReceipt: 'رسيد پرنٽ ڪريو', messagesTitle: 'پيغام', noMessages: 'هينئر تائين ڪو پيغام ناهي — جڏهن توهان جو کاڌو پيش ٿيندو ته هتي پيغام ايندو.',
    markRead: 'پڙهيل ڪريو', readMark: '✓ پڙهيل', popups: 'رسيد پرنٽ ڪرڻ لاءِ هن سائيٽ لاءِ پاپ اپ جي اجازت ڏيو.',
    signedIn: '{n} ({r}) طور لاگ ان آهيو',
    staffTitle: 'اسٽاف', staffNoRest: 'هينئر تائين ڪو ريسٽورنٽ ڳنڍيل ناهي', staffLogin: 'اسٽاف اڪائونٽ ايڊمن ٺاهي ٿو ۽ هڪ ريسٽورنٽ سان ڳنڍيل هوندو آهي. اسٽاف طور لاگ ان ڪريو (يا جاچ لاءِ ايڊمن).',
    staffAvail: 'اڄ دستياب کاڌا', serveBtn: '1 کاڌو پيش ڪريو', servedTotal: 'ڪل پيش ٿيل', restLabel: 'ريسٽورنٽ',
    serveNote: 'Serve دٻايو، ڪو سوال ناهي. صرف تعداد ۽ وقت رڪارڊ ٿئي ٿو، ان ماڻهو بابت ڪجهه ناهي.',
    servedMsg: 'پيش ڪيو ويو! هاڻي دستياب: {a}، ڪل پيش ٿيل: {s}. عطيو ڏيندڙ (جيڪڏهن ڪو آهي) کي پيغام ملي ويو.',
    restTitle: 'ريسٽورنٽ — منهنجي ٽيم', restLogin: 'پنهنجي ٽيم سنڀالڻ لاءِ ريسٽورنٽ مالڪ طور لاگ ان ڪريو. مالڪ اڪائونٽ ايڊمن ٺاهي ٿو ۽ هڪ ريسٽورنٽ سان ڳنڍيل هوندو آهي.',
    teamTitle: 'توهان جي ٽيم', teamMembers: '{n} ٽيم ميمبر', teamNone: 'هينئر تائين ڪو اسٽاف ناهي — هيٺ پهريون ٽيم ميمبر شامل ڪريو.',
    addStaffTitle: 'اسٽاف ميمبر شامل ڪريو', addStaffNote: 'اهي پنهنجي اي ميل ۽ پاس ورڊ سان سائن ان ڪندا — توهان کي پاس ورڊ ياد رکڻ جي ضرورت ناهي.',
    fullName: 'پورو نالو', phoneEmail: 'اي ميل', password: 'پاس ورڊ', roleLabel: 'ڪردار', addBtn: 'ٽيم ۾ شامل ڪريو', removeBtn: 'هٽايو',
    roleOwner: 'مالڪ', roleManager: 'مينجر', roleCounter: 'ڪائونٽر', roleKitchen: 'باورچي خانو', active: 'فعال',
    permTitle: 'هر ڪردار ڇا ڪري سگهي ٿو',
    permOwner: 'مالڪ — سڀ ڪجهه، اسٽاف ۽ ادائيگين سميت',
    permManager: 'مينجر — کاڌا پيش ڪريو، روزانو ڪل ڏسو',
    permCounter: 'ڪائونٽر — صرف کاڌا پيش ڪريو',
    permKitchen: 'باورچي خانو — ڏسو ڪيترا کاڌا تيار ڪرڻا آهن',
    staffAdded: 'اسٽاف ميمبر شامل ڪيو ويو.', staffRemoved: 'اسٽاف ميمبر هٽايو ويو.', staffAddFail: 'اسٽاف ميمبر شامل نه ٿي سگهيو.',
    adminTitle: 'ايڊمن ڊيش بورڊ', adminLogin: 'صرف ايڊمن. admin@payitforward.school سان لاگ ان ڪريو (سيڊ اڪائونٽ، حقيقي استعمال کان اڳ پاس ورڊ تبديل ڪريو).',
    adminLoading: 'ايڊمن ڊيٽا لوڊ ٿي رهي آهي… جيڪڏهن هي خالي رهي ته مٿي وارو پيغام پڙهو — اهو ئي بيڪ اينڊ جي خرابي آهي.',
    dailyTitle: 'روزانو جاچ', dailyText: 'عطيو − پيش ٿيل = دستياب', matches: 'ملي ٿو', mismatch: 'غلط آهي — جاچيو!',
    overviewLine: '{u} استعمال ڪندڙ • {d} عطيا • {p} التوا واريون درخواستون',
    verifyTitle: 'ريسٽورنٽ جي تصديق ڪريو', noUnverified: 'ڪو غير تصديق ٿيل ريسٽورنٽ ناهي. سڀ {n} تصديق ٿيل آهن.', verifyBtn: 'تصديق ڪريو',
    reqTitle: 'ريسٽورنٽ جون درخواستون', noReq: 'هينئر تائين ڪا درخواست ناهي.', approveBtn: 'منظور ڪريو', rejectBtn: 'رد ڪريو',
    weeklyTitle: 'هفتيوار رپورٽ (پوئين 7 ڏينهن)', weeklyChart: 'في ريسٽورنٽ عطيو بمقابلو پيش ٿيل (پوئين 7 ڏينهن)', weeklyNote: 'پوئين 7 ڏينهن ۾ ادا ٿيل عطيا ۽ پيش ٿيل کاڌا، في ريسٽورنٽ. وصول ڪندڙ جو ڪو ڊيٽا ناهي — صرف تعداد.',
    loadReport: 'هفتيوار رپورٽ لوڊ ڪريو', downloadCsv: 'CSV ڊائون لوڊ ڪريو',
    weeklyRow: '{n} — {d} عطيا، {s} پيش ٿيل (پوئين 7 ڏينهن) • {a} هاڻي دستياب • {t} ڪل پيش ٿيل',
    weeklyTotal: 'ڪل: {d} عطيا، {s} پيش ٿيل (پوئين 7 ڏينهن) • {a} هاڻي دستياب',
    gTitle: 'گراف — کاڌن جو جائزو', gNote: 'صرف ايڊمن لاءِ. صرف تعداد — وصول ڪندڙ جو ڪو ڊيٽا ناهي.', gDaily: 'پوئين 7 ڏينهن — عطيو بمقابلو پيش ٿيل', gAvail: 'هر ريسٽورنٽ ۾ دستياب کاڌا', gDonated: 'عطيو', gServed: 'پيش ٿيل', gServedPct: 'پيش ٿيل ٪', 
    pricesTitle: 'ريسٽورنٽ جون قيمتون (في ريسٽورنٽ)', pricePerMeal: 'في کاڌو {n} رپيا', unverified: '(غير تصديق ٿيل)',
    chooseRest: 'ريسٽورنٽ چونڊيو…', newPrice: 'کاڌي جي نئين قيمت (50–2000 رپيا)', savePrice: 'قيمت محفوظ ڪريو', priceSaved: 'کاڌي جي قيمت اپڊيٽ ٿي وئي.',
    createStaffTitle: 'اسٽاف / ايڊمن اڪائونٽ ٺاهيو', roleRestLabel: 'ڪردار + ڳنڍيل ريسٽورنٽ (اسٽاف لاءِ ضروري)',
    createStaffBtn: 'اسٽاف اڪائونٽ ٺاهيو', staffCreated: 'اسٽاف اڪائونٽ ٺهي ويو.', 
    addRestTitle: 'ريسٽورنٽ شامل ڪريو', restName: 'نالو', restArea: 'علائقو', mealPrice: 'کاڌي جي قيمت (رپيا)',
    addRestBtn: 'ريسٽورنٽ شامل ڪريو (غير تصديق ٿيل)', restAdded: 'ريسٽورنٽ شامل ڪيو ويو (تصديق تائين غير تصديق ٿيل).',
    boardDonors: 'سڀ کان وڌيڪ عطيو ڏيندڙ (پيش ٿيل کاڌن موجب)', boardRest: 'سڀ کان وڌيڪ ريسٽورنٽ', noDonors: 'هينئر تائين ڪو عطيو ڏيندڙ ناهي.',
    boardDonated: '{d} عطيا، {s} پيش ٿيل',
    transTitle: 'شفافيت — هر ادا ٿيل کاڌو، سڀني جي سامهون',
    transNote: 'حقيقي عطيي ۽ پيش ٿيل رڪارڊ مان گراف. وصول ڪندڙ جو نالو، تصوير يا تفصيل ڪڏهن ناهي. عطيو ڏيندڙ جو نالو صرف ليڊر بورڊ تي ظاهر ٿئي ٿو جڏهن هن چاهيو هجي — ورنه ‘Anonymous donor’.',
    transGraphTitle: 'مهيني موجب کاڌا — عطيو بمقابلو پيش ٿيل',
    transGraphNote: 'پوئين 6 مهينا، حقيقي عطيي ۽ پيش ٿيل رڪارڊ مان. صرف تعداد — وصول ڪندڙ جو نالو ڪڏهن ناهي.',
    transAvailTitle: 'هر ريسٽورنٽ ۾ دستياب کاڌا',
    transTotals: '{d} عطيا • {s} پيش ٿيل • {a} هاڻي دستياب',
    photoLabel: 'اسٽاف ميمبر جي تصوير (لازمي)',
    photoHint: 'JPG يا PNG، وڌ ۾ وڌ 500KB. تصوير ٽيم جي فهرست ۾ ڏيکاري ويندي.',
    photoRequired: 'اسٽاف ميمبر جي تصوير لازمي آهي.',
    photoTooLarge: 'تصوير تمام وڏي آهي — وڌ ۾ وڌ 500KB.',
    photoType: 'تصوير JPG يا PNG هجڻ گهرجي.',
    photoChoose: 'تصوير چونڊيو',
    mealOptions: 'توهان ڪهڙا کاڌا پيش ڪندا آهيو؟', mealOther: 'ٻيو کاڌو (نالو لکو)', mealPriceEach: 'في کاڌو قيمت (رپيا)',
    emailLabel: 'اي ميل', phoneLabel: 'فون (03XX-XXXXXXX)',
    invalidEmail: 'مهرباني ڪري صحيح اي ميل لکو (مثال name@example.com)',
    invalidPhone: 'مهرباني ڪري صحيح پاڪستاني موبائل نمبر لکو (مثال 0300-1234567)',
    startTime: 'شروعات جو وقت', endTime: 'ختم ٿيڻ جو وقت',
    ownerPassLabel: 'پنهنجي ريسٽورنٽ ڊيش بورڊ جو پاسورڊ', ownerPassNote: 'منظوري کان پوءِ توهان پنهنجي اي ميل ۽ هن پاسورڊ سان لاگ ان ڪندا.',
    passTooShort: 'پاسورڊ گهٽ ۾ گهٽ 8 اکرن جو هجڻ گهرجي',
    invalidTimes: 'مهرباني ڪري شروعات ۽ ختم ٿيڻ جو وقت چونڊيو — ختم ٿيڻ جو وقت شروعات کان پوءِ هجڻ گهرجي',
    ownerCreated: 'مالڪ جو اڪائونٽ ٺهي ويو — مالڪ هاڻي {e} سان لاگ ان ڪري سگهي ٿو',
    ownerTempPass: 'مالڪ جو عارضي پاسورڊ — مهرباني ڪري مالڪ کي ٻڌايو: {p}',
    ownerExists: 'هن اي ميل جو اڪائونٽ اڳ ۾ ئي موجود آهي — نئون مالڪ اڪائونٽ نه ٺاهيو ويو',
    menuTitle: 'مينيو', menuNone: 'هينئر تائين ڪو مينيو ناهي — هيٺ پهريون کاڌو شامل ڪريو.',
    mealName: 'کاڌي جو نالو', mealPrice: 'قيمت (رپيا)', addMealBtn: 'کاڌو شامل ڪريو',
    mealAdded: 'کاڌو شامل ڪيو ويو.', mealUpdated: 'کاڌو اپڊيٽ ٿي ويو.', mealDeleted: 'کاڌو حذف ڪيو ويو.',
    mealDeleteConfirm: 'هي کاڌو مينيو مان حذف ڪجي؟', saveBtn: 'محفوظ ڪريو',
    reqMealTitle: 'کاڌي جي درخواست ڪريو',
    reqMealNote: 'ڪو لاگ ان ناهي، ڪو نالو ناهي، ڪو فون ناهي — بس ريسٽورنٽ چونڊيو ۽ ٻڌايو ڪيترا کاڌا گهرجن. ريسٽورنٽ کي صرف تعداد ۽ وقت نظر اچي ٿو.',
    reqRest: 'ريسٽورنٽ', reqQty: 'ڪيترا کاڌا؟ (1–3)', reqNote: 'نوٽ (اختياري)', reqSend: 'درخواست موڪليو',
    reqSent: 'درخواست ريسٽورنٽ ڏانهن موڪلي وئي. ڪائونٽر تي هي لائين ڏيکاريو: ',
    reqSentLine: '{n} {m} جي درخواست • {t}',
    reqPending: 'التوا واريون درخواستون', reqNone: 'هينئر تائين ڪا درخواست ناهي.', refreshBtn: 'ريفريش', updatedAt: 'اپڊيٽ ٿيو: {t}',
    reqFulfil: '1 کاڌو پيش ڪريو', reqCancel: 'رد ڪريو',
    reqFulfilled: 'درخواست پوري ٿي — 1 کاڌو پيش ڪيو ويو.', reqCancelled: 'درخواست رد ڪئي وئي.',
    reqExpired: 'مدت ختم', reqStatus: 'حالت', reqTime: 'درخواست جو وقت',
    receiptServeTitle: '💛 Pay It Forward Meal — پيش ڪرڻ جي رسيد',
    receiptMeal: 'کاڌو:', receiptQty: 'تعداد:', receiptPrice: 'في کاڌو قيمت:', receiptTotal: 'ڪل رقم:',
    receiptServedBy: 'پيش ڪندڙ:', receiptServedToday: 'اڄ هتي پيش ٿيل کاڌا:', receiptAvailLeft: 'باقي دستياب کاڌا:',
    printSlip: 'پرچي پرنٽ ڪريو', receiptsTitle: 'پيش ڪيل رسيدون', receiptsNone: 'هينئر تائين ڪا رسيد ناهي.',
    detailMenu: 'مينيو', detailStaff: 'اسٽاف', detailClose: 'بند ڪريو',
    claimNote: 'کاڌو وٺڻ لاءِ بس ريسٽورنٽ جي اسٽاف کان پڇو — ڪو لاگ ان ناهي، ڪو فارم ناهي.',
    lowStock: '⚠️ صرف {n} {m} باقي — عطيا گهرو!',
    lowStockBadge: 'گهٽ اسٽاڪ — {n} باقي', closedToday: 'اڄ بند آهي', openNow: 'هاڻي کليل آهي',
    toggleClose: 'اڄ لاءِ بند ڪريو', toggleOpen: 'اڄ لاءِ کليو',
    closedMsg: 'هي ريسٽورنٽ اڄ بند آهي — مهرباني ڪري ٻئي ريسٽورنٽ کي عطيو ڏيو يا سڀاڻي آزمايو.',
    closedServe: 'هي ريسٽورنٽ اڄ بند آهي — ٻيهر کلڻ تائين پيش ڪرڻ بند آهي.',
    closedReq: 'هي ريسٽورنٽ اڄ بند آهي — مهرباني ڪري ٻئي ريسٽورنٽ کان کاڌو گهرو يا سڀاڻي آزمايو.',
    delRestBtn: 'ريسٽورنٽ حذف ڪريو',
    delRestConfirm: 'هي ريسٽورنٽ حذف ڪجي؟ ان جو مينيو، درخواستون، رسيدون ۽ اسٽاف اڪائونٽ به حذف ٿي ويندا.',
    restDeleted: 'ريسٽورنٽ حذف ڪيو ويو.', delUserBtn: 'حذف ڪريو',
    delUserConfirm: 'هي استعمال ڪندڙ اڪائونٽ حذف ڪجي؟', userDeleted: 'استعمال ڪندڙ حذف ڪيو ويو.', delMealBtn: 'حذف ڪريو',
    adminMealsTitle: 'سڀ مينيو (کاڌو حذف ڪريو)', adminReceiptsTitle: 'تازيون پيش ڪرڻ جون رسيدون',
    adminReqsTitle: 'کاڌي جون درخواستون (سڀ ريسٽورنٽ)',
    serveMealLabel: 'ڪهڙو کاڌو پيش ڪيو ويو؟', serveReceiptMsg: 'پيش ڪيو ويو! رسيد محفوظ ٿي وئي.',
    staffPhoneLabel: 'فون (ڪائونٽر نمبر)',
    staffPhoneNote: 'ريسٽورنٽ جو ڪائونٽر نمبر لکو — هي Finder تي سڀني کي نظر ايندو.',
    staffPhoneNone: 'ڪائونٽر نمبر درج ناهي',
    staffProfile: 'اسٽاف پروفائل',
    profileRest: 'ريسٽورنٽ:',
    profileRole: 'ڪردار:',
    profilePhone: 'فون:',
    profileEmail: 'اي ميل:',
    profileStatus: 'حالت:',
    slipTitle: 'توهان جي درخواست جي پرچي',
    slipShow: 'هي پرچي ڪائونٽر تي ڏيکاريو',
    slipCode: 'درخواست ڪوڊ:',
    slipMeals: 'گهريل کاڌا:',
    reqCodeLabel: 'ڪوڊ:',
    reqSentShort: 'درخواست موڪلي وئي! توهان جي پرچي هيٺ آهي — ڪائونٽر تي ڏيکاريو.',
    hopeLine1: 'صرف 1 کاڌو باقي آهي — ويجهو ئي ڪو اڄ هڪ پليٽ جي اميد رکي ويٺو آهي.',
    hopeLine2: 'صرف 2 کاڌا باقي آهن — توهان جي مهرباني ايندڙ پليٽ ڀري سگهي ٿي.',
    boardChartDonors: 'سڀ کان وڌيڪ عطيو ڏيندڙ — پيش ٿيل کاڌا',
    boardChartRest: 'سڀ کان وڌيڪ ريسٽورنٽ — پيش ٿيل کاڌا',
    boardSummary: 'عطيو بمقابلو پيش ٿيل',
    roleOther: 'ٻيو (پنهنجو ڪردار لکو)',
    roleCustom: 'پنهنجو ڪردار',
    roleCustomPh: 'مثال ڪيشيئر',
    invalidRole: 'مهرباني ڪري ڪردار چونڊيو يا پنهنجو ڪردار لکو',
    areaOther: 'ٻيو (پنهنجو علائقو لکو)',
    areaChoose: 'علائقو چونڊيو…',
    areaCustom: 'توهان جو علائقو',
    invalidArea: 'مهرباني ڪري علائقو چونڊيو يا پنهنجو علائقو لکو',
    restPhotoLabel: 'ريسٽورنٽ جي تصوير (اختياري)',
    restPhotoHint: 'JPG يا PNG، وڌ ۾ وڌ 500KB. Finder ڪارڊ ۽ ريسٽورنٽ پروفائل تي ڏيکاري ويندي.',
    mapBtn: 'نقشي تي ڳوليو',
    photoSoon: 'تصوير جلد ايندي',
    
    anon: 'Anonymous donor',
    joinTitle: 'ريسٽورنٽ ٿيو', joinNote: 'توهان جي درخواست غير تصديق ٿيل شروع ٿئي ٿي ۽ ايڊمن جي منظوري تائين عوامي Finder ۾ لڪيل رهي ٿي. چيڪ لسٽ: نالو، علائقو، جيڪي کاڌا توهان پيش ڪندا آهيو ۽ توهان جي کلڻ جا وقت، ۽ توهان بغير سوال پڇڻ جي پيش ڪرڻ تي راضي آهيو.',
    sendBtn: 'درخواست موڪليو', joinSent: 'درخواست موڪلي وئي! ايڊمن جائزو وٺندو. منظوري تائين هي عوامي طور تي نه ڏيکاري ويندي.',
    authTitle: 'لاگ ان / سائن اپ', authNote: 'عوامي سائن اپ سان عطيو ڏيندڙ جو اڪائونٽ ٺهي ٿو. اسٽاف ۽ ايڊمن اڪائونٽ ايڊمن ٺاهي ٿو.',
    authName: 'پورو نالو', authEmail: 'اي ميل', authPass: 'پاس ورڊ (گهٽ ۾ گهٽ 6 اکر، هيش ڪري محفوظ)',
    createAccount: 'عطيو ڏيندڙ اڪائونٽ ٺاهيو', loginBtn: 'لاگ ان', toLogin: 'اڳ ئي اڪائونٽ آهي؟ لاگ ان ڪريو', toRegister: 'نوان آهيو؟ اڪائونٽ ٺاهيو',
    seedNote: 'اسڪول ايڊمن (سيڊ، حقيقي استعمال کان اڳ پاس ورڊ تبديل ڪريو): admin@payitforward.school / Admin123!',
    ownerSeedNote: 'ڊيمو ريسٽورنٽ مالڪ: owner@payitforward.school / Owner123! (سنڌ برياني هائوس)',
    welcome: 'ڀليڪار، {n} ({r}).', backendErr: 'بيڪ اينڊ نٿو هلي؟ شروع ڪريو: cd backend && npm start  •  {e}',
    footerExplore: 'دريافت ڪريو', footerLang: 'ٻوليون', footerCopy: '© 2026 Pay It Forward Meal • SDG 1 (غربت ختم ڪريو) ۽ SDG 2 (بک ختم ڪريو) جي حمايت ڪري ٿو. وصول ڪندڙ جو ڪو ڊيٽا ڪڏهن محفوظ نٿو ٿئي.',
    badgeHero: '🏆 Meal Hero (10+ پيش ٿيل)', badgeHeart: '💛 Kind Heart (5+ پيش ٿيل)', badgeNew: '🌱 New Giver (1+ پيش ٿيل)', badgeNone: '— هينئر تائين ڪو بيج ناهي، پهرين عطيو ڏيو',
    receiptTitle: '💛 Pay It Forward Meal — عطيي جي رسيد', receiptDonor: 'عطيو ڏيندڙ:', receiptRest: 'ريسٽورنٽ:', receiptMeals: 'عطيو ٿيل کاڌا:', receiptServed: 'هن عطيي مان هينئر تائين پيش ٿيل:', receiptAmount: 'رقم:', receiptMethod: 'طريقو:', receiptStatus: 'حالت:', receiptTxn: 'لين دين نمبر:', receiptDate: 'تاريخ:',
    receiptNote: 'مهرباني — توهان جو کاڌو بغير سوال پڇڻ جي پيش ڪيو ويندو، ۽ وصول ڪندڙ جو ڪو ڊيٽا ڪڏهن محفوظ نٿو ٿئي. ادائيگي: پائلٽ ۾ ٽيسٽ/سينڊ باڪس موڊ — ڪا حقيقي رقم نٿي هلي.',
  },
};

// fmt: replace {n}/{q}/{s}/{a}/{d}/{p}/{g}/{m}/{u}/{e}/{r}/{t} placeholders.
const fmt = (s, v = {}) => String(s).replace(/\{(\w)\}/g, (_, k) => (v[k] !== undefined ? v[k] : `{${k}}`));

// Readable date/time in Asia/Karachi, e.g. "10 Nov 2026, 3:45 PM" — never show raw ISO timestamps.
const fmtDate = (iso) => { try { return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Karachi' }).format(new Date(iso)); } catch { return iso || ''; } };
// Short clock time (Asia/Karachi) for the "Updated HH:MM:SS" line on the request lists.
const fmtTime = (d) => { try { return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'Asia/Karachi' }).format(new Date(d)); } catch { return ''; } };
const badgeFor = (t, served) => (served >= 10 ? t.badgeHero : served >= 5 ? t.badgeHeart : served >= 1 ? t.badgeNew : t.badgeNone);

// ---------- Logo ----------
// Inline SVG logo mark (redrawn 2026-11-13): an original drawing in the
// spirit of the Meal4Hope reference the user shared — an open hand holding
// a bowl with a heart rising above it. Site palette: teal hand, orange
// bowl, red heart. The hand is a cupped palm (wrist at the left edge) with
// three fingers curving up around the bowl's right side and a thumb rising
// on its left, so it reads as a hand at 40px and 72px — not a saucer.
// Crisp at any size, no external file. The header shows this mark only —
// no text title, no school line.
const LogoMark = () => (
  <svg className="logo-svg" viewBox="0 0 64 64" role="img" aria-label="Pay It Forward Meal">
    {/* Rising heart */}
    <path d="M32 30 C22 23 18 18.5 18 14 C18 10 21.5 7.5 25 7.5 C27.5 7.5 30 9 32 11.5 C34 9 36.5 7.5 39 7.5 C42.5 7.5 46 10 46 14 C46 18.5 42 23 32 30 Z" fill="#d64545" stroke="#172428" strokeWidth="2" strokeLinejoin="round" />
    {/* Bowl */}
    <path d="M14 33 h36 c0 9 -8 15 -18 15 s-18 -6 -18 -15 Z" fill="#f59e0b" stroke="#172428" strokeWidth="2" strokeLinejoin="round" />
    <ellipse cx="32" cy="33" rx="18" ry="3" fill="#fde9c8" stroke="#172428" strokeWidth="2" />
    {/* Open hand under the bowl — ONE silhouette, so it reads as a hand at
        any size: wrist entering from the left, a thumb rising on the bowl's
        left side, a palm cupping underneath, and three fingers curving up
        around the bowl's right side, the middle finger tallest, with deep
        valleys between the fingers so each one reads separately. */}
    <path d="M0 63 L0 56 C2 53 5 51 8 49 C9 45 10 40 12 38 C14 36 15 38 15 42 C15 46 16 48 18 48 C24 46 30 46 35 47 C37 47 38 44 39 40 C40 37 42 36 43 38 C44 42 45 47 47 48 C48 44 49 38 50 34 C51 31 53 31 54 34 C55 39 56 44 57 47 C58 43 59 39 60 38 C61 37 62 39 62 43 C62 48 61 54 59 58 C57 61 54 62 51 62 L6 63 Z" fill="#146b56" stroke="#172428" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

// ---------- Admin graphs (pure SVG, no new dependencies) ----------
// Grouped bars: donated (gold) vs served (green) per day, last 7 days.
const DailyBars = ({ daily }) => {
  const max = Math.max(1, ...daily.flatMap((d) => [d.donated, d.served]));
  const W = 560, H = 200, base = 170, pad = 10;
  const n = Math.max(1, daily.length);
  const gw = (W - 2 * pad) / n; // group width per day — every day fits inside the viewBox
  const bw = Math.min(24, Math.floor((gw - 12) / 2));
  const x0 = pad;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }} role="img">
      <line x1="10" y1={base} x2={W - 10} y2={base} stroke="#172428" strokeWidth="2" />
      {daily.map((d, i) => {
        const x = x0 + i * gw + (gw - (2 * bw + 4)) / 2;
        const hD = Math.round((d.donated / max) * 130);
        const hS = Math.round((d.served / max) * 130);
        return (
          <g key={d.day}>
            <rect x={x} y={base - hD} width={bw} height={hD} fill="#f4c35e" rx="4" />
            <rect x={x + bw + 4} y={base - hS} width={bw} height={hS} fill="#2e9e6b" rx="4" />
            <text x={x + bw + 2} y={base + 16} textAnchor="middle" fontSize="12" fontWeight="700" fill="#172428">{d.label}</text>
            <text x={x + bw + 2} y={base - Math.max(hD, hS) - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172428">{d.donated}/{d.served}</text>
          </g>
        );
      })}
    </svg>
  );
};


// Split a long label (e.g. a restaurant name) into two balanced lines so
// under-bar chart labels show the full name instead of truncating with "…".
const splitLabel = (name) => {
  const words = String(name || '').split(' ').filter(Boolean);
  if (words.length < 2) return [String(name || '')];
  let best = 1, bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(words.slice(0, i).join(' ').length - words.slice(i).join(' ').length);
    if (d < bestDiff) { bestDiff = d; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

// Weekly bars (Admin weekly report): donated (gold) vs served (green) per
// restaurant, last 7 days — same flat style as DailyBars, colours match the
// legend. Labels are the restaurant name, wrapped to two lines so the full
// name is readable under the bars.
const WeeklyBars = ({ rows }) => {
  const max = Math.max(1, ...rows.flatMap((r) => [r.donated7, r.served7]));
  const W = 560, H = 216, base = 170, pad = 10;
  const n = Math.max(1, rows.length);
  const gw = (W - 2 * pad) / n;
  const bw = Math.min(30, Math.floor((gw - 14) / 2));
  const x0 = pad;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }} role="img">
      <line x1="10" y1={base} x2={W - 10} y2={base} stroke="#172428" strokeWidth="2" />
      {rows.map((r, i) => {
        const x = x0 + i * gw + (gw - (2 * bw + 4)) / 2;
        const hD = Math.round((r.donated7 / max) * 130);
        const hS = Math.round((r.served7 / max) * 130);
        return (
          <g key={r.id}>
            <rect x={x} y={base - hD} width={bw} height={hD} fill="#f4c35e" rx="4" />
            <rect x={x + bw + 4} y={base - hS} width={bw} height={hS} fill="#2e9e6b" rx="4" />
            <text x={x + bw + 2} y={base + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="#172428">{splitLabel(r.name).map((ln, li) => (<tspan key={li} x={x + bw + 2} dy={li === 0 ? 0 : 14}>{ln}</tspan>))}</text>
            <text x={x + bw + 2} y={base - Math.max(hD, hS) - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172428">{r.donated7}/{r.served7}</text>
          </g>
        );
      })}
    </svg>
  );
};


// Monthly bars (Transparency page): donated (gold) vs served (green) per
// month, last 6 months, with a value axis and gridlines — same flat style
// as the Admin DailyBars, colours match the legend below the chart.
const MonthlyBars = ({ monthly }) => {
  const max = Math.max(1, ...monthly.flatMap((m) => [m.donated, m.served]));
  const gridMax = Math.max(5, Math.ceil(max / 5) * 5);
  const W = 640, H = 230, base = 190, padL = 36, padR = 10;
  const n = Math.max(1, monthly.length);
  const gw = (W - padL - padR) / n;
  const bw = Math.min(30, Math.floor((gw - 14) / 2));
  const y = (v) => base - Math.round((v / gridMax) * 140);
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((gridMax * i) / 4));
  const label = (m) => { try { return new Date(m.month + '-01T00:00:00').toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }); } catch { return m.month; } };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }} role="img">
      {ticks.map((tv) => (<g key={tv}><line x1={padL} y1={y(tv)} x2={W - padR} y2={y(tv)} stroke="#e5e7eb" strokeWidth="1" /><text x={padL - 6} y={y(tv) + 4} textAnchor="end" fontSize="11" fontWeight="700" fill="#4b5563">{tv}</text></g>))}
      <line x1={padL} y1={base} x2={W - padR} y2={base} stroke="#172428" strokeWidth="2" />
      {monthly.map((m, i) => {
        const x = padL + i * gw + (gw - (2 * bw + 4)) / 2;
        const hD = Math.round((m.donated / gridMax) * 140);
        const hS = Math.round((m.served / gridMax) * 140);
        return (
          <g key={m.month}>
            <rect x={x} y={base - hD} width={bw} height={hD} fill="#f4c35e" rx="4" />
            <rect x={x + bw + 4} y={base - hS} width={bw} height={hS} fill="#2e9e6b" rx="4" />
            <text x={x + bw + 2} y={base + 16} textAnchor="middle" fontSize="11" fontWeight="700" fill="#172428">{label(m)}</text>
            <text x={x + bw + 2} y={base - Math.max(hD, hS) - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172428">{m.donated}/{m.served}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Leaderboard charts (pure SVG/CSS, real data from /api/leaderboard):
// (a) horizontal gold bars — Top donors by meals SERVED, badge under each
// name; (b) vertical green bars — Top restaurants by meals served.
const DonorBars = ({ donors, t, badgeFor }) => {
  const max = Math.max(1, ...donors.map((d) => d.served));
  return (<div>{donors.map((d, i) => (
    <div key={i} style={{ margin: '12px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', alignItems: 'baseline' }}>
        <span><b>{i + 1}. {d.name}</b>{' '}<span className="badge">{badgeFor(t, d.served)}</span></span>
        <b>{d.served} {t.served}</b>
      </div>
      <div className="chart-bar-track"><div className="chart-bar-fill gold" style={{ width: Math.max(4, (d.served / max) * 100) + '%' }} /></div>
    </div>
  ))}</div>);
};
const RestServedBars = ({ rows }) => {
  const max = Math.max(1, ...rows.map((r) => r.served));
  const W = 560, H = 216, base = 170, pad = 10;
  const n = Math.max(1, rows.length);
  const gw = (W - 2 * pad) / n;
  const bw = Math.min(44, Math.floor(gw - 16));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }} role="img">
      <line x1="10" y1={base} x2={W - 10} y2={base} stroke="#172428" strokeWidth="2" />
      {rows.map((r, i) => {
        const x = pad + i * gw + (gw - bw) / 2;
        const h = Math.round((r.served / max) * 130);
        return (
          <g key={r.id}>
            <rect x={x} y={base - h} width={bw} height={h} fill="#2e9e6b" rx="4" />
            <text x={x + bw / 2} y={base + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill="#172428">{splitLabel(r.name).map((ln, li) => (<tspan key={li} x={x + bw / 2} dy={li === 0 ? 0 : 14}>{ln}</tspan>))}</text>
            <text x={x + bw / 2} y={base - h - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill="#172428">{r.served}</text>
          </g>
        );
      })}
    </svg>
  );
};

// Staff photo avatar: the uploaded photo, or teal initials when there is no photo yet.
const Avatar = ({ photo, name, size = 48 }) => (photo
  ? <img src={photo} alt={name || ''} className="avatar" style={{ width: size, height: size }} />
  : <span className="avatar avatar-initials" style={{ width: size, height: size }}>{(name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>);

export default function App() {
  const [page, setPage] = useState('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const [lang, setLang] = useState('en');
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [board, setBoard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [mostNeeded, setMostNeeded] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [filter, setFilter] = useState('All areas');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pifm_token') || '');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [isRegister, setIsRegister] = useState(false);
  const [donRest, setDonRest] = useState('');
  const [donQty, setDonQty] = useState(1);
  const [donMethod, setDonMethod] = useState('JazzCash');
  const [checkout, setCheckout] = useState(null);
  const [testMobile, setTestMobile] = useState('');
  const [mine, setMine] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [report, setReport] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', restaurant_id: '', photo: '', staffRole: 'Counter', phone: '' });
  const [adminCustomRole, setAdminCustomRole] = useState('');
  const [newRest, setNewRest] = useState({ name: '', area: '', meal_price_pkr: '', contact_email: '', contact_phone: '', owner_password: '', photo: '' });
  const [newAreaSel, setNewAreaSel] = useState('');
  const [newAreaOther, setNewAreaOther] = useState('');
  const [reqForm, setReqForm] = useState({ name: '', area: '', contact_email: '', contact_phone: '', owner_password: '', photo: '' });
  const [reqAreaSel, setReqAreaSel] = useState('');
  const [reqAreaOther, setReqAreaOther] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [priceEdit, setPriceEdit] = useState({ id: '', price: '' });
  const [reqStart, setReqStart] = useState('');
  const [reqEnd, setReqEnd] = useState('');
  // Restaurant owner team
  const [team, setTeam] = useState(null);
  const [ownerForm, setOwnerForm] = useState({ name: '', email: '', password: '', staffRole: 'Counter', photo: '', phone: '' });
  const [ownerCustomRole, setOwnerCustomRole] = useState('');
  // Menus, requests, receipts, detail view
  const [detailRest, setDetailRest] = useState(null);
  const [profileStaff, setProfileStaff] = useState(null);
  const [reqForm2, setReqForm2] = useState({ restaurantId: '', qty: 1, note: '' });
  const [reqSentInfo, setReqSentInfo] = useState(null);
  const [ownerMeals, setOwnerMeals] = useState([]);
  const [mealForm, setMealForm] = useState({ name: '', price: '' });
  const [editMeal, setEditMeal] = useState({ id: '', price: '' });
  const [ownerReqs, setOwnerReqs] = useState([]);
  const [ownerReceipts, setOwnerReceipts] = useState([]);
  const [staffReqs, setStaffReqs] = useState([]);
  // When the request lists were last refreshed (auto-refresh, see the effects below).
  const [reqsUpdatedAt, setReqsUpdatedAt] = useState(null);
  const [staffReceipt, setStaffReceipt] = useState(null);
  const [serveMealId, setServeMealId] = useState('');
  const [donMealId, setDonMealId] = useState('');
  const [adminMeals, setAdminMeals] = useState([]);
  const [adminReceipts, setAdminReceipts] = useState([]);
  const [adminReqs, setAdminReqs] = useState([]);
  const [joinMeals, setJoinMeals] = useState([]);
  const [joinOther, setJoinOther] = useState('');
  const [adminMealSel, setAdminMealSel] = useState([]);
  const [adminOther, setAdminOther] = useState('');
  const t = T[lang];
  // Meal word with correct singular/plural for the current language —
  // "1 meal" / "7 meals" (never "7 meal" or "7 meal(s)").
  const mw = (n) => (n === 1 ? t.mealOne : t.mealMany);

  const api = async (path, opts = {}) => {
    const res = await fetch(API + path, { ...opts, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const load = async () => {
    try {
      setStats(await api('/stats'));
      setRestaurants(await api('/restaurants'));
      setBoard(await api('/leaderboard'));
      setActivity(await api('/activity'));
      setMostNeeded(await api('/restaurants/most-needed').catch(() => null));
      if (token) {
        const me = await api('/me'); setUser(me.user);
        setMine(await api('/donations/mine').catch(() => []));
        setNotifs(await api('/notifications/mine').catch(() => []));
      }
    } catch (e) { if (!String(e.message).includes('Login')) setMsg(fmt(t.backendErr, { e: e.message })); }
  };
  useEffect(() => { load(); }, [token]);

  const loadAdmin = async (silent) => {
    try {
      setAdminData({
        overview: await api('/admin/overview'),
        all: await api('/restaurants/all'),
        users: await api('/admin/users'),
        requests: await api('/admin/requests'),
      });
      // Graphs load with the page (admin only) — no extra button needed.
      setReport(await api('/admin/report').catch(() => null));
      setAdminMeals(await api('/admin/meals').catch(() => []));
      setAdminReceipts(await api('/admin/receipts').catch(() => []));
      setAdminReqs(await api('/admin/meal-requests').catch(() => []));
      setReqsUpdatedAt(new Date());
    } catch (e) { if (!silent) setMsg(e.message); }
  };
  // Admin request lists auto-refresh every 20s while on the Admin page, so a
  // new meal request appears without a reload. The timer is cleared when the
  // page changes or the user logs out — it never polls in the background.
  useEffect(() => { if (page === 'admin' && user?.role === 'admin') { loadAdmin(); const id = setInterval(() => loadAdmin(true), 20000); return () => clearInterval(id); } }, [page, user]);
  useEffect(() => { if (page === 'transparency') { api('/transparency/monthly').then(setMonthly).catch(() => {}); } }, [page]);

  const loadTeam = async (silent) => {
    try {
      setTeam(await api('/restaurant/staff'));
      setOwnerMeals((await api('/restaurant/meals')).meals || []);
      setOwnerReqs(await api('/restaurant/requests').catch(() => []));
      setOwnerReceipts(await api('/restaurant/receipts').catch(() => []));
      setReqsUpdatedAt(new Date());
    } catch (e) { if (!silent) setMsg(e.message); }
  };
  // Owner request list auto-refreshes every 20s while on the Restaurant page.
  useEffect(() => { if (page === 'restaurant' && user?.role === 'owner') { loadTeam(); const id = setInterval(() => loadTeam(true), 20000); return () => clearInterval(id); } }, [page, user]);
  const loadStaffReqs = async () => {
    try { const r = await api('/restaurant/requests'); setStaffReqs(r); setReqsUpdatedAt(new Date()); } catch {}
  };
  // Staff request list auto-refreshes every 20s while on the Staff page.
  useEffect(() => { if (page === 'staff' && user && (user.role === 'staff' || user.role === 'admin')) { loadStaffReqs(); const id = setInterval(loadStaffReqs, 20000); return () => clearInterval(id); } }, [page, user]);

  const go = (p) => { setPage(p); setMsg(''); setMenuOpen(false); window.scrollTo(0, 0); };
  const dashPage = (u) => (u.role === 'admin' ? 'admin' : u.role === 'staff' ? 'staff' : u.role === 'owner' ? 'restaurant' : 'mine');
  const doAuth = async () => {
    try {
      const data = await api(isRegister ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('pifm_token', data.token); setToken(data.token); setUser(data.user);
      setMsg(fmt(t.welcome, { n: data.user.name, r: data.user.role }));
      go(dashPage(data.user));
    } catch (e) { setMsg(e.message); }
  };
  const printReceipt = (d) => {
    const rest = restaurants.find((r) => r.id === d.restaurant_id);
    const price = rest?.meal_price_pkr || 250;
    const amount = d.amount_pkr || (d.quantity * price);
    const donorName = user?.show_name === 0 ? t.anon : (user?.name || 'Donor');
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) { setMsg(t.popups); return; }
    w.document.write(`<html><head><title>${t.receiptTitle}</title></head><body style="font-family: sans-serif; max-width: 520px; margin: 30px auto; color: #111;"><h2>${t.receiptTitle}</h2><p>Pay It Forward Meal • SDG 1 + SDG 2</p><hr /><p><b>${t.receiptDonor}</b> ${donorName}</p><p><b>${t.receiptRest}</b> ${d.restaurantName}</p><p><b>${t.receiptMeals}</b> ${d.quantity}</p><p><b>${t.receiptServed}</b> ${d.served_qty}/${d.quantity}</p><p><b>${t.receiptAmount}</b> Rs ${amount}</p><p><b>${t.receiptMethod}</b> ${d.method} • <b>${t.receiptStatus}</b> ${d.payment_status}</p>${d.txn_ref ? `<p><b>${t.receiptTxn}</b> ${d.txn_ref}</p>` : ''}<p><b>${t.receiptDate}</b> ${fmtDate(d.created_at)}</p><hr /><p><small>${t.receiptNote}</small></p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const logout = () => { localStorage.removeItem('pifm_token'); setToken(''); setUser(null); setTeam(null); go('home'); };

  const doDonate = async () => {
    try {
      const r = await api('/payments/initiate', { method: 'POST', body: JSON.stringify({ restaurantId: donRest, quantity: donQty, method: donMethod, mealId: donMeal ? donMeal.id : undefined }) });
      setCheckout(r.checkout); setMsg(t.pendingMsg);
    } catch (e) { setMsg(e.message); }
  };
  const doSandboxPay = async () => {
    try {
      const r = await api('/payments/sandbox/confirm', { method: 'POST', body: JSON.stringify({ txnRef: checkout.txnRef }) });
      setStats(r.stats); setCheckout(null);
      setMine(await api('/donations/mine')); setRestaurants(await api('/restaurants'));
      setMsg(fmt(t.paidMsg, { n: checkout.amountPkr }));
      go('mine');
    } catch (e) { setMsg(e.message); }
  };
  const doSandboxCancel = async () => {
    try { await api('/payments/sandbox/cancel', { method: 'POST', body: JSON.stringify({ txnRef: checkout.txnRef }) }); } catch {}
    setCheckout(null); setMsg(t.cancelMsg);
  };
  const doServe = async () => {
    try {
      const r = await api('/serve', { method: 'POST', body: JSON.stringify({ restaurantId: user?.role === 'admin' ? restaurants[0]?.id : undefined, mealId: serveMealId || undefined }) });
      setStats(r.stats); setRestaurants(await api('/restaurants'));
      if (r.receipt) setStaffReceipt({ ...r.receipt, restaurantName: r.restaurant.name, servedBy: user?.name || '', servedToday: r.restaurant.served, availLeft: r.restaurant.available });
      setMsg(t.serveReceiptMsg);
      loadStaffReqs();
    } catch (e) { setMsg(e.message); }
  };
  // Staff photo: compulsory. Reads the chosen image (JPG/PNG, max 500KB)
  // into a data URL and stores it in the form; the server re-checks it.
  const onPhotoFile = (e, setForm, form) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith('image/')) { setMsg(t.photoType); e.target.value = ''; return; }
    if (f.size > 500 * 1024) { setMsg(t.photoTooLarge); e.target.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, photo: reader.result });
    reader.readAsDataURL(f);
  };
  const doAddStaff = async () => {
    if (!ownerForm.photo) { setMsg(t.photoRequired); return; }
    // Custom role: when "Other" is picked, the typed role is the role.
    const role = ownerForm.staffRole === '__other' ? ownerCustomRole.trim() : ownerForm.staffRole;
    if (!role) { setMsg(t.invalidRole); return; }
    if (ownerForm.phone && !validPhonePK(ownerForm.phone)) { setMsg(t.invalidPhone); return; }
    try {
      await api('/restaurant/staff', { method: 'POST', body: JSON.stringify({ ...ownerForm, staffRole: role }) });
      setOwnerForm({ name: '', email: '', password: '', staffRole: 'Counter', photo: '', phone: '' });
      setOwnerCustomRole('');
      setMsg(t.staffAdded); loadTeam();
    } catch (e) { setMsg(e.message || t.staffAddFail); }
  };
  const doRemoveStaff = async (id) => {
    try { await api(`/restaurant/staff/${id}`, { method: 'DELETE' }); setMsg(t.staffRemoved); loadTeam(); } catch (e) { setMsg(e.message); }
  };
  // ---- Meals (owner menu) ----
  const doAddMeal = async () => {
    try {
      await api('/restaurant/meals', { method: 'POST', body: JSON.stringify(mealForm) });
      setMealForm({ name: '', price: '' }); setMsg(t.mealAdded); loadTeam(); load();
    } catch (e) { setMsg(e.message); }
  };
  const doUpdateMeal = async (id) => {
    try {
      await api(`/restaurant/meals/${id}`, { method: 'PUT', body: JSON.stringify({ price: editMeal.price }) });
      setEditMeal({ id: '', price: '' }); setMsg(t.mealUpdated); loadTeam(); load();
    } catch (e) { setMsg(e.message); }
  };
  const doDeleteMeal = async (id) => {
    if (!window.confirm(t.mealDeleteConfirm)) return;
    try { await api(`/restaurant/meals/${id}`, { method: 'DELETE' }); setMsg(t.mealDeleted); loadTeam(); load(); } catch (e) { setMsg(e.message); }
  };
  const doToggleOpen = async () => {
    try {
      const r = await api('/restaurant/toggle-open', { method: 'POST' });
      setMsg(r.restaurant.is_open === 0 ? t.closedToday : t.openNow); loadTeam(); load();
    } catch (e) { setMsg(e.message); }
  };
  // ---- Anonymous meal requests (no identity anywhere) ----
  const doRequestMeal = async () => {
    try {
      const r = await api('/requests', { method: 'POST', body: JSON.stringify({ restaurantId: reqForm2.restaurantId, mealsNeeded: reqForm2.qty, note: reqForm2.note }) });
      const rest = restaurants.find((x) => String(x.id) === String(reqForm2.restaurantId));
      setReqSentInfo({ ...r.request, at: fmtDate(r.request.created_at), restaurantName: rest?.name || '' });
      setReqForm2({ restaurantId: '', qty: 1, note: '' });
      setMsg(t.reqSentShort);
    } catch (e) { setMsg(e.message); }
  };
  // ---- Request slip (printable): the code is what the person shows at the counter ----
  const printReqSlip = (slip) => {
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) { setMsg(t.popups); return; }
    w.document.write(`<html><head><title>${t.slipTitle}</title></head><body style="font-family: sans-serif; max-width: 520px; margin: 30px auto; color: #111;"><h2>${t.slipTitle}</h2><p>Pay It Forward Meal • SDG 1 + SDG 2</p><hr /><p><b>${t.receiptRest}</b> ${slip.restaurantName || ''}</p><p><b>${t.slipMeals}</b> ${slip.meals_needed}</p><p><b>${t.receiptDate}</b> ${slip.at || ''}</p><p style="font-size: 30px; font-weight: 900; letter-spacing: 2px;">${slip.code || ''}</p><p><b>${t.slipShow}</b></p><hr /><p><small>${t.receiptNote}</small></p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const doFulfilReq = async (id, after) => {
    try {
      const r = await api(`/restaurant/requests/${id}/fulfil`, { method: 'POST' });
      setStaffReceipt({ ...r.receipt, restaurantName: r.restaurant.name, servedBy: user?.name || '', servedToday: r.restaurant.served, availLeft: r.restaurant.available });
      setMsg(t.reqFulfilled); setStats(r.stats);
      if (after) after(); else { loadTeam(); loadStaffReqs(); }
      load();
    } catch (e) { setMsg(e.message); }
  };
  const doCancelReq = async (id, after) => {
    try {
      await api(`/restaurant/requests/${id}/cancel`, { method: 'POST' });
      setMsg(t.reqCancelled);
      if (after) after(); else { loadTeam(); loadStaffReqs(); }
    } catch (e) { setMsg(e.message); }
  };
  // ---- Serve receipt slip (printable, and saved on the server) ----
  const printServeReceipt = (rc) => {
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) { setMsg(t.popups); return; }
    w.document.write(`<html><head><title>${t.receiptServeTitle}</title></head><body style="font-family: sans-serif; max-width: 520px; margin: 30px auto; color: #111;"><h2>${t.receiptServeTitle}</h2><p>Pay It Forward Meal • SDG 1 + SDG 2</p><hr /><p><b>${t.receiptRest}</b> ${rc.restaurantName || ''}</p><p><b>${t.receiptMeal}</b> ${rc.meal_name}</p><p><b>${t.receiptQty}</b> ${rc.quantity}</p><p><b>${t.receiptPrice}</b> Rs ${rc.price_pkr}</p><p><b>${t.receiptTotal}</b> Rs ${rc.total_pkr}</p><p><b>${t.receiptServedBy}</b> ${rc.servedBy || ''}</p><p><b>${t.receiptDate}</b> ${fmtDate(rc.served_at)}</p><p><b>${t.receiptServedToday}</b> ${rc.servedToday ?? ''}</p><p><b>${t.receiptAvailLeft}</b> ${rc.availLeft ?? ''}</p><hr /><p><small>${t.receiptNote}</small></p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  // ---- Admin deletes (all confirmed in the UI first) ----
  const doDeleteRest = async (id, name) => {
    if (!window.confirm(`${t.delRestConfirm} (${name})`)) return;
    try { await api(`/admin/restaurants/${id}`, { method: 'DELETE' }); setMsg(t.restDeleted); loadAdmin(); load(); } catch (e) { setMsg(e.message); }
  };
  const doDeleteUser = async (id, name) => {
    if (!window.confirm(`${t.delUserConfirm} (${name})`)) return;
    try { await api(`/admin/users/${id}`, { method: 'DELETE' }); setMsg(t.userDeleted); loadAdmin(); } catch (e) { setMsg(e.message); }
  };
  const doDeleteAdminMeal = async (id) => {
    if (!window.confirm(t.mealDeleteConfirm)) return;
    try { await api(`/admin/meals/${id}`, { method: 'DELETE' }); setMsg(t.mealDeleted); loadAdmin(); load(); } catch (e) { setMsg(e.message); }
  };
  const selRest = restaurants.find((r) => String(r.id) === String(donRest));
  // Donate price: chosen meal on the menu, else the first menu meal, else the restaurant's own price.
  const donMeal = (selRest?.meals || []).find((m) => String(m.id) === String(donMealId)) || (selRest?.meals || [])[0] || null;
  const donPrice = donMeal ? donMeal.price_pkr : (selRest?.meal_price_pkr || 250);
  const isClosed = (r) => r && r.is_open === 0;
  const isLowStock = (r) => r && r.available <= 2 && r.available > 0;
  const reqExpired = (row) => row.status === 'pending' && (Date.now() - new Date(String(row.created_at).replace(' ', 'T') + 'Z').getTime() > 24 * 3600 * 1000);

  const areas = [t.allAreas, ...new Set(restaurants.map((r) => r.area))];
  const shown = restaurants.filter((r) => (filter === t.allAreas || r.area === filter) && (!onlyAvailable || r.available > 0));
  const myRest = restaurants.find((r) => r.id === user?.restaurant_id);
  // Header identity: exactly the name the account was registered with,
  // plus the role in brackets. Never substituted or looked up elsewhere:
  // the owner's registered name IS the restaurant name from the join form.
  const headerName = user ? `${user.name} (${user.role})` : '';
  const myDonated = mine.reduce((s, d) => s + d.quantity, 0);
  const myServed = mine.reduce((s, d) => s + (d.served_qty || 0), 0);
  const dailyOk = stats ? stats.donated - stats.served === stats.available : false;
  // Anonymous meal-request form (no login, no name, no phone) — shown on
  // Home and on the Finder. The restaurant sees only a number and a time.
  const requestFormCard = (
    <div className="card"><h3>{t.reqMealTitle}</h3>
      <p className="muted">{t.reqMealNote}</p>
      <label>{t.reqRest}</label>
      <select value={reqForm2.restaurantId} onChange={(e) => setReqForm2({ ...reqForm2, restaurantId: e.target.value })}>
        <option value="">{t.donateChoose}</option>
        {restaurants.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.area}) — {r.available} {t.available}{isClosed(r) ? ` • ${t.closedToday}` : ''}</option>))}
      </select>
      <label>{t.reqQty}</label>
      <div className="qty">{[1, 2, 3].map((n) => (<button key={n} className={reqForm2.qty === n ? 'active' : ''} onClick={() => setReqForm2({ ...reqForm2, qty: n })}>{n}</button>))}</div>
      <label>{t.reqNote}</label>
      <input value={reqForm2.note} onChange={(e) => setReqForm2({ ...reqForm2, note: e.target.value })} maxLength={200} />
      <button className="btn tomato" disabled={!reqForm2.restaurantId} onClick={doRequestMeal}>{t.reqSend}</button>
      {reqSentInfo && (
        <div className="card sandbox-card req-slip" style={{ marginTop: 12 }}>
          <h3>{t.slipTitle}</h3>
          <p><b>{t.receiptRest}</b> {reqSentInfo.restaurantName}</p>
          <p><b>{t.slipMeals}</b> {reqSentInfo.meals_needed}</p>
          <p><b>{t.receiptDate}</b> {reqSentInfo.at}</p>
          <p><b>{t.slipCode}</b> <span className="req-code">{reqSentInfo.code}</span></p>
          <p><b>{t.slipShow}</b></p>
          <button className="btn outline" onClick={() => printReqSlip(reqSentInfo)}>{t.printSlip}</button>
        </div>
      )}
    </div>
  );

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <header>
        <div className="wrap">
        <div className="brand"><LogoMark /></div>
        <div className="lang">
          {['en', 'ur', 'sd'].map((l) => (<button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : l === 'ur' ? 'اردو' : 'سنڌي'}</button>))}
          {' '}
          {user ? (<>
            <span className="whoami">👤 {headerName}</span>
            <button className="btn tomato" onClick={() => go(dashPage(user))}>{t.dashboard}</button>
            <button className="btn outline" onClick={logout}>{t.logout}</button>
          </>) : <button className="btn tomato" onClick={() => go('auth')}>{t.login}</button>}
        </div>
        <button className="menu-btn" aria-label={t.menu} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? '✕' : '☰'}</button>
        </div>
      </header>

      <nav className={menuOpen ? 'nav-open' : ''}>
        <div className="wrap navwrap">
        {['home', 'finder', 'donate', 'board', 'transparency'].map((p) => (
          <button key={p} className={page === p ? 'active' : ''} onClick={() => go(p)}>{t[p]}</button>
        ))}
        </div>
      </nav>

      <main>
        {msg && <div className="success">{msg}</div>}

        {page === 'home' && (
          <>
            <div className="hero">
              <div>
                <p><span className="eyebrow">{t.eyebrow}</span></p>
                <h2>{t.heroHead1} {t.heroHead2}</h2>
                <p className="lead">{t.heroLead}</p>
                <p className="muted">{t.oldLine}</p>
                <p><button className="btn tomato" onClick={() => go('donate')}>{t.donateBtn}</button>{' '}<button className="btn turmeric" onClick={() => go('finder')}>{t.findBtn}</button></p>
                <p className="muted">{t.needLine}</p>
                {stats && (<p>{stats.available > 0 ? (<><b>🍲 {fmt(t.availLine, { n: stats.available, m: mw(stats.available) })}</b></>) : (<><b>{t.noAvailLine}</b></>)}</p>)}
              </div>
              <div className="hero-art">
                <img src="/hero-photo.webp" alt={t.heroHead1 + ' ' + t.heroHead2} />
                <div className="glass-chip chip-left"><b>✅</b>{t.servedChip}</div>
                <div className="glass-chip amber chip-right"><b>{stats ? stats.available : 0}</b>{fmt(t.availChip, { m: mw(stats ? stats.available : 0) })}</div>
              </div>
            </div>
            <div className="card dashcard">
              <h3>{t.liveDash}</h3>
              <p className="muted">{t.liveNote}</p>
              {stats && (<div className="dash"><div><b>{stats.donated}</b><span>{t.donated}</span></div><div><b>{stats.served}</b><span>{t.served}</span></div><div><b>{stats.available}</b><span>{t.available}</span></div></div>)}
              {stats && (<div style={{ marginTop: 12 }}><p style={{ margin: '0 0 6px' }}><b>{fmt(t.goal, { n: stats.donated, g: PILOT_DONATION_GOAL })}</b></p><div className="goal-track"><div className="goal-fill" style={{ width: Math.min(100, Math.round((stats.donated / PILOT_DONATION_GOAL) * 100)) + '%' }} /></div><p className="muted" style={{ margin: '6px 0 0' }}>{fmt(t.goalPct, { p: Math.min(100, Math.round((stats.donated / PILOT_DONATION_GOAL) * 100)) })} • {fmt(t.goalServed, { n: stats.served })}{stats.donated >= PILOT_DONATION_GOAL ? ' • ' + t.goalReached : ''}</p></div>)}
              <h3 style={{ marginTop: 18 }}>{t.byRest}</h3>
              {restaurants.filter((r) => r.available > 0).map((r) => (<p key={r.id}>{r.name} <span className="badge badge-right">{r.available} {t.available}</span></p>))}
              {restaurants.filter((r) => r.available > 0).length === 0 && <p className="muted">{t.noRest}</p>}
            </div>
            <h3>{t.howTitle}</h3>
            <div className="grid3">
              <div className="card tilt"><div className="step-num">1</div><h3>{t.step1t}</h3><p>{t.step1d}</p></div>
              <div className="card tilt"><div className="step-num">2</div><h3>{t.step2t}</h3><p>{t.step2d}</p></div>
              <div className="card tilt"><div className="step-num">3</div><h3>{t.step3t}</h3><p>{t.step3d}</p></div>
            </div>
            <p className="muted" style={{ marginTop: 18 }}>{t.trust1} • {t.trust2} • {t.trust3}</p>
            {restaurants.some((r) => r.available <= 2) && (<div className="notice">{restaurants.filter((r) => r.available <= 2).map((r) => `${r.name}: ${fmt(t.lowStock, { n: r.available, m: mw(r.available) })}`).join(' • ')}</div>)}
            <p><button className="btn tomato" onClick={() => { if (mostNeeded) { setDonRest(String(mostNeeded.id)); } go('donate'); }}>{mostNeeded ? fmt(t.giveMostName, { n: mostNeeded.name }) : t.giveMost}</button></p>
            <div className="partner-banner"><div><h3>{t.partnerTitle}</h3><p>{t.partnerText}</p></div><button className="btn turmeric" onClick={() => go('request')}>{t.partnerBtn}</button></div>
            {requestFormCard}
            <div className="card"><h3>{t.activityTitle}</h3>
              {activity.slice(0, 6).map((a, i) => (<p key={i}>{a.type === 'served' ? t.activityServed : fmt(t.activityDonated, { n: a.donor, q: a.qty })} {fmt(t.activityAt, { n: a.restaurant })}</p>))}
              {activity.length === 0 && <p className="muted">{t.activityNone}</p>}
            </div>
          </>
        )}

        {page === 'finder' && (
          <div>
            <h2>{t.finderTitle}</h2>
            <div className="card callout"><b>{t.finderNote}</b></div>
            <label>{t.finderArea}</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>{areas.map((a) => (<option key={a}>{a}</option>))}</select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}><input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> {t.finderOnly}</label>
            <div className="grid3">
              {shown.map((r) => (
                <div className="card finder-card" key={r.id} onClick={() => setDetailRest(r)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setDetailRest(r); }}>
                  {r.photo && <img src={r.photo} alt="" className="finder-thumb" />}
                  <h3 className="finder-head"><span className="finder-name">{r.name}</span> {isClosed(r) ? <span className="badge warn badge-right">{t.closedToday}</span> : <span className={(r.available <= 2 ? 'badge warn' : 'badge') + ' badge-right'}>{r.available <= 1 ? fmt(t.finderUrgent, { n: r.available }) : r.available === 2 ? fmt(t.lowStockBadge, { n: r.available }) : fmt(t.finderMeals, { n: r.available, m: mw(r.available) })}</span>}{(r.staff || []).length > 0 && (<span className="staff-icons">{(r.staff || []).slice(0, 3).map((s) => (<Avatar key={s.id} photo={s.photo} name={s.name} size={34} />))}{(r.staff || []).length > 3 && <span className="avatar avatar-initials" style={{ width: 34, height: 34 }}>+{(r.staff || []).length - 3}</span>}</span>)}</h3>
                  <p>{r.area} • {r.meal}<br />{r.timings} • {fmt(t.finderPerMeal, { n: r.meal_price_pkr || 250 })}</p>
                  <p className="muted">{fmt(t.finderServed, { n: r.served })}</p>
                  {!isClosed(r) && r.available === 1 && <p className="hope-line">{t.hopeLine1}</p>}
                  {!isClosed(r) && r.available === 2 && <p className="hope-line">{t.hopeLine2}</p>}
                </div>
              ))}
            </div>
            {shown.length === 0 && <p>{onlyAvailable ? t.finderEmptyAvail : t.finderEmptyArea}</p>}
            <p className="muted">{t.finderNoLogin}</p>
            {requestFormCard}
            {detailRest && (
              <div className="modal-overlay" onClick={() => setDetailRest(null)}>
                <div className="card modal" onClick={(e) => e.stopPropagation()}>
                  <button className="btn small outline modal-close" onClick={() => setDetailRest(null)}>✕ {t.detailClose}</button>
                  {detailRest.photo ? <img src={detailRest.photo} alt={detailRest.name} className="detail-photo" /> : (<div className="detail-photo-placeholder"><LogoMark /><span>{t.photoSoon}</span></div>)}
                  <h2>{detailRest.name}</h2>
                  <p>{detailRest.area} • {detailRest.timings}</p>
                  <p>{isClosed(detailRest) ? <span className="badge warn">{t.closedToday}</span> : <span className="badge">{fmt(t.finderMeals, { n: detailRest.available, m: mw(detailRest.available) })}</span>} <span className="badge">{fmt(t.finderServed, { n: detailRest.served })}</span></p>
                  {!isClosed(detailRest) && detailRest.available === 1 && <p className="hope-line">{t.hopeLine1}</p>}
                  {!isClosed(detailRest) && detailRest.available === 2 && <p className="hope-line">{t.hopeLine2}</p>}
                  <p><a className="btn small outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailRest.name + ', ' + detailRest.area)}`} target="_blank" rel="noreferrer">📍 {t.mapBtn}</a></p>
                  <h3>{t.detailMenu}</h3>
                  {(detailRest.meals || []).length > 0 ? detailRest.meals.map((m) => (<p key={m.id}>{m.name} — <b>Rs {m.price_pkr}</b></p>)) : <p className="muted">{detailRest.meal} — Rs {detailRest.meal_price_pkr || 250}</p>}
                  <h3>{t.detailStaff}</h3>
                  {(detailRest.staff || []).length > 0 ? detailRest.staff.map((s) => (<div className="staff-row clickable" key={s.id} onClick={() => setProfileStaff({ staff: s, restaurantName: detailRest.name })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setProfileStaff({ staff: s, restaurantName: detailRest.name }); }}><Avatar photo={s.photo} name={s.name} size={48} /><span className="who"><b>{s.name}</b></span> <span className="badge">{s.staff_role || t.roleCounter}</span></div>)) : <p className="muted">{t.teamNone}</p>}
                  <p className="muted">{t.claimNote}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {page === 'donate' && (
          <div className="grid">
            <div className="card">
              <h2>{t.donateTitle}</h2>
              {!user && <p className="notice" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span>{t.donateLoginFirst}</span><button className="btn small tomato" onClick={() => go('auth')}>{t.login}</button></p>}
              <p><button className="btn small turmeric" onClick={() => { if (mostNeeded) { setDonRest(String(mostNeeded.id)); setMsg(fmt(t.donateMostName, { n: mostNeeded.name, m: mostNeeded.available })); } }}>{mostNeeded ? fmt(t.donateMostName, { n: mostNeeded.name, m: mostNeeded.available }) : t.donateMost}</button></p>
              <label>{t.donateRest}</label>
              <select value={donRest} onChange={(e) => { setDonRest(e.target.value); setDonMealId(''); }}><option value="">{t.donateChoose}</option>{restaurants.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.area}) — Rs {r.meal_price_pkr || 250}/{t.donateVerified}{isClosed(r) ? ` • ${t.closedToday}` : ''}</option>))}</select>
              {selRest && (selRest.meals || []).length > 0 && (<><label>{t.menuTitle}</label><select value={donMeal ? donMeal.id : ''} onChange={(e) => setDonMealId(e.target.value)}>{(selRest.meals || []).map((m) => (<option key={m.id} value={m.id}>{m.name} — Rs {m.price_pkr}</option>))}</select></>)}
              {selRest && isClosed(selRest) && <p className="notice">{t.closedMsg}</p>}
              <label>{t.donateQty}</label>
              <div className="qty">{[1, 2, 5].map((n) => (<button key={n} className={donQty === n ? 'active' : ''} onClick={() => setDonQty(n)}>{n}</button>))}
                <input type="number" min="1" max="10" value={donQty} onChange={(e) => setDonQty(parseInt(e.target.value, 10) || 1)} style={{ width: 90 }} /> <span className="muted">{t.donateCustom}</span></div>
              <label>{t.donateMethod}</label>
              <div className="method">{[{ name: 'JazzCash', icon: '📱', sub: t.methodWallet }, { name: 'Easypaisa', icon: '💚', sub: t.methodWallet }, { name: 'Card', icon: '💳', sub: t.methodCard }].map((m) => (<button key={m.name} className={donMethod === m.name ? 'active' : ''} onClick={() => setDonMethod(m.name)}><span>{m.icon} {m.name}{donMethod === m.name ? ' ✓' : ''}</span><small>{m.sub}</small></button>))}</div>
            </div>
            <div className="card">
              <h3>{t.summary}</h3>
              {donRest && selRest ? (<p>{t.summaryMeals} <b>{donQty}</b> • {t.summaryMethod} <b>{donMethod}</b> • {t.summaryPrice} <b>Rs {donQty * donPrice}</b> (Rs {donPrice} {donMeal ? `${donMeal.name} — ` : ''}{fmt(t.summaryPerMeal, { n: selRest.name })})</p>) : (<p className="muted">{t.summaryChoose}</p>)}
              <p className="notice">{t.testMode}</p>
              <button className="btn tomato" disabled={!user || !donRest || (selRest && isClosed(selRest))} onClick={doDonate}>{t.continueBtn}</button>
              <p className="muted">{t.statusNote}</p>
              {checkout && (
                <div className="card sandbox-card">
                  <h3>{fmt(t.sandboxTitle, { n: checkout.gateway })}</h3>
                  <p>{fmt(t.sandboxPay, { n: checkout.amountPkr, q: donQty, m: mw(donQty) })} • {t.sandboxTxn} <b>{checkout.txnRef}</b></p>
                  <p className="muted">{t.sandboxNote}</p>
                  <label>{t.sandboxMobile}</label>
                  <input value={testMobile} onChange={(e) => setTestMobile(e.target.value)} placeholder="03XX-XXXXXXX" />
                  <button className="btn tomato" onClick={doSandboxPay}>{fmt(t.sandboxPayBtn, { n: checkout.amountPkr })}</button>{' '}
                  <button className="btn outline" onClick={doSandboxCancel}>{t.sandboxCancel}</button>
                </div>
              )}
            </div>
          </div>
        )}

        {page === 'mine' && (
          <div>
            <h2>{t.mineTitle}</h2>
            {user && <p><button className="btn small outline" onClick={logout}>{t.logout}</button> <span className="muted">{fmt(t.signedIn, { n: user.name, r: user.role })}</span></p>}
            {!user && <p className="notice">{t.mineLogin}</p>}
            {user && (<>
              <div className="stats"><div className="stat"><b>{myDonated}</b>{t.mineDonated}</div><div className="stat orange"><b>{myServed}</b>{t.mineServed}</div><div className="stat"><b>{myDonated - myServed}</b>{t.mineAvail}</div></div>
              <p><b>{t.yourBadge}</b> {myServed >= 1 ? (<span className="badge">{badgeFor(t, myServed)}</span>) : badgeFor(t, myServed)}</p>
              <p><label><input type="checkbox" style={{ width: 'auto' }} checked={user.show_name !== 0} onChange={async (e) => { const data = await api('/me/privacy', { method: 'POST', body: JSON.stringify({ showName: e.target.checked }) }); setUser(data.user); load(); }} /> {t.privacy}</label></p>
              <div className="card"><h3>{t.donationsTitle}</h3>{mine.map((d) => (<p key={d.id}>{fmt(t.mealsAt, { q: d.quantity, n: d.restaurantName, m: mw(d.quantity) })} • {fmt(t.servedOf, { s: d.served_qty, q: d.quantity })} • {d.method} • {d.payment_status}{d.txn_ref ? ` • ${d.txn_ref}` : ''} <button className="btn small outline" onClick={() => printReceipt(d)}>{t.printReceipt}</button></p>))}{mine.length === 0 && <p className="muted">{t.noDonations}</p>}</div>
              <div className="card"><h3>{t.messagesTitle}</h3>{notifs.map((n) => (<div className="notif" key={n.id}>{n.message} <button className="btn small outline" onClick={async () => { await api(`/notifications/${n.id}/read`, { method: 'POST' }); setNotifs(await api('/notifications/mine')); }}>{t.markRead}</button> {n.is_read ? t.readMark : ''}</div>))}{notifs.length === 0 && <p className="muted">{t.noMessages}</p>}</div>
            </>)}
          </div>
        )}

        {page === 'staff' && (
          <div className="card" style={{ maxWidth: 620, margin: '14px auto' }}>
            <h2>{t.staffTitle} — {myRest ? myRest.name : t.staffNoRest}</h2>
            {user && <p><button className="btn small outline" onClick={logout}>{t.logout}</button> <span className="muted">{fmt(t.signedIn, { n: user.name, r: user.role })}</span></p>}
            {(!user || (user.role !== 'staff' && user.role !== 'admin')) && <p className="notice">{t.staffLogin}</p>}
            {user && (user.role === 'staff' || user.role === 'admin') && (<>
              <p className="muted" style={{ textAlign: 'center' }}>{t.staffAvail}</p>
              <div className="big-number">{myRest ? myRest.available : (restaurants[0]?.available ?? 0)}</div>
              {myRest && isLowStock(myRest) && <p className="notice">{fmt(t.lowStock, { n: myRest.available, m: mw(myRest.available) })}</p>}
              {myRest && isClosed(myRest) && <p className="notice">{t.closedServe}</p>}
              {(myRest?.meals || []).length > 0 && (<><label>{t.serveMealLabel}</label><select value={serveMealId || (myRest.meals[0]?.id || '')} onChange={(e) => setServeMealId(e.target.value)}>{(myRest.meals || []).map((m) => (<option key={m.id} value={m.id}>{m.name} — Rs {m.price_pkr}</option>))}</select></>)}
              <button className="btn teal-lg" disabled={myRest && isClosed(myRest)} onClick={doServe}>{t.serveBtn}</button>
              {staffReceipt && (<div className="card sandbox-card" style={{ marginTop: 14 }}>
                <h3>{t.receiptServeTitle}</h3>
                <p><b>{t.receiptRest}</b> {staffReceipt.restaurantName}</p>
                <p><b>{t.receiptMeal}</b> {staffReceipt.meal_name} • <b>{t.receiptQty}</b> {staffReceipt.quantity} • <b>{t.receiptPrice}</b> Rs {staffReceipt.price_pkr} • <b>{t.receiptTotal}</b> Rs {staffReceipt.total_pkr}</p>
                <p><b>{t.receiptServedBy}</b> {staffReceipt.servedBy} • <b>{t.receiptDate}</b> {fmtDate(staffReceipt.served_at)}</p>
                <p><b>{t.receiptServedToday}</b> {staffReceipt.servedToday} • <b>{t.receiptAvailLeft}</b> {staffReceipt.availLeft}</p>
                <button className="btn outline" onClick={() => printServeReceipt(staffReceipt)}>{t.printSlip}</button>
              </div>)}
              <div className="grid" style={{ marginTop: 14 }}>
                <div className="card"><span className="muted">{t.servedTotal}</span><div><b className="served-number">{myRest ? myRest.served : (restaurants[0]?.served ?? 0)}</b></div></div>
                <div className="card"><span className="muted">{t.restLabel}</span><div><b>{myRest ? myRest.name : restaurants[0]?.name}</b></div></div>
              </div>
              <p className="muted">{t.serveNote}</p>
              <div className="card"><h3>{t.reqPending} <button className="btn small outline" onClick={() => loadStaffReqs()}>{t.refreshBtn}</button></h3>
                {reqsUpdatedAt && <p className="muted">{fmt(t.updatedAt, { t: fmtTime(reqsUpdatedAt) })}</p>}
                {staffReqs.filter((q) => q.status === 'pending').map((q) => (
                  <p key={q.id}>{fmt(t.reqSentLine, { n: q.meals_needed, t: fmtDate(q.created_at), m: mw(q.meals_needed) })}{q.code ? (<> • <b>{t.reqCodeLabel} {q.code}</b></>) : ''}{q.note ? ` — ${q.note}` : ''} {reqExpired(q) ? <span className="badge warn">{t.reqExpired}</span> : <><button className="btn small tomato" onClick={() => doFulfilReq(q.id)}>{t.reqFulfil}</button>{' '}<button className="btn small outline" onClick={() => doCancelReq(q.id)}>{t.reqCancel}</button></>}</p>
                ))}
                {staffReqs.filter((q) => q.status === 'pending').length === 0 && <p className="muted">{t.reqNone}</p>}
              </div>
            </>)}
          </div>
        )}

        {page === 'restaurant' && (
          <div>
            <h2>{t.restTitle}</h2>
            {user && <p><button className="btn small outline" onClick={logout}>{t.logout}</button> <span className="muted">{fmt(t.signedIn, { n: user.name, r: user.role })}</span></p>}
            {(!user || user.role !== 'owner') && <p className="notice">{t.restLogin}</p>}
            {user?.role === 'owner' && (<>
              {team?.restaurant && (<div className="card">
                <h3>{team.restaurant.name} — {team.restaurant.is_open === 0 ? <span className="badge warn">{t.closedToday}</span> : <span className="badge">{t.openNow}</span>}</h3>
                {team.restaurant.available <= 2 && <p className="notice">{fmt(t.lowStock, { n: team.restaurant.available, m: mw(team.restaurant.available) })}</p>}
                <p><button className="btn outline" onClick={doToggleOpen}>{team.restaurant.is_open === 0 ? t.toggleOpen : t.toggleClose}</button></p>
              </div>)}
              <div className="grid">
                <div className="card"><h3>{t.menuTitle}</h3>
                  {ownerMeals.map((m) => (
                    <div className="staff-row" key={m.id}><span className="who"><b>{m.name}</b> — Rs {m.price_pkr}</span>
                      <input type="number" min="10" max="2000" style={{ width: 110, margin: 0 }} value={editMeal.id === m.id ? editMeal.price : m.price_pkr} onChange={(e) => setEditMeal({ id: m.id, price: e.target.value })} />
                      <button className="btn small outline" onClick={() => doUpdateMeal(m.id)}>{t.saveBtn}</button>
                      <button className="btn small danger" onClick={() => doDeleteMeal(m.id)}>{t.delMealBtn}</button>
                    </div>
                  ))}
                  {ownerMeals.length === 0 && <p className="muted">{t.menuNone}</p>}
                  <label>{t.mealName}</label><input value={mealForm.name} onChange={(e) => setMealForm({ ...mealForm, name: e.target.value })} placeholder="e.g. Chicken Biryani" />
                  <label>{t.mealPrice}</label><input type="number" min="10" max="2000" value={mealForm.price} onChange={(e) => setMealForm({ ...mealForm, price: e.target.value })} placeholder="250" />
                  <button className="btn tomato" onClick={doAddMeal}>{t.addMealBtn}</button>
                </div>
                <div className="card"><h3>{t.reqPending} <button className="btn small outline" onClick={() => loadTeam()}>{t.refreshBtn}</button></h3>
                  {reqsUpdatedAt && <p className="muted">{fmt(t.updatedAt, { t: fmtTime(reqsUpdatedAt) })}</p>}
                  {ownerReqs.filter((q) => q.status === 'pending').map((q) => (
                    <p key={q.id}>{fmt(t.reqSentLine, { n: q.meals_needed, t: fmtDate(q.created_at), m: mw(q.meals_needed) })}{q.code ? (<> • <b>{t.reqCodeLabel} {q.code}</b></>) : ''}{q.note ? ` — ${q.note}` : ''} {reqExpired(q) ? <span className="badge warn">{t.reqExpired}</span> : <><button className="btn small tomato" onClick={() => doFulfilReq(q.id, loadTeam)}>{t.reqFulfil}</button>{' '}<button className="btn small outline" onClick={() => doCancelReq(q.id, loadTeam)}>{t.reqCancel}</button></>}</p>
                  ))}
                  {ownerReqs.filter((q) => q.status === 'pending').length === 0 && <p className="muted">{t.reqNone}</p>}
                  <h3 style={{ marginTop: 16 }}>{t.receiptsTitle}</h3>
                  {ownerReceipts.slice(0, 10).map((rc) => (
                    <p key={rc.id}>{fmtDate(rc.served_at)} — {rc.meal_name} × {rc.quantity} — Rs {rc.total_pkr} ({rc.servedBy || ''}) <button className="btn small outline" onClick={() => printServeReceipt({ ...rc, restaurantName: team?.restaurant?.name || '', servedToday: '', availLeft: '' })}>{t.printSlip}</button></p>
                  ))}
                  {ownerReceipts.length === 0 && <p className="muted">{t.receiptsNone}</p>}
                </div>
              </div>
              <div className="grid">
                <div className="card"><h3>{t.teamTitle} {team ? `• ${fmt(t.teamMembers, { n: team.staff.length })}` : ''}</h3>
                  <p className="muted">{team?.restaurant ? `${team.restaurant.name} — ${team.restaurant.area}` : ''}</p>
                  {team?.staff.map((s) => (<div className="staff-row clickable" key={s.id} onClick={() => setProfileStaff({ staff: s, restaurantName: team.restaurant.name })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setProfileStaff({ staff: s, restaurantName: team.restaurant.name }); }}><Avatar photo={s.photo} name={s.name} size={48} /><span className="who"><b>{s.name}</b> — {s.email}</span> <span className="badge">{s.staff_role || t.roleCounter}</span> <span className="badge">● {t.active}</span> <button className="btn small danger" onClick={(e) => { e.stopPropagation(); doRemoveStaff(s.id); }}>{t.removeBtn}</button></div>))}
                  {team && team.staff.length === 0 && <p className="muted">{t.teamNone}</p>}
                  {!team && <p className="muted">{t.adminLoading}</p>}
                </div>
                <div className="card"><h3>{t.addStaffTitle}</h3>
                  <p className="muted">{t.addStaffNote}</p>
                  <label>{t.fullName}</label><input value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} placeholder="e.g. Fatima Noor" />
                  <label>{t.phoneEmail}</label><input value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} placeholder="name@example.com" />
                  <label>{t.password}</label><input type="password" value={ownerForm.password} onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })} />
                  <label>{t.staffPhoneLabel}</label><input value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} placeholder="0300-1234567" />
                  <p className="muted">{t.staffPhoneNote}</p>
                  <label>{t.photoLabel}</label>
                  <input type="file" accept="image/*" onChange={(e) => onPhotoFile(e, setOwnerForm, ownerForm)} />
                  {ownerForm.photo && <img src={ownerForm.photo} alt="" className="avatar-preview" />}
                  <p className="muted">{t.photoHint}</p>
                  <label>{t.roleLabel}</label>
                  <select value={ownerForm.staffRole} onChange={(e) => setOwnerForm({ ...ownerForm, staffRole: e.target.value })}>
                    <option value="Counter">{t.roleCounter}</option><option value="Kitchen">{t.roleKitchen}</option><option value="Manager">{t.roleManager}</option><option value="__other">{t.roleOther}</option>
                  </select>
                  {ownerForm.staffRole === '__other' && (<><label>{t.roleCustom}</label><input value={ownerCustomRole} onChange={(e) => setOwnerCustomRole(e.target.value)} placeholder={t.roleCustomPh} maxLength={40} /></>)}
                  <button className="btn tomato" onClick={doAddStaff}>{t.addBtn}</button>
                </div>
              </div>
              <div className="card"><h3>{t.permTitle}</h3>
                <p>👑 <b>{t.roleOwner}</b> — {t.permOwner}</p>
                <p>🧑‍💼 <b>{t.roleManager}</b> — {t.permManager}</p>
                <p>🧾 <b>{t.roleCounter}</b> — {t.permCounter}</p>
                <p>👨‍🍳 <b>{t.roleKitchen}</b> — {t.permKitchen}</p>
              </div>
            </>)}
          </div>
        )}

        {page === 'admin' && (
          <div>
            <h2>{t.adminTitle}</h2>
            {user?.role === 'admin' && <p><button className="btn small outline" onClick={logout}>{t.logout}</button> <span className="muted">{fmt(t.signedIn, { n: user.name, r: 'admin' })}</span></p>}
            {(!user || user.role !== 'admin') && <p className="notice">{t.adminLogin}</p>}
            {user?.role === 'admin' && !adminData && <p className="muted">{t.adminLoading}</p>}
            {user?.role === 'admin' && adminData && (<>
              <div className="grid3">
                <div className="card"><h3>{t.dailyTitle}</h3><p>{t.dailyText}</p><p>{stats.donated} − {stats.served} <span className={dailyOk ? 'badge' : 'badge warn'}>= {stats.available}, {dailyOk ? t.matches : t.mismatch}</span></p><p className="muted">{fmt(t.overviewLine, { u: adminData.overview.users, d: adminData.overview.donations, p: adminData.overview.pendingRequests })}</p></div>
                <div className="card"><h3>{t.verifyTitle}</h3>{adminData.all.filter((r) => !r.verified).map((r) => (<p key={r.id}>{r.name} — {r.area} <button className="btn small tomato" onClick={async () => { await api('/admin/verify', { method: 'POST', body: JSON.stringify({ restaurantId: r.id }) }); loadAdmin(); load(); }}>{t.verifyBtn}</button></p>))}{adminData.all.filter((r) => !r.verified).length === 0 && <p className="muted">{fmt(t.noUnverified, { n: adminData.all.length })}</p>}</div>
                <div className="card"><h3>{t.reqTitle}</h3>{adminData.requests.map((q) => (<p key={q.id}>{q.name} — {q.area} ({q.status}) {q.status === 'pending' && (<><button onClick={async () => { try { const r = await api(`/admin/requests/${q.id}/approve`, { method: 'POST' }); if (r.tempPassword) setMsg(fmt(t.ownerTempPass, { p: r.tempPassword })); else if (r.ownerCreated) setMsg(fmt(t.ownerCreated, { e: r.ownerEmail })); else setMsg(r.ownerNote || t.ownerExists); } catch (e) { setMsg(e.message); } loadAdmin(); load(); }}>{t.approveBtn}</button>{' '}<button onClick={async () => { await api(`/admin/requests/${q.id}/reject`, { method: 'POST' }); loadAdmin(); }}>{t.rejectBtn}</button></>)}</p>))}{adminData.requests.length === 0 && <p className="muted">{t.noReq}</p>}</div>
              </div>
              {report && report.daily && (
                <div className="card"><h3>{t.gTitle}</h3>
                  <p className="muted">{t.gNote}</p>
                  <div className="chart-tiles">
                    <div className="chart-tile"><b>{stats.donated}</b><span>{t.donated}</span></div>
                    <div className="chart-tile"><b>{stats.served}</b><span>{t.served}</span></div>
                    <div className="chart-tile"><b>{stats.available}</b><span>{t.available}</span></div>
                    <div className="chart-tile"><b>{stats.donated ? Math.round((stats.served / stats.donated) * 100) : 0}%</b><span>{t.gServedPct}</span></div>
                  </div>
                  <h3 style={{ marginTop: 18 }}>{t.gDaily}</h3>
                  <p className="legend"><span className="dot dot-gold"></span> {t.gDonated} <span className="dot dot-green"></span> {t.gServed}</p>
                  <DailyBars daily={report.daily} />
                  <h3 style={{ marginTop: 18 }}>{t.gAvail}</h3>
                  {report.rows.map((r) => (
                    <div className="chart-bar-row" key={r.id}>
                      <span className="lbl">{r.name}</span>
                      <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: Math.min(100, (r.available / Math.max(1, ...report.rows.map((x) => x.available))) * 100) + '%' }} /></div>
                      <b>{r.available}</b>
                    </div>
                  ))}
                </div>
              )}
              <div className="card"><h3>{t.weeklyTitle}</h3>
                <p className="muted">{t.weeklyNote}</p>
                <button className="btn tomato" onClick={async () => { try { setReport(await api('/admin/report')); } catch (e) { setMsg(e.message); } }}>{t.loadReport}</button>{' '}
                {report && (<button className="btn outline" onClick={() => { const rows = [['Restaurant', 'Area', 'Donated (last 7 days)', 'Served (last 7 days)', 'Available now', 'Served total']]; report.rows.forEach((r) => rows.push([r.name, r.area, r.donated7, r.served7, r.available, r.servedTotal])); rows.push(['TOTAL', '', report.totals.donated7, report.totals.served7, report.totals.available, report.totals.servedTotal]); const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'pay-it-forward-weekly-report.csv'; a.click(); }}>{t.downloadCsv}</button>)}
                {report && (<div style={{ marginTop: 12 }}>
                  <h3 style={{ marginTop: 4 }}>{t.weeklyChart}</h3>
                  <p className="legend"><span className="dot dot-gold"></span> {t.gDonated} <span className="dot dot-green"></span> {t.gServed}</p>
                  <WeeklyBars rows={report.rows} />
                </div>)}
                {report && (<div style={{ marginTop: 12 }}>{report.rows.map((r) => (<p key={r.id}>{fmt(t.weeklyRow, { n: r.name, d: r.donated7, s: r.served7, a: r.available, t: r.servedTotal })}</p>))}<p><b>{fmt(t.weeklyTotal, { d: report.totals.donated7, s: report.totals.served7, a: report.totals.available })}</b></p></div>)}
              </div>
              <div className="card"><h3>{t.pricesTitle}</h3>
                {adminData.all.map((r) => (<p key={r.id}>{r.name} — {fmt(t.pricePerMeal, { n: r.meal_price_pkr || 250 })} {r.verified ? '' : t.unverified}{r.is_open === 0 ? ` • ${t.closedToday}` : ''} <button className="btn small outline" onClick={async () => { await api(`/admin/restaurants/${r.id}/toggle-open`, { method: 'POST' }); loadAdmin(); load(); }}>{r.is_open === 0 ? t.toggleOpen : t.toggleClose}</button> <button className="btn small danger" onClick={() => doDeleteRest(r.id, r.name)}>{t.delRestBtn}</button></p>))}
                <label>{t.restLabel}</label><select value={priceEdit.id} onChange={(e) => setPriceEdit({ ...priceEdit, id: e.target.value })}><option value="">{t.chooseRest}</option>{adminData.all.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</select>
                <label>{t.newPrice}</label><input type="number" min="50" max="2000" value={priceEdit.price} onChange={(e) => setPriceEdit({ ...priceEdit, price: e.target.value })} />
                <button className="btn tomato" onClick={async () => { try { await api(`/admin/restaurants/${priceEdit.id}/price`, { method: 'POST', body: JSON.stringify({ mealPricePkr: priceEdit.price }) }); setMsg(t.priceSaved); loadAdmin(); load(); } catch (e) { setMsg(e.message); } }}>{t.savePrice}</button>
              </div>
              <div className="card"><h3>{t.adminMealsTitle}</h3>
                {adminMeals.map((m) => (<p key={m.id}>{m.restaurantName} — {m.name} — Rs {m.price_pkr} <button className="btn small danger" onClick={() => doDeleteAdminMeal(m.id)}>{t.delMealBtn}</button></p>))}
                {adminMeals.length === 0 && <p className="muted">{t.menuNone}</p>}
              </div>
              <div className="card"><h3>{t.adminReceiptsTitle}</h3>
                {adminReceipts.slice(0, 10).map((rc) => (<p key={rc.id}>{fmtDate(rc.served_at)} — {rc.restaurantName} — {rc.meal_name} × {rc.quantity} — Rs {rc.total_pkr} ({rc.servedBy || ''})</p>))}
                {adminReceipts.length === 0 && <p className="muted">{t.receiptsNone}</p>}
              </div>
              <div className="card"><h3>{t.adminReqsTitle} <button className="btn small outline" onClick={() => loadAdmin()}>{t.refreshBtn}</button></h3>
                {reqsUpdatedAt && <p className="muted">{fmt(t.updatedAt, { t: fmtTime(reqsUpdatedAt) })}</p>}
                {adminReqs.map((q) => (<p key={q.id}>{q.restaurantName} — {fmt(t.reqSentLine, { n: q.meals_needed, t: fmtDate(q.created_at), m: mw(q.meals_needed) })}{q.code ? (<> • <b>{t.reqCodeLabel} {q.code}</b></>) : ''} — {q.status}{reqExpired(q) ? ` (${t.reqExpired})` : ''}</p>))}
                {adminReqs.length === 0 && <p className="muted">{t.reqNone}</p>}
              </div>
              <div className="grid">
                <div className="card"><h3>{t.createStaffTitle}</h3>
                  <label>{t.fullName}</label><input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  <label>{t.phoneEmail}</label><input value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                  <label>{t.password}</label><input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                  <label>{t.staffPhoneLabel}</label><input value={staffForm.phone} onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })} placeholder="0300-1234567" />
                  <p className="muted">{t.staffPhoneNote}</p>
                  <label>{t.photoLabel}</label>
                  <input type="file" accept="image/*" onChange={(e) => onPhotoFile(e, setStaffForm, staffForm)} />
                  {staffForm.photo && <img src={staffForm.photo} alt="" className="avatar-preview" />}
                  <p className="muted">{t.photoHint}</p>
                  <label>{t.roleLabel}</label>
                  <select value={staffForm.staffRole} onChange={(e) => setStaffForm({ ...staffForm, staffRole: e.target.value })}>
                    <option value="Counter">{t.roleCounter}</option><option value="Kitchen">{t.roleKitchen}</option><option value="Manager">{t.roleManager}</option><option value="__other">{t.roleOther}</option>
                  </select>
                  {staffForm.staffRole === '__other' && (<><label>{t.roleCustom}</label><input value={adminCustomRole} onChange={(e) => setAdminCustomRole(e.target.value)} placeholder={t.roleCustomPh} maxLength={40} /></>)}
                  <label>{t.roleRestLabel}</label>
                  <select value={staffForm.restaurant_id} onChange={(e) => setStaffForm({ ...staffForm, restaurant_id: e.target.value })}><option value="">{t.chooseRest}</option>{adminData.all.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</select>
                  <button className="btn tomato" onClick={async () => { if (!staffForm.photo) { setMsg(t.photoRequired); return; } const role = staffForm.staffRole === '__other' ? adminCustomRole.trim() : staffForm.staffRole; if (!role) { setMsg(t.invalidRole); return; } if (staffForm.phone && !validPhonePK(staffForm.phone)) { setMsg(t.invalidPhone); return; } try { await api('/admin/users', { method: 'POST', body: JSON.stringify({ ...staffForm, role: 'staff', staffRole: role }) }); setMsg(t.staffCreated); setStaffForm({ name: '', email: '', password: '', restaurant_id: '', photo: '', staffRole: 'Counter', phone: '' }); setAdminCustomRole(''); loadAdmin(); } catch (e) { setMsg(e.message); } }}>{t.createStaffBtn}</button>
                  <div style={{ marginTop: 12 }}>{adminData.users.map((u) => (<div className="staff-row clickable" key={u.id} onClick={() => setProfileStaff({ staff: u, restaurantName: u.restaurantName || '' })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter') setProfileStaff({ staff: u, restaurantName: u.restaurantName || '' }); }}><Avatar photo={u.photo} name={u.name} size={40} /><span className="who">{u.name} ({u.role}){u.staff_role ? ` — ${u.staff_role}` : ''}{u.restaurantName ? ` — ${u.restaurantName}` : ''}</span><button className="btn small danger" onClick={(e) => { e.stopPropagation(); doDeleteUser(u.id, u.name); }}>{t.delUserBtn}</button></div>))}</div>
                </div>
                <div className="card"><h3>{t.addRestTitle}</h3>
                  <label>{t.restName}</label><input value={newRest.name} onChange={(e) => setNewRest({ ...newRest, name: e.target.value })} />
                  <label>{t.restArea}</label>
                  <select value={newAreaSel} onChange={(e) => setNewAreaSel(e.target.value)}>
                    <option value="">{t.areaChoose}</option>
                    {AREAS.map((a) => (<option key={a} value={a}>{a}</option>))}
                    <option value="__other">{t.areaOther}</option>
                  </select>
                  {newAreaSel === '__other' && (<><label>{t.areaCustom}</label><input value={newAreaOther} onChange={(e) => setNewAreaOther(e.target.value)} placeholder="e.g. Bhittaibad" /></>)}
                  <label>{t.startTime}</label><input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                  <label>{t.endTime}</label><input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                  <label>{t.emailLabel}</label><input type="email" value={newRest.contact_email || ''} onChange={(e) => setNewRest({ ...newRest, contact_email: e.target.value })} placeholder="name@example.com" />
                  <label>{t.phoneLabel}</label><input value={newRest.contact_phone || ''} onChange={(e) => setNewRest({ ...newRest, contact_phone: e.target.value })} placeholder="0300-1234567" />
                  <label>{t.ownerPassLabel}</label><input type="password" value={newRest.owner_password || ''} onChange={(e) => setNewRest({ ...newRest, owner_password: e.target.value })} />
                  <p className="muted">{t.ownerPassNote}</p>
                  <label>{t.restPhotoLabel}</label>
                  <input type="file" accept="image/*" onChange={(e) => onPhotoFile(e, setNewRest, newRest)} />
                  {newRest.photo && <img src={newRest.photo} alt="" className="avatar-preview" />}
                  <p className="muted">{t.restPhotoHint}</p>
                  <label>{t.mealOptions}</label>
                  <div className="meal-checks">{MEAL_OPTIONS.map((m) => (<label key={m} className="meal-check"><input type="checkbox" checked={adminMealSel.includes(m)} onChange={(e) => setAdminMealSel(e.target.checked ? [...adminMealSel, m] : adminMealSel.filter((x) => x !== m))} /> {m}</label>))}</div>
                  <label>{t.mealOther}</label><input value={adminOther} onChange={(e) => setAdminOther(e.target.value)} placeholder="e.g. Haleem" />
                  <label>{t.mealPrice}</label><input type="number" min="50" max="2000" value={newRest.meal_price_pkr || ''} onChange={(e) => setNewRest({ ...newRest, meal_price_pkr: e.target.value })} placeholder="250" />
                  <button className="btn tomato" onClick={async () => {
                    if (!validEmail(newRest.contact_email)) { setMsg(t.invalidEmail); return; }
                    if (!validPhonePK(newRest.contact_phone)) { setMsg(t.invalidPhone); return; }
                    const area = newAreaSel === '__other' ? newAreaOther.trim() : newAreaSel;
                    if (!area) { setMsg(t.invalidArea); return; }
                    if (!validTimes(newStart, newEnd)) { setMsg(t.invalidTimes); return; }
                    if (!newRest.owner_password || newRest.owner_password.length < 8) { setMsg(t.passTooShort); return; }
                    const meals = [...adminMealSel, ...(adminOther.trim() ? [adminOther.trim()] : [])].map((name) => ({ name, price: parseInt(newRest.meal_price_pkr, 10) || 250 }));
                    try { const r = await api('/admin/restaurant', { method: 'POST', body: JSON.stringify({ ...newRest, area, contact_person: '', meals, start_time: newStart, end_time: newEnd }) }); setMsg(fmt(t.ownerCreated, { e: r.owner.email })); setAdminMealSel([]); setAdminOther(''); setNewStart(''); setNewEnd(''); setNewAreaSel(''); setNewAreaOther(''); setNewRest({ name: '', area: '', meal_price_pkr: '', contact_email: '', contact_phone: '', owner_password: '', photo: '' }); loadAdmin(); load(); } catch (e) { setMsg(e.message); }
                  }}>{t.addRestBtn}</button>
                </div>
              </div>
            </>)}
          </div>
        )}

        {page === 'board' && (
          <div>
            <div className="card"><h3>{t.boardSummary}</h3>
              {board ? (<>
                <div className="chart-tiles">
                  <div className="chart-tile"><b>{board.donors.reduce((s, d) => s + d.donated, 0)}</b><span>{t.donated}</span></div>
                  <div className="chart-tile"><b>{board.donors.reduce((s, d) => s + d.served, 0)}</b><span>{t.served}</span></div>
                  <div className="chart-tile"><b>{board.donors.reduce((s, d) => s + d.donated, 0) ? Math.round((board.donors.reduce((s, d) => s + d.served, 0) / board.donors.reduce((s, d) => s + d.donated, 0)) * 100) : 0}%</b><span>{t.gServedPct}</span></div>
                  <div className="chart-tile"><b>{stats ? stats.available : 0}</b><span>{t.available}</span></div>
                </div>
                <h3 style={{ marginTop: 18 }}>{t.boardChartDonors}</h3>
                <DonorBars donors={board.donors} t={t} badgeFor={badgeFor} />
                <h3 style={{ marginTop: 18 }}>{t.boardChartRest}</h3>
                <RestServedBars rows={board.restaurants} />
              </>) : <p className="muted">{t.adminLoading}</p>}
            </div>
            <div className="grid">
              <div className="card"><h3>{t.boardDonors}</h3>{board?.donors.map((d, i) => (<p key={i}>{i + 1}. {d.name} — {fmt(t.boardDonated, { d: d.donated, s: d.served })} • {d.served >= 1 ? (<span className="badge">{badgeFor(t, d.served)}</span>) : badgeFor(t, d.served)}</p>))}{!board?.donors.length && <p className="muted">{t.noDonors}</p>}</div>
              <div className="card"><h3>{t.boardRest}</h3>{board?.restaurants.map((r, i) => (<p key={r.id}>{i + 1}. {r.name} — {r.area} • {r.served} {t.served}, {r.available} {t.available}</p>))}</div>
            </div>
          </div>
        )}

        {page === 'transparency' && (
          <div>
            <h2>{t.transTitle}</h2>
            <p className="muted">{t.transNote}</p>
            <div className="card"><h3>{t.transGraphTitle}</h3>
              <p className="muted">{t.transGraphNote}</p>
              {monthly && (<>
                <p><b>{fmt(t.transTotals, { d: monthly.reduce((s, m) => s + m.donated, 0), s: monthly.reduce((s, m) => s + m.served, 0), a: stats ? stats.available : 0 })}</b></p>
                <MonthlyBars monthly={monthly} />
                <p className="legend"><span className="dot dot-gold"></span> {t.gDonated} <span className="dot dot-green"></span> {t.gServed}</p>
              </>)}
              {!monthly && <p className="muted">{t.adminLoading}</p>}
              <h3 style={{ marginTop: 18 }}>{t.transAvailTitle}</h3>
              {restaurants.map((r) => (
                <div className="chart-bar-row" key={r.id}>
                  <span className="lbl">{r.name}</span>
                  <div className="chart-bar-track"><div className="chart-bar-fill" style={{ width: Math.min(100, (r.available / Math.max(1, ...restaurants.map((x) => x.available))) * 100) + '%' }} /></div>
                  <b>{r.available}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'request' && (
          <div className="card" style={{ maxWidth: 620, margin: '14px auto' }}>
            <h2>{t.joinTitle}</h2>
            <p className="muted">{t.joinNote}</p>
            <label>{t.restName}</label><input value={reqForm.name} onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })} />
            <label>{t.restArea}</label>
            <select value={reqAreaSel} onChange={(e) => setReqAreaSel(e.target.value)}>
              <option value="">{t.areaChoose}</option>
              {AREAS.map((a) => (<option key={a} value={a}>{a}</option>))}
              <option value="__other">{t.areaOther}</option>
            </select>
            {reqAreaSel === '__other' && (<><label>{t.areaCustom}</label><input value={reqAreaOther} onChange={(e) => setReqAreaOther(e.target.value)} placeholder="e.g. Bhittaibad" /></>)}
            <label>{t.startTime}</label><input type="time" value={reqStart} onChange={(e) => setReqStart(e.target.value)} />
            <label>{t.endTime}</label><input type="time" value={reqEnd} onChange={(e) => setReqEnd(e.target.value)} />
            <label>{t.emailLabel}</label><input type="email" value={reqForm.contact_email} onChange={(e) => setReqForm({ ...reqForm, contact_email: e.target.value })} placeholder="name@example.com" />
            <label>{t.phoneLabel}</label><input value={reqForm.contact_phone} onChange={(e) => setReqForm({ ...reqForm, contact_phone: e.target.value })} placeholder="0300-1234567" />
            <label>{t.ownerPassLabel}</label><input type="password" value={reqForm.owner_password} onChange={(e) => setReqForm({ ...reqForm, owner_password: e.target.value })} />
            <p className="muted">{t.ownerPassNote}</p>
            <label>{t.restPhotoLabel}</label>
            <input type="file" accept="image/*" onChange={(e) => onPhotoFile(e, setReqForm, reqForm)} />
            {reqForm.photo && <img src={reqForm.photo} alt="" className="avatar-preview" />}
            <p className="muted">{t.restPhotoHint}</p>
            <label>{t.mealOptions}</label>
            <div className="meal-checks">{MEAL_OPTIONS.map((m) => (<label key={m} className="meal-check"><input type="checkbox" checked={joinMeals.includes(m)} onChange={(e) => setJoinMeals(e.target.checked ? [...joinMeals, m] : joinMeals.filter((x) => x !== m))} /> {m}</label>))}</div>
            <label>{t.mealOther}</label><input value={joinOther} onChange={(e) => setJoinOther(e.target.value)} placeholder="e.g. Haleem" />
            <button className="btn tomato" onClick={async () => {
              if (!validEmail(reqForm.contact_email)) { setMsg(t.invalidEmail); return; }
              if (!validPhonePK(reqForm.contact_phone)) { setMsg(t.invalidPhone); return; }
              const area = reqAreaSel === '__other' ? reqAreaOther.trim() : reqAreaSel;
              if (!area) { setMsg(t.invalidArea); return; }
              if (!validTimes(reqStart, reqEnd)) { setMsg(t.invalidTimes); return; }
              if (!reqForm.owner_password || reqForm.owner_password.length < 8) { setMsg(t.passTooShort); return; }
              const meals = [...joinMeals, ...(joinOther.trim() ? [joinOther.trim()] : [])].join(', ');
              try { await api('/restaurants/request', { method: 'POST', body: JSON.stringify({ ...reqForm, area, meals, start_time: reqStart, end_time: reqEnd }) }); setMsg(t.joinSent); setJoinMeals([]); setJoinOther(''); setReqStart(''); setReqEnd(''); setReqAreaSel(''); setReqAreaOther(''); setReqForm({ name: '', area: '', contact_email: '', contact_phone: '', owner_password: '', photo: '' }); } catch (e) { setMsg(e.message); }
            }}>{t.sendBtn}</button>
          </div>
        )}

        {page === 'auth' && (
          <div className="card" style={{ maxWidth: 520, margin: '14px auto' }}>
            <h2>{t.authTitle}</h2>
            <p className="muted">{t.authNote}</p>
            {isRegister && (<><label>{t.authName}</label><input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /></>)}
            <label>{t.authEmail}</label><input value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <label>{t.authPass}</label><input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <button className="btn tomato" onClick={doAuth}>{isRegister ? t.createAccount : t.loginBtn}</button>{' '}
            <button className="btn ghost" onClick={() => setIsRegister(!isRegister)}>{isRegister ? t.toLogin : t.toRegister}</button>
            <p className="muted">{t.seedNote}</p>
            <p className="muted">{t.ownerSeedNote}</p>
          </div>
        )}
        {/* Staff profile — opened by clicking a staff member in the Finder
            detail view, the owner team list, or the Admin users list. */}
        {profileStaff && (
          <div className="modal-overlay profile-overlay" onClick={() => setProfileStaff(null)}>
            <div className="card modal profile-modal" onClick={(e) => e.stopPropagation()}>
              <button className="btn small outline modal-close" onClick={() => setProfileStaff(null)}>✕ {t.detailClose}</button>
              <div style={{ textAlign: 'center' }}>
                <Avatar photo={profileStaff.staff.photo} name={profileStaff.staff.name} size={96} />
                <h2 style={{ marginTop: 10 }}>{profileStaff.staff.name}</h2>
                <p><span className="badge">{profileStaff.staff.staff_role || t.roleCounter}</span>{' '}<span className="badge">● {t.active}</span></p>
              </div>
              <p><b>{t.profileRest}</b> {profileStaff.restaurantName}</p>
              <p><b>{t.profilePhone}</b> {profileStaff.staff.phone || t.staffPhoneNone}</p>
              {profileStaff.staff.email && <p><b>{t.profileEmail}</b> {profileStaff.staff.email}</p>}
              <p><b>{t.profileStatus}</b> {t.active}</p>
            </div>
          </div>
        )}
      </main>

      <footer>
        <div className="wrap foot-grid">
          <div className="foot-brand"><LogoMark /></div>
          <div><h3>{t.footerExplore}</h3><p className="foot-links">
            <button onClick={() => go('finder')}>{t.finder}</button>
            <button onClick={() => go('donate')}>{t.donate}</button>
            <button onClick={() => go('board')}>{t.board}</button>
            <button onClick={() => go('transparency')}>{t.transparency}</button>
            <button onClick={() => go('request')}>{t.request}</button>
          </p></div>
          <div><h3>{t.footerLang}</h3><p className="foot-lang">
            {['en', 'ur', 'sd'].map((l) => (<button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : l === 'ur' ? 'اردو' : 'سنڌي'}</button>))}
          </p></div>
        </div>
        <div className="foot-bottom"><p>{t.footerCopy}</p></div>
      </footer>
    </div>
  );
}
