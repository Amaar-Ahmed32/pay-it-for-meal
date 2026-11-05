// App.jsx — STEP 4, FINAL App. This replaces the Step 3 App completely.
// Design: the PDF you sent — cream page, teal + orange, white cards,
// hero + live dashboard on Home, big Serve button for staff, Daily Check for admin.
// Pages: Home, Finder, Donate, My Donations, Staff, Admin, Leaderboard, Request, Login.
// All data comes from the backend you built (localhost:5001). No fake numbers:
// stats, restaurants, leaderboard, activity, donations and notifications are all API calls.
// What is NOT built here (honest, as in the PDF review): Disputes, and a full
// Urdu/Sindhi translation of every paragraph — key labels switch, full text is Phase 2.

import React, { useEffect, useState } from 'react';

const API = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:5001/api';
const PILOT_DONATION_GOAL = 30; // pilot target from the teacher plan — change this one number if the target changes
const T = {
  en: { home: 'Home', finder: 'Find a free meal', donate: 'Donate', mine: 'My donations', staff: 'Staff', admin: 'Admin', board: 'Leaderboard', transparency: 'Transparency', request: 'Join as restaurant', auth: 'Login / Sign Up' },
  ur: { home: 'ہوم', finder: 'مفت کھانا تلاش کریں', donate: 'عطیہ', mine: 'میرے عطیات', staff: 'اسٹاف', admin: 'ایڈمن', board: 'لیڈر بورڈ', transparency: 'شفافیت', request: 'ریسٹورنٹ شامل کریں', auth: 'لاگ ان / سائن اپ' },
  sd: { home: 'گھر', finder: 'مفت کاڌو ڳوليو', donate: 'عطيو', mine: 'منهنجا عطيا', staff: 'اسٽاف', admin: 'ايڊمن', board: 'ليڊر بورڊ', transparency: 'شفافيت', request: 'ريسٽورنٽ شامل ڪريو', auth: 'لاگ ان / سائن اپ' },
};
const badgeFor = (served) => (served >= 10 ? '🏆 Meal Hero (10+ served)' : served >= 5 ? '💛 Kind Heart (5+ served)' : served >= 1 ? '🌱 New Giver (1+ served)' : '— no badge yet, donate first');

export default function App() {
  const [page, setPage] = useState('home');
  const [lang, setLang] = useState('en');
  const [stats, setStats] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [board, setBoard] = useState(null);
  const [activity, setActivity] = useState([]);
  const [mostNeeded, setMostNeeded] = useState(null);
  const [transparency, setTransparency] = useState([]);
  const [filter, setFilter] = useState('All areas');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [msg, setMsg] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pifm_token') || '');
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [isRegister, setIsRegister] = useState(false);
  // Donate form state
  const [donRest, setDonRest] = useState('');
  const [donQty, setDonQty] = useState(1);
  const [donMethod, setDonMethod] = useState('JazzCash');
  const [checkout, setCheckout] = useState(null); // pending sandbox payment, if any
  const [testMobile, setTestMobile] = useState('');
  // My data + admin data (loaded only when needed, so public pages stay fast)
  const [mine, setMine] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [adminData, setAdminData] = useState(null);
  const [report, setReport] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: '', email: '', password: '', restaurant_id: '' });
  const [newRest, setNewRest] = useState({ name: '', area: '', meal: '', timings: '', meal_price_pkr: '' });
  const [priceEdit, setPriceEdit] = useState({ id: '', price: '' });
  const [reqForm, setReqForm] = useState({ name: '', area: '', meal: '', timings: '', contact_name: '', contact_phone: '' });
  const t = T[lang];

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
    } catch (e) { if (!String(e.message).includes('Login')) setMsg('Backend not running? Start it: cd backend && npm start  •  ' + e.message); }
  };
  useEffect(() => { load(); }, [token]);

  const loadAdmin = async () => {
    try {
      setAdminData({
        overview: await api('/admin/overview'),
        all: await api('/restaurants/all'),
        users: await api('/admin/users'),
        requests: await api('/admin/requests'),
      });
    } catch (e) { setMsg(e.message); }
  };
  useEffect(() => { if (page === 'admin' && user?.role === 'admin') loadAdmin(); }, [page, user]);
  useEffect(() => { if (page === 'transparency') api('/transparency').then(setTransparency).catch(() => {}); }, [page]);

  const go = (p) => { setPage(p); setMsg(''); };
  const doAuth = async () => {
    try {
      const data = await api(isRegister ? '/auth/register' : '/auth/login', { method: 'POST', body: JSON.stringify(authForm) });
      localStorage.setItem('pifm_token', data.token); setToken(data.token); setUser(data.user);
      setMsg(`Welcome, ${data.user.name} (${data.user.role}).`);
      // Land on the right dashboard for the role, instead of always Home:
      // admin -> Admin dashboard, staff -> Staff page, donor -> My donations (donor dashboard).
      go(data.user.role === 'admin' ? 'admin' : data.user.role === 'staff' ? 'staff' : 'mine');
    } catch (e) { setMsg(e.message); }
  };
  const printReceipt = (d) => {
    const rest = restaurants.find((r) => r.id === d.restaurant_id);
    const price = rest?.meal_price_pkr || 250;
    const amount = d.amount_pkr || (d.quantity * price);
    const donorName = user?.show_name === 0 ? 'Anonymous donor' : (user?.name || 'Donor');
    const w = window.open('', '_blank', 'width=600,height=700');
    if (!w) { setMsg('Please allow pop-ups for this site to print the receipt.'); return; }
    w.document.write(`<html><head><title>Donation receipt — Pay It Forward Meal</title></head><body style="font-family: sans-serif; max-width: 520px; margin: 30px auto; color: #111;"><h2>💛 Pay It Forward Meal — Donation receipt</h2><p>Jeejal Aman Public School, Bhittaibad • SDG 1 + SDG 2</p><hr /><p><b>Donor:</b> ${donorName}</p><p><b>Restaurant:</b> ${d.restaurantName}</p><p><b>Meals donated:</b> ${d.quantity}</p><p><b>Served so far from this donation:</b> ${d.served_qty}/${d.quantity}</p><p><b>Amount:</b> Rs ${amount}</p><p><b>Method:</b> ${d.method} • <b>Status:</b> ${d.payment_status}</p>${d.txn_ref ? `<p><b>Txn ref:</b> ${d.txn_ref}</p>` : ''}<p><b>Date:</b> ${d.created_at || ''}</p><hr /><p><small>Thank you — your meal will be served with no questions asked, and no recipient data is ever stored. Payment: test/sandbox mode in the pilot — no real money moves.</small></p></body></html>`);
    w.document.close(); w.focus(); w.print();
  };
  const logout = () => { localStorage.removeItem('pifm_token'); setToken(''); setUser(null); go('home'); };

  // NEW sandbox flow: initiate creates a PENDING donation (meals NOT available yet),
  // then the Sandbox Checkout screen confirms it. Only confirm() makes meals Available.
  const doDonate = async () => {
    try {
      const r = await api('/payments/initiate', { method: 'POST', body: JSON.stringify({ restaurantId: donRest, quantity: donQty, method: donMethod }) });
      setCheckout(r.checkout); setMsg('Sandbox payment created — it is PENDING. Meals become Available only after you confirm on the Sandbox Checkout below.');
    } catch (e) { setMsg(e.message); }
  };
  const doSandboxPay = async () => {
    try {
      const r = await api('/payments/sandbox/confirm', { method: 'POST', body: JSON.stringify({ txnRef: checkout.txnRef }) });
      setStats(r.stats); setCheckout(null);
      setMine(await api('/donations/mine')); setRestaurants(await api('/restaurants'));
      setMsg('Sandbox payment successful! ' + checkout.amountPkr + ' PKR paid in sandbox (no real money). Meals are now Available.');
      go('mine');
    } catch (e) { setMsg(e.message); }
  };
  const doSandboxCancel = async () => {
    try { await api('/payments/sandbox/cancel', { method: 'POST', body: JSON.stringify({ txnRef: checkout.txnRef }) }); } catch {}
    setCheckout(null); setMsg('Sandbox payment cancelled. No meals were created.');
  };
  const doServe = async () => {
    try {
      const r = await api('/serve', { method: 'POST', body: JSON.stringify({ restaurantId: user?.role === 'admin' ? restaurants[0]?.id : undefined }) });
      setStats(r.stats); setRestaurants(await api('/restaurants'));
      setMsg(`Served! Available now: ${r.restaurant.available}, served total: ${r.restaurant.served}. Donor (if any) got a message.`);
    } catch (e) { setMsg(e.message); }
  };

  const areas = ['All areas', ...new Set(restaurants.map((r) => r.area))];
  const shown = restaurants.filter((r) => (filter === 'All areas' || r.area === filter) && (!onlyAvailable || r.available > 0));
  const myRest = restaurants.find((r) => r.id === user?.restaurant_id);
  const myDonated = mine.reduce((s, d) => s + d.quantity, 0);
  const myServed = mine.reduce((s, d) => s + (d.served_qty || 0), 0);
  const dailyOk = stats ? stats.donated - stats.served === stats.available : false;

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <header>
        <div className="wrap">
        <div className="brand"><span className="logo">💚</span><div><h1>Pay It Forward Meal</h1><p>Jeejal Aman Public School, Bhittaibad • SDG 1 + SDG 2</p></div></div>
        <div className="lang">
          {['en', 'ur', 'sd'].map((l) => (<button key={l} className={lang === l ? 'active' : ''} onClick={() => setLang(l)}>{l === 'en' ? 'EN' : l === 'ur' ? 'اردو' : 'سنڌي'}</button>))}
          {' '}
          {user ? <button className="btn teal" onClick={() => go(user.role === 'admin' ? 'admin' : user.role === 'staff' ? 'staff' : 'mine')}>Dashboard</button> : <button className="btn teal" onClick={() => go('auth')}>Log in</button>}
        </div>
        </div>
      </header>

      <nav>
        <div className="wrap navwrap">
        {['home', 'finder', 'donate', 'board', 'transparency'].map((p) => (
          <button key={p} className={page === p ? 'active' : ''} onClick={() => go(p)}>{t[p]}</button>
        ))}
        {user && <span className="muted">👤 {user.name} ({user.role}){myRest ? ` • ${myRest.name}` : ''}</span>}
        </div>
      </nav>

      <main>
        {msg && <div className="success">{msg}</div>}

        {page === 'home' && (
          <>
            <div className="hero">
              <div>
                <p><span className="eyebrow">● Live in Pakistan · Test pilot</span></p>
                <p className="muted" style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>Jeejal Aman Public School, Bhittaibad • Sindh STREAM 2026–27 • SDG 1 + SDG 2</p>
                <h2>A normal dinner becomes someone else’s dinner.</h2>
                <p className="lead">Pay for your meal and add one for someone in need. The restaurant serves it, and you get proof — no names, no questions, no data about the person.</p>
                <p><button className="btn teal" onClick={() => go('donate')}>Donate a meal</button>{' '}<button className="btn orange" onClick={() => go('finder')}>Find a free meal</button></p>
                <p className="muted">Need a meal? No login, no questions, no form — just ask staff at a listed restaurant.</p>
                {stats && (<p>{stats.available > 0 ? (<><b>🍽️ {stats.available} meal{stats.available === 1 ? '' : 's'} available right now</b> — find one near you, or donate to keep the shelf full.</>) : (<><b>No meals available right now</b> — be the first donor today.</>)}</p>)}
              </div>
              <div className="bowl-scene">
                <div className="bowl-heart">💚</div>
                <div className="bowl" />
                <div className="glass-chip chip-left"><b>{stats ? stats.donated : 0}</b>Donated</div>
                <div className="glass-chip amber chip-right"><b>{stats ? stats.available : 0}</b>Available now</div>
              </div>
            </div>
            <div className="card dashcard">
              <h3>Live dashboard</h3>
              <p className="muted">Numbers come live from the database. Nothing is typed in by hand.</p>
              {stats && (<div className="dash"><div><b>{stats.donated}</b><span>Donated</span></div><div><b>{stats.served}</b><span>Served</span></div><div><b>{stats.available}</b><span>Available now</span></div></div>)}
              {stats && (<div style={{ marginTop: 12 }}><p style={{ margin: '0 0 6px' }}><b>Pilot goal: {stats.donated} of {PILOT_DONATION_GOAL} meals donated</b></p><div style={{ background: '#e5e7eb', borderRadius: 999, height: 14, overflow: 'hidden' }}><div style={{ width: Math.min(100, Math.round((stats.donated / PILOT_DONATION_GOAL) * 100)) + '%', background: '#116A4D', height: '100%' }} /></div><p className="muted" style={{ margin: '6px 0 0' }}>{Math.min(100, Math.round((stats.donated / PILOT_DONATION_GOAL) * 100))}% of pilot goal • {stats.served} served so far{stats.donated >= PILOT_DONATION_GOAL ? ' • 🎉 Pilot goal reached!' : ''}</p></div>)}
              <h3 style={{ marginTop: 18 }}>By restaurant</h3>
              {restaurants.filter((r) => r.available > 0).map((r) => (<p key={r.id}>{r.name} <span className="badge" style={{ float: 'right' }}>{r.available} available</span></p>))}
              {restaurants.filter((r) => r.available > 0).length === 0 && <p className="muted">No partner restaurants with meals right now. Be the first donor!</p>}
            </div>
            <h3>How it works</h3>
            <div className="grid3">
              <div className="card"><div className="step-num">1</div><h3>Donate</h3><p>Choose a verified restaurant and pay for one or more extra meals.</p></div>
              <div className="card"><div className="step-num">2</div><h3>Served</h3><p>A person in need asks staff for a Pay It Forward meal. No questions, no payment.</p></div>
              <div className="card"><div className="step-num">3</div><h3>You get a message</h3><p>“Your meal was served.” You see proof and never learn who received it.</p></div>
            </div>
            <div className="trust-chips"><span>✓ Verified restaurants only</span><span>✓ No recipient data stored</span><span>✓ Money released only after serving</span></div>
            {restaurants.some((r) => r.available <= 1) && (<div className="notice">⚠️ Urgent: {restaurants.filter((r) => r.available <= 1).map((r) => `${r.name} — ${r.available} meal${r.available === 1 ? '' : 's'} left`).join(' • ')} — donate where most needed below.</div>)}
            <p><button className="btn teal" onClick={() => { if (mostNeeded) { setDonRest(String(mostNeeded.id)); } go('donate'); }}>💛 Give where most needed{mostNeeded ? ` — ${mostNeeded.name}` : ''}</button></p>
            <div className="partner-banner"><div><h3>Run a restaurant?</h3><p>Join as a partner and serve free meals paid for by your own customers.</p></div><button className="btn orange" onClick={() => go('request')}>Become a partner</button></div>
            <div className="card"><h3>Recent activity (recipients never named)</h3>
              {activity.slice(0, 6).map((a, i) => (<p key={i}>{a.type === 'served' ? '🍽️ A meal was served' : `💛 ${a.donor} donated ${a.qty}`} at {a.restaurant}</p>))}
              {activity.length === 0 && <p className="muted">No activity yet — be the first donor.</p>}
            </div>
          </>
        )}

        {page === 'finder' && (
          <div>
            <h2>Free meals today</h2>
            <div className="card" style={{ background: '#dcf5ec' }}><b>Free meals available here today. Just ask staff for a Pay It Forward meal.</b></div>
            <label>Area / city</label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>{areas.map((a) => (<option key={a}>{a}</option>))}</select>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', cursor: 'pointer' }}><input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} /> Only show restaurants with meals available</label>
            <div className="grid3">
              {shown.map((r) => (
                <div className="card" key={r.id}>
                  <h3>{r.name} <span className={r.available <= 1 ? 'badge warn' : 'badge'} style={{ float: 'right' }}>{r.available <= 1 ? `⚠️ ${r.available} left — urgent` : `${r.available} meals`}</span></h3>
                  <p>{r.area} • {r.meal}<br />{r.timings} • Rs {r.meal_price_pkr || 250} per meal</p>
                  <p className="muted">{r.served} served so far</p>
                </div>
              ))}
            </div>
            {shown.length === 0 && <p>{onlyAvailable ? 'No restaurant with meals available in that area right now — try All areas, or check back after a donation.' : 'No verified restaurant in that area yet.'}</p>}
            <p className="muted">No login. No form. We never ask for or store anything about you.</p>
          </div>
        )}

        {page === 'donate' && (
          <div className="grid">
            <div className="card">
              <h2>Donate a meal</h2>
              {!user && <p className="notice" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}><span>Please log in as a donor first — public sign-up creates a donor account.</span><button className="btn small teal" onClick={() => go('auth')}>Log in</button></p>}
              <p><button className="btn small orange" onClick={() => { if (mostNeeded) { setDonRest(String(mostNeeded.id)); setMsg(`Most needed right now: ${mostNeeded.name} — only ${mostNeeded.available} meal(s) left.`); } }}>💛 Give where most needed{mostNeeded ? ` — ${mostNeeded.name} (${mostNeeded.available} left)` : ''}</button></p>
              <label>1. Restaurant</label>
              <select value={donRest} onChange={(e) => setDonRest(e.target.value)}><option value="">Choose a verified restaurant…</option>{restaurants.map((r) => (<option key={r.id} value={r.id}>{r.name} ({r.area}) — Rs {r.meal_price_pkr || 250}/meal — verified</option>))}</select>
              <label>2. Number of meals</label>
              <div className="qty">{[1, 2, 5].map((n) => (<button key={n} className={donQty === n ? 'active' : ''} onClick={() => setDonQty(n)}>{n}</button>))}
                <input type="number" min="1" max="10" value={donQty} onChange={(e) => setDonQty(parseInt(e.target.value, 10) || 1)} style={{ width: 90 }} /> <span className="muted">(1–10, custom allowed)</span></div>
              <label>3. Pay with</label>
              <div className="method">{[{ name: 'JazzCash', icon: '📱', sub: 'Mobile wallet' }, { name: 'Easypaisa', icon: '💚', sub: 'Mobile wallet' }, { name: 'Card', icon: '💳', sub: 'Debit / Credit' }].map((m) => (<button key={m.name} className={donMethod === m.name ? 'active' : ''} onClick={() => setDonMethod(m.name)}><span>{m.icon} {m.name}{donMethod === m.name ? ' ✓' : ''}</span><small>{m.sub}</small></button>))}</div>
            </div>
            <div className="card">
              <h3>Summary</h3>
              {donRest ? (<p>Meals: <b>{donQty}</b> • Method: <b>{donMethod}</b> • Price: <b>Rs {donQty * (restaurants.find((r) => String(r.id) === String(donRest))?.meal_price_pkr || 250)}</b> (Rs {restaurants.find((r) => String(r.id) === String(donRest))?.meal_price_pkr || 250} per meal at {restaurants.find((r) => String(r.id) === String(donRest))?.name} — admin sets each restaurant's price)</p>) : (<p className="muted">Choose a restaurant first to see its meal price. Each restaurant has its own price, set by admin.</p>)}
              <p className="notice">Test mode: no real money moves in the pilot.</p>
              <button className="btn teal" disabled={!user || !donRest} onClick={doDonate}>Continue to Sandbox Checkout</button>
              <p className="muted">Status: Pending → Paid (sandbox) → Available → Served. Meals are NOT Available while Pending.</p>
              {checkout && (
                <div className="card" style={{ background: '#fef3c7' }}>
                  <h3>Sandbox Checkout — {checkout.gateway} (SIMULATOR, not the real gateway site)</h3>
                  <p>Pay <b>Rs {checkout.amountPkr}</b> for {donQty} meal(s) • Txn ref: <b>{checkout.txnRef}</b></p>
                  <p className="muted">This is our own sandbox simulator for the contest demo. No real money moves. Real JazzCash/Easypaisa gateway needs merchant sandbox keys in backend/.env.</p>
                  <label>Test mobile number (any test number, e.g. 0300-1234567)</label>
                  <input value={testMobile} onChange={(e) => setTestMobile(e.target.value)} placeholder="03XX-XXXXXXX" />
                  <button className="btn teal" onClick={doSandboxPay}>Pay Rs {checkout.amountPkr} in Sandbox</button>{' '}
                  <button className="btn outline" onClick={doSandboxCancel}>Cancel payment</button>
                </div>
              )}
            </div>
          </div>
        )}

        {page === 'mine' && (
          <div>
            <h2>My donations</h2>
            {user && <p><button className="btn small outline" onClick={logout}>Logout</button> <span className="muted">Signed in as {user.name} ({user.role})</span></p>}
            {!user && <p className="notice">Log in to see your donations and messages.</p>}
            {user && (<>
              <div className="stats"><div className="stat"><b>{myDonated}</b>Donated</div><div className="stat orange"><b>{myServed}</b>Served</div><div className="stat"><b>{myDonated - myServed}</b>Still available</div></div>
              <p><b>Your badge:</b> {badgeFor(myServed)}</p>
              <p><label><input type="checkbox" style={{ width: 'auto' }} checked={user.show_name !== 0} onChange={async (e) => { const data = await api('/me/privacy', { method: 'POST', body: JSON.stringify({ showName: e.target.checked }) }); setUser(data.user); load(); }} /> Show my name on Leaderboard and Transparency (untick = Anonymous donor)</label></p>
              <div className="card"><h3>Donations</h3>{mine.map((d) => (<p key={d.id}>{d.quantity} meal(s) at {d.restaurantName} • {d.served_qty}/{d.quantity} served • {d.method} • {d.payment_status}{d.txn_ref ? ` • ${d.txn_ref}` : ''} <button className="btn small outline" onClick={() => printReceipt(d)}>Print receipt</button></p>))}{mine.length === 0 && <p className="muted">No donations yet.</p>}</div>
              <div className="card"><h3>Messages</h3>{notifs.map((n) => (<div className="notif" key={n.id}>{n.message} <button className="btn small outline" onClick={async () => { await api(`/notifications/${n.id}/read`, { method: 'POST' }); setNotifs(await api('/notifications/mine')); }}>Mark read</button> {n.is_read ? '✓ read' : ''}</div>))}{notifs.length === 0 && <p className="muted">No messages yet — you'll get one here when your meal is served.</p>}</div>
            </>)}
          </div>
        )}

        {page === 'staff' && (
          <div className="card" style={{ maxWidth: 620, margin: '14px auto' }}>
            <h2>Staff — {myRest ? myRest.name : 'no restaurant linked yet'}</h2>
            {user && <p><button className="btn small outline" onClick={logout}>Logout</button> <span className="muted">Signed in as {user.name} ({user.role})</span></p>}
            {(!user || (user.role !== 'staff' && user.role !== 'admin')) && <p className="notice">Staff accounts are created by admin and linked to ONE restaurant. Log in as staff (or admin to test).</p>}
            {user && (user.role === 'staff' || user.role === 'admin') && (<>
              <p className="muted" style={{ textAlign: 'center' }}>Available meals today</p>
              <div className="big-number">{myRest ? myRest.available : (restaurants[0]?.available ?? 0)}</div>
              <button className="btn teal-lg" onClick={doServe}>Serve 1 meal</button>
              <div className="grid" style={{ marginTop: 14 }}>
                <div className="card"><span className="muted">Served in total</span><div><b style={{ fontSize: 30, color: '#17765f' }}>{myRest ? myRest.served : (restaurants[0]?.served ?? 0)}</b></div></div>
                <div className="card"><span className="muted">Restaurant</span><div><b>{myRest ? myRest.name : restaurants[0]?.name}</b></div></div>
              </div>
              <p className="muted">Serve, tap Serve, no questions. Only a count and the time are recorded, nothing about the person.</p>
            </>)}
          </div>
        )}

        {page === 'admin' && (
          <div>
            <h2>Admin dashboard</h2>
            {user?.role === 'admin' && <p><button className="btn small outline" onClick={logout}>Logout</button> <span className="muted">Signed in as {user.name} (admin)</span></p>}
            {(!user || user.role !== 'admin') && <p className="notice">Admin only. Log in as admin@payitforward.school (seeded account, change the password before real use).</p>}
            {user?.role === 'admin' && !adminData && <p className="muted">Loading admin data… if this stays blank, read the message above — it is the backend error.</p>}
            {user?.role === 'admin' && adminData && (<>
              <div className="grid3">
                <div className="card"><h3>Daily check</h3><p>Donated − served = available</p><p>{stats.donated} − {stats.served} <span className={dailyOk ? 'badge' : 'badge warn'}>= {stats.available}, {dailyOk ? 'matches' : 'MISMATCH — check!'}</span></p><p className="muted">{adminData.overview.users} users • {adminData.overview.donations} donations • {adminData.overview.pendingRequests} pending requests</p></div>
                <div className="card"><h3>Verify restaurants</h3>{adminData.all.filter((r) => !r.verified).map((r) => (<p key={r.id}>{r.name} — {r.area} <button className="btn small teal" onClick={async () => { await api('/admin/verify', { method: 'POST', body: JSON.stringify({ restaurantId: r.id }) }); loadAdmin(); load(); }}>Verify</button></p>))}{adminData.all.filter((r) => !r.verified).length === 0 && <p className="muted">No unverified restaurants. All {adminData.all.length} are verified.</p>}</div>
                <div className="card"><h3>Restaurant requests</h3>{adminData.requests.map((q) => (<p key={q.id}>{q.name} — {q.area} ({q.status}) {q.status === 'pending' && (<><button onClick={async () => { await api(`/admin/requests/${q.id}/approve`, { method: 'POST' }); loadAdmin(); load(); }}>Approve</button>{' '}<button onClick={async () => { await api(`/admin/requests/${q.id}/reject`, { method: 'POST' }); loadAdmin(); }}>Reject</button></>)}</p>))}{adminData.requests.length === 0 && <p className="muted">No requests yet.</p>}</div>
              </div>
              <div className="card"><h3>Weekly report (last 7 days)</h3>
                <p className="muted">Paid donations and serves in the last 7 days, per restaurant. No recipient data — counts only.</p>
                <button className="btn teal" onClick={async () => { try { setReport(await api('/admin/report')); } catch (e) { setMsg(e.message); } }}>Load weekly report</button>{' '}
                {report && (<button className="btn outline" onClick={() => { const rows = [['Restaurant', 'Area', 'Donated (last 7 days)', 'Served (last 7 days)', 'Available now', 'Served total']]; report.rows.forEach((r) => rows.push([r.name, r.area, r.donated7, r.served7, r.available, r.servedTotal])); rows.push(['TOTAL', '', report.totals.donated7, report.totals.served7, report.totals.available, report.totals.servedTotal]); const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'pay-it-forward-weekly-report.csv'; a.click(); }}>Download CSV</button>)}
                {report && (<div style={{ marginTop: 12 }}>{report.rows.map((r) => (<p key={r.id}>{r.name} — {r.donated7} donated, {r.served7} served (last 7 days) • {r.available} available now • {r.servedTotal} served total</p>))}<p><b>Total:</b> {report.totals.donated7} donated, {report.totals.served7} served (last 7 days) • {report.totals.available} available now</p></div>)}
              </div>
              <div className="card"><h3>Restaurant prices (per restaurant)</h3>
                {adminData.all.map((r) => (<p key={r.id}>{r.name} — Rs {r.meal_price_pkr || 250}/meal {r.verified ? '' : '(unverified)'}</p>))}
                <label>Restaurant</label><select value={priceEdit.id} onChange={(e) => setPriceEdit({ ...priceEdit, id: e.target.value })}><option value="">Choose restaurant…</option>{adminData.all.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</select>
                <label>New meal price (Rs 50–2000)</label><input type="number" min="50" max="2000" value={priceEdit.price} onChange={(e) => setPriceEdit({ ...priceEdit, price: e.target.value })} />
                <button className="btn teal" onClick={async () => { try { await api(`/admin/restaurants/${priceEdit.id}/price`, { method: 'POST', body: JSON.stringify({ mealPricePkr: priceEdit.price }) }); setMsg('Meal price updated.'); loadAdmin(); load(); } catch (e) { setMsg(e.message); } }}>Save price</button>
              </div>
              <div className="grid">
                <div className="card"><h3>Create staff / admin account</h3>
                  <label>Name</label><input value={staffForm.name} onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })} />
                  <label>Email</label><input value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                  <label>Password</label><input type="password" value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                  <label>Role + linked restaurant (staff must have one)</label>
                  <select value={staffForm.restaurant_id} onChange={(e) => setStaffForm({ ...staffForm, restaurant_id: e.target.value })}><option value="">Choose restaurant…</option>{adminData.all.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}</select>
                  <button className="btn teal" onClick={async () => { try { await api('/admin/users', { method: 'POST', body: JSON.stringify({ ...staffForm, role: 'staff' }) }); setMsg('Staff account created.'); loadAdmin(); } catch (e) { setMsg(e.message); } }}>Create staff account</button>
                  <p className="muted">Users on file: {adminData.users.map((u) => `${u.name} (${u.role})`).join(', ')}</p>
                </div>
                <div className="card"><h3>Add a restaurant</h3>
                  <label>Name</label><input value={newRest.name} onChange={(e) => setNewRest({ ...newRest, name: e.target.value })} />
                  <label>Area</label><input value={newRest.area} onChange={(e) => setNewRest({ ...newRest, area: e.target.value })} />
                  <label>Meal</label><input value={newRest.meal} onChange={(e) => setNewRest({ ...newRest, meal: e.target.value })} />
                  <label>Timings</label><input value={newRest.timings} onChange={(e) => setNewRest({ ...newRest, timings: e.target.value })} />
                  <label>Meal price (Rs)</label><input type="number" min="50" max="2000" value={newRest.meal_price_pkr || ''} onChange={(e) => setNewRest({ ...newRest, meal_price_pkr: e.target.value })} placeholder="250" />
                  <button className="btn teal" onClick={async () => { try { await api('/admin/restaurant', { method: 'POST', body: JSON.stringify({ ...newRest, contact_person: '' }) }); setMsg('Restaurant added (unverified until you Verify it).'); loadAdmin(); load(); } catch (e) { setMsg(e.message); } }}>Add restaurant (unverified)</button>
                </div>
              </div>
            </>)}
          </div>
        )}

        {page === 'board' && (
          <div className="grid">
            <div className="card"><h3>Top donors (by meals served)</h3>{board?.donors.map((d, i) => (<p key={i}>{i + 1}. {d.name} — {d.donated} donated, {d.served} served • {badgeFor(d.served)}</p>))}{!board?.donors.length && <p className="muted">No donors yet.</p>}</div>
            <div className="card"><h3>Top restaurants</h3>{board?.restaurants.map((r, i) => (<p key={r.id}>{i + 1}. {r.name} — {r.area} • {r.served} served, {r.available} available</p>))}</div>
          </div>
        )}

        {page === 'transparency' && (
          <div>
            <h2>Transparency — every paid meal, in public</h2>
            <p className="muted">Paid donations and serves only. No recipient is ever named, photographed, or described. Donors appear by name only if they chose to — otherwise 'Anonymous donor'.</p>
            <div className="card">{transparency.map((a, i) => (<p key={i}>{a.kind === 'served' ? '🍽️ Served' : `💛 ${a.donor} donated ${a.qty}`} at {a.restaurant}{a.amount ? ` — Rs ${a.amount}` : ''}{a.txn ? ` • ${a.txn}` : ''} <span className="muted">({a.at})</span></p>))}{transparency.length === 0 && <p className="muted">No paid donations or serves yet.</p>}</div>
          </div>
        )}

        {page === 'request' && (
          <div className="card" style={{ maxWidth: 620, margin: '14px auto' }}>
            <h2>Join as a restaurant</h2>
            <p className="muted">Your request starts UNVERIFIED and hidden from the public Finder until admin approves it. Checklist: name, area, meal and timings, and you agree to serve without questions.</p>
            <label>Restaurant name</label><input value={reqForm.name} onChange={(e) => setReqForm({ ...reqForm, name: e.target.value })} />
            <label>Area</label><input value={reqForm.area} onChange={(e) => setReqForm({ ...reqForm, area: e.target.value })} />
            <label>Meal</label><input value={reqForm.meal} onChange={(e) => setReqForm({ ...reqForm, meal: e.target.value })} />
            <label>Timings</label><input value={reqForm.timings} onChange={(e) => setReqForm({ ...reqForm, timings: e.target.value })} />
            <label>Contact name / phone</label><input value={reqForm.contact_name} onChange={(e) => setReqForm({ ...reqForm, contact_name: e.target.value })} /><input value={reqForm.contact_phone} onChange={(e) => setReqForm({ ...reqForm, contact_phone: e.target.value })} />
            <button className="btn teal" onClick={async () => { try { await api('/restaurants/request', { method: 'POST', body: JSON.stringify(reqForm) }); setMsg('Request sent! Admin will review it. It will NOT show publicly until approved.'); } catch (e) { setMsg(e.message); } }}>Send request</button>
          </div>
        )}

        {page === 'auth' && (
          <div className="card" style={{ maxWidth: 520, margin: '14px auto' }}>
            <h2>Login / Sign Up</h2>
            <p className="muted">Public sign-up creates a <b>donor</b> account. Staff and admin accounts are created by an admin.</p>
            {isRegister && (<><label>Full name</label><input value={authForm.name} onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })} /></>)}
            <label>Email</label><input value={authForm.email} onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })} />
            <label>Password (min 6 characters, stored hashed)</label><input type="password" value={authForm.password} onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })} />
            <button className="btn teal" onClick={doAuth}>{isRegister ? 'Create donor account' : 'Login'}</button>{' '}
            <button className="btn ghost" onClick={() => setIsRegister(!isRegister)}>{isRegister ? 'Already have an account? Login' : 'New here? Create an account'}</button>
            <p className="muted">School admin (seeded, change before real use): admin@payitforward.school / Admin123!</p>
          </div>
        )}
      </main>

      <footer>
        <div className="wrap">
          <div><h3>Pay It Forward Meal</h3><p>A normal dinner becomes someone else’s dinner. Pay for one extra meal and a verified restaurant serves it to a person in need.</p></div>
          <div><h3>Explore</h3><p><button className="btn ghost" style={{ color: '#d1fae5' }} onClick={() => go('finder')}>Find a free meal</button><br /><button className="btn ghost" style={{ color: '#d1fae5' }} onClick={() => go('donate')}>Donate</button><br /><button className="btn ghost" style={{ color: '#d1fae5' }} onClick={() => go('request')}>Become a partner</button></p></div>
          <div><h3>Languages</h3><p>EN • اردو • سنڌي</p><p>Jeejal Aman Public School, Bhittaibad</p></div>
        </div>
        <div className="foot-bottom"><p>© 2026 Pay It Forward Meal • Supports SDG 1 (No Poverty) and SDG 2 (Zero Hunger). No recipient data is ever stored. Payment: test mode in the pilot — no real money moves.</p></div>
      </footer>
    </div>
  );
}
