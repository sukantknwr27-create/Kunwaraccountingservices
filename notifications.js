// ============================================================
// Kunwar Accounting Services — Notification System
// Checks deadlines and creates notifications automatically
// ============================================================

const SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxrdm1sZ3B1a3RieG9odHV2d21iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5NjY2MTUsImV4cCI6MjA5MTU0MjYxNX0.KKhiMsZSwBbiyQo3B5jHKxerIYQqMZ18HvDY03u2J6I';

async function sbFetch(table, method='GET', body=null, qs='') {
  const h = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  if (method==='POST'||method==='PATCH') h['Prefer']='return=representation';
  const opts = { method, headers: h };
  if (body && method!=='GET') opts.body = JSON.stringify(body);
  const res = await fetch(SUPABASE_URL+'/rest/v1/'+table+qs, opts);
  if (method==='DELETE') return null;
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── Standard GST / TDS / ITR deadlines for FY 2026-27 ──────
const STANDARD_DEADLINES = [
  // GST
  { type:'GST', name:'GSTR-1 Filing',   dates:['2026-04-11','2026-05-11','2026-06-11','2026-07-11','2026-08-11','2026-09-11','2026-10-11','2026-11-11','2026-12-11','2027-01-11','2027-02-11','2027-03-11'], period_fmt:(d)=>{ const m=new Date(d); m.setMonth(m.getMonth()-1); return m.toLocaleString('en-IN',{month:'long',year:'numeric'}); } },
  { type:'GST', name:'GSTR-3B Filing',  dates:['2026-04-20','2026-05-20','2026-06-20','2026-07-20','2026-08-20','2026-09-20','2026-10-20','2026-11-20','2026-12-20','2027-01-20','2027-02-20','2027-03-20'], period_fmt:(d)=>{ const m=new Date(d); m.setMonth(m.getMonth()-1); return m.toLocaleString('en-IN',{month:'long',year:'numeric'}); } },
  // TDS
  { type:'TDS', name:'TDS Return Q1',   dates:['2026-07-30'], period_fmt:()=>'Apr–Jun 2026' },
  { type:'TDS', name:'TDS Return Q2',   dates:['2026-10-30'], period_fmt:()=>'Jul–Sep 2026' },
  { type:'TDS', name:'TDS Return Q3',   dates:['2027-01-30'], period_fmt:()=>'Oct–Dec 2026' },
  { type:'TDS', name:'TDS Return Q4',   dates:['2026-04-30'], period_fmt:()=>'Jan–Mar 2026' },
  // ITR
  { type:'ITR', name:'ITR Filing',      dates:['2026-07-31'], period_fmt:()=>'FY 2025-26' },
  { type:'ITR', name:'Belated ITR',     dates:['2026-12-31'], period_fmt:()=>'FY 2025-26' },
  // Advance Tax
  { type:'Advance Tax', name:'Advance Tax 1st Instalment', dates:['2026-06-15'], period_fmt:()=>'FY 2026-27 (15%)' },
  { type:'Advance Tax', name:'Advance Tax 2nd Instalment', dates:['2026-09-15'], period_fmt:()=>'FY 2026-27 (45%)' },
  { type:'Advance Tax', name:'Advance Tax 3rd Instalment', dates:['2026-12-15'], period_fmt:()=>'FY 2026-27 (75%)' },
  { type:'Advance Tax', name:'Advance Tax Final',           dates:['2027-03-15'], period_fmt:()=>'FY 2026-27 (100%)' },
  // PF
  { type:'PF/ESI', name:'PF & ESI Deposit', dates:['2026-04-30','2026-05-31','2026-06-30','2026-07-31','2026-08-31','2026-09-30','2026-10-31','2026-11-30','2026-12-31','2027-01-31','2027-02-28','2027-03-31'], period_fmt:(d)=>{ const m=new Date(d); m.setMonth(m.getMonth()-1); return m.toLocaleString('en-IN',{month:'long',year:'numeric'}); } },
];

// ── Check deadlines and create notifications ────────────────
async function checkAndCreateDeadlineNotifications() {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const users = await sbFetch('users','GET',null,'?notifications_enabled=eq.true&select=id,email,name');
    if (!users?.length) return;

    const filings = await sbFetch('filings','GET',null,'?status=in.(pending,in_progress)&select=*');

    for (const user of users) {
      const userFilings = (filings||[]).filter(f => f.user_id === user.id);

      for (const filing of userFilings) {
        if (!filing.due_date) continue;
        const due = new Date(filing.due_date); due.setHours(0,0,0,0);
        const daysLeft = Math.ceil((due - today) / 86400000);

        // Send notification at 7 days and 2 days before
        if (daysLeft === 7 || daysLeft === 2) {
          const urgency = daysLeft === 2 ? '🚨 URGENT' : '⚠️ Reminder';
          const title = `${urgency}: ${filing.filing_type} due in ${daysLeft} days`;
          const message = `Your ${filing.filing_type} for ${filing.period} is due on ${due.toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}. Please ensure all documents are ready.`;

          // Check if notification already sent today
          const existing = await sbFetch('notifications','GET',null,
            `?user_id=eq.${user.id}&title=eq.${encodeURIComponent(title)}&select=id`);
          if (existing?.length) continue;

          // Create notification
          await sbFetch('notifications','POST',{
            user_id: user.id,
            title,
            message,
            type: 'deadline',
            is_read: false,
            link: 'dashboard.html#filings'
          });
        }

        // Mark as overdue if past due date
        if (daysLeft < 0 && filing.status !== 'overdue') {
          await sbFetch('filings','PATCH',{status:'overdue'},`?id=eq.${filing.id}`);
          await sbFetch('notifications','POST',{
            user_id: user.id,
            title: `🔴 Overdue: ${filing.filing_type}`,
            message: `Your ${filing.filing_type} for ${filing.period} was due on ${due.toLocaleDateString('en-IN',{day:'numeric',month:'long'})}. Please file immediately to avoid penalties.`,
            type: 'deadline',
            is_read: false,
            link: 'dashboard.html#filings'
          });
        }
      }
    }
    console.log('Deadline notifications checked:', new Date().toLocaleString('en-IN'));
  } catch(e) {
    console.error('Notification check error:', e);
  }
}

// ── Auto-update compliance calendar each year ───────────────
async function autoUpdateCompliances() {
  try {
    const now = new Date();
    const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

    // Check if current FY deadlines already exist
    const existing = await sbFetch('filings','GET',null,
      `?period=like.FY ${currentFY}-${(currentFY+1).toString().slice(2)}*&select=id&limit=1`);
    if (existing?.length) return; // Already exists

    // Get all active users
    const users = await sbFetch('users','GET',null,'?select=id');

    for (const user of users) {
      // Create standard annual filings for new FY
      const newFilings = [
        { filing_type:'GSTR-9 Annual Return', period:`FY ${currentFY}-${(currentFY+1).toString().slice(2)}`, due_date:`${currentFY+1}-12-31`, status:'pending' },
        { filing_type:'Income Tax Return (ITR)', period:`FY ${currentFY}-${(currentFY+1).toString().slice(2)}`, due_date:`${currentFY+1}-07-31`, status:'pending' },
        { filing_type:'Tax Audit', period:`FY ${currentFY}-${(currentFY+1).toString().slice(2)}`, due_date:`${currentFY+1}-09-30`, status:'pending' },
      ];
      for (const f of newFilings) {
        await sbFetch('filings','POST',{ user_id: user.id, ...f });
      }
    }
    console.log('Compliance auto-update done for FY:', `${currentFY}-${currentFY+1}`);
  } catch(e) {
    console.error('Auto-update error:', e);
  }
}

// ── Run checks when page loads (from dashboard) ─────────────
async function runNotificationCheck() {
  await checkAndCreateDeadlineNotifications();
}

// ── Browser Push Notification Permission ───────────────────
async function requestPushPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

// ── Show browser push notification ─────────────────────────
function showBrowserNotification(title, body, url='/dashboard.html') {
  if (Notification.permission !== 'granted') return;
  const notif = new Notification(title, {
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-96.png',
    tag: 'kas-deadline',
    requireInteraction: true
  });
  notif.onclick = () => { window.focus(); window.location.href = url; notif.close(); };
}

// ── Check for due deadlines and show browser notifications ──
async function checkBrowserNotifications(userId) {
  if (!userId) return;
  try {
    const unread = await sbFetch('notifications','GET',null,
      `?user_id=eq.${userId}&is_read=eq.false&order=created_at.desc&limit=5`);
    if (unread?.length) {
      const latest = unread[0];
      showBrowserNotification(latest.title, latest.message);
    }
  } catch(e) { console.warn('Browser notif error:', e); }
}

export {
  checkAndCreateDeadlineNotifications,
  autoUpdateCompliances,
  runNotificationCheck,
  requestPushPermission,
  showBrowserNotification,
  checkBrowserNotifications
};
