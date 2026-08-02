// ============================================================
// Kunwar Accounting Services — Navigation
// Plain JS — no ES module imports, works everywhere
// ============================================================
//
// PATH RESOLUTION NOTES:
// The site is deployed on Vercel with rewrites (see vercel.json) that keep
// every page's URL flat at root (e.g. /about.html) even though the actual
// files live in subfolders (e.g. /pages/marketing/about.html). Because of
// that, every href below can stay as a plain filename ("about.html") and
// will resolve correctly on the live site with zero changes needed.
//
// The ONLY time these plain filenames break is when someone opens an HTML
// file directly by double-clicking it (a file:// URL), because there's no
// server there to apply the Vercel rewrites. kasResolveHref() below detects
// that case and rewrites the link to the correct real relative path instead.
// On the live (http/https) site this function is a no-op passthrough.

var KAS_FILE_LOCATIONS = {
  'firebase.js': 'js', 'gst-tools-utils.js': 'js',
  'nav.js': 'js', 'notifications.js': 'js', 'supabase.js': 'js',
  'compliance-calendar.html': 'tools/calculators', 'depreciation-calculator.html': 'tools/calculators',
  'emi-calculator.html': 'tools/calculators', 'gst-calculator.html': 'tools/calculators',
  'gst-checker.html': 'tools/calculators', 'hra-calculator.html': 'tools/calculators',
  'invoice-generator.html': 'tools/calculators', 'itr-calculator.html': 'tools/calculators',
  'late-fee-calculator.html': 'tools/calculators', 'pl-calculator.html': 'tools/calculators',
  'salary-calculator.html': 'tools/calculators', 'tools.html': 'tools/calculators',
  'ecom-to-tally.html': 'tools/ecommerce', 'gst-2a-2b-reconcile.html': 'tools/ecommerce',
  'gst-error-report.html': 'tools/ecommerce', 'gst-online-seller.html': 'tools/ecommerce',
  'gstr1-json-excel.html': 'tools/ecommerce', 'gstr1-json-validator.html': 'tools/ecommerce',
  'merge-excel-files.html': 'tools/ecommerce',
  'about.html': 'pages/marketing', 'contact.html': 'pages/marketing', 'packages.html': 'pages/marketing',
  'payment.html': 'pages/marketing', 'services.html': 'pages/marketing', 'testimonials.html': 'pages/marketing',
  'admin-login.html': 'pages/account', 'admin.html': 'pages/account',
  'dashboard.html': 'pages/account', 'login.html': 'pages/account',
  'index.html': '', '404.html': ''
};

// Works out which folder the CURRENT page is physically sitting in, purely
// from window.location.pathname (only meaningful for file:// browsing).
function kasCurrentFolder() {
  var path = window.location.pathname.replace(/\\/g, '/');
  var known = ['tools/calculators', 'tools/ecommerce', 'pages/marketing', 'pages/account', 'js'];
  for (var i = 0; i < known.length; i++) {
    if (path.indexOf('/' + known[i] + '/') !== -1) return known[i];
  }
  return '';
}

// Rewrites a plain filename ("about.html") to the correct relative path.
// No-op (returns unchanged) on the live http(s) site, where Vercel's
// rewrites already make plain filenames resolve correctly.
window.kasResolveHref = function(filename) {
  if (!filename || window.location.protocol !== 'file:') return filename;
  if (/^[a-z]+:|^\/|^#|^\.\.?\//i.test(filename)) return filename; // already absolute/relative/anchor/protocol
  var bare = filename.split('#')[0].split('?')[0];
  if (!(bare in KAS_FILE_LOCATIONS)) return filename; // unknown file, leave untouched

  var targetFolder = KAS_FILE_LOCATIONS[bare];
  var currentFolder = kasCurrentFolder();
  if (targetFolder === currentFolder) return filename; // same folder — sibling reference just works

  var depth = currentFolder === '' ? 0 : currentFolder.split('/').length;
  var up = new Array(depth + 1).join('../');
  return up + (targetFolder ? targetFolder + '/' : '') + filename;
};

// Scans the whole page for <a href="plain-file.html"> links pointing at
// known site pages and fixes them up for file:// browsing. No-op on the
// live site. Safe to call multiple times.
function kasFixLocalLinks() {
  if (window.location.protocol !== 'file:') return;
  var anchors = document.querySelectorAll('a[href]');
  for (var i = 0; i < anchors.length; i++) {
    var href = anchors[i].getAttribute('href');
    var resolved = window.kasResolveHref(href);
    if (resolved !== href) anchors[i].setAttribute('href', resolved);
  }
}

function injectNav(active) {
  var pages = [
    { id:'home',         label:'Home',       href:'index.html' },
    { id:'services',     label:'Services',   href:'services.html' },
    { id:'packages',     label:'Packages',   href:'packages.html' },
    { id:'testimonials', label:'Reviews',    href:'testimonials.html' },
    { id:'about',        label:'About',      href:'about.html' },
    { id:'contact',      label:'Contact',    href:'contact.html' },
    { id:'tools',        label:'Free Tools', href:'tools.html' },
  ];

  // Get user from localStorage
  var userData = null;
  try { userData = JSON.parse(localStorage.getItem('kas_user_data') || 'null'); } catch(e) {}
  var isLoggedIn = !!userData;
  var uName = userData ? (userData.name || userData.email || 'Account') : '';
  var initials = uName.split(' ').map(function(w){return w[0];}).join('').toUpperCase().slice(0,2) || '?';

  var navLinks = pages.map(function(p) {
    return '<li><a href="'+kasResolveHref(p.href)+'"'+(p.id===active?' class="active"':'')+'>'+p.label+'</a></li>';
  }).join('');

  var accountBtn = isLoggedIn
    ? '<a href="'+kasResolveHref('dashboard.html')+'" class="btn-account"><div class="btn-account-avatar">'+initials+'</div>'+uName.split(' ')[0]+'</a>'
    : '<a href="'+kasResolveHref('login.html')+'" class="btn-account"><div class="btn-account-avatar">👤</div>Login</a>';

  var mobileLinks = pages.map(function(p) { return '<a href="'+kasResolveHref(p.href)+'">'+p.label+'</a>'; }).join('');
  mobileLinks += isLoggedIn
    ? '<a href="'+kasResolveHref('dashboard.html')+'">👤 My Account</a><a href="#" onclick="kasNavLogout()" style="color:#DC2626;">Logout</a>'
    : '<a href="'+kasResolveHref('login.html')+'">👤 Login / Sign Up</a>';
  mobileLinks += '<a href="'+kasResolveHref('payment.html')+'" style="color:var(--gold);font-weight:600;">💳 Pay Now</a>';
  mobileLinks += '<a href="'+kasResolveHref('tools.html')+'">🛠️ Free Tools</a>';
  mobileLinks += '<a href="'+kasResolveHref('compliance-calendar.html')+'">📅 Tax Calendar</a>';

  var navEl = document.getElementById('nav-placeholder');
  if (!navEl) return;

  navEl.innerHTML =
    '<nav>'+
      '<a class="nav-logo" href="'+kasResolveHref('index.html')+'">'+
        '<div class="nav-logo-icon">'+
          '<svg width="22" height="22" viewBox="0 0 28 28" fill="none">'+
            '<rect x="4" y="14" width="4" height="10" rx="1" fill="white"/>'+
            '<rect x="12" y="9" width="4" height="15" rx="1" fill="white"/>'+
            '<rect x="20" y="4" width="4" height="20" rx="1" fill="white"/>'+
            '<path d="M6 12 L14 7 L22 4" stroke="#85B7EB" stroke-width="1.5" stroke-linecap="round"/>'+
          '</svg>'+
        '</div>'+
        '<div class="nav-logo-text"><span>Kunwar</span><span>Accounting Services</span></div>'+
      '</a>'+
      '<ul class="nav-links">'+navLinks+'</ul>'+
      '<div class="nav-actions">'+
        accountBtn+
        '<a href="'+kasResolveHref('payment.html')+'" class="btn-pay">Pay Now</a>'+
        '<a href="'+kasResolveHref('contact.html')+'" class="nav-cta">Free Consultation</a>'+
      '</div>'+
      '<button class="hamburger" onclick="document.getElementById(\'mob-nav\').classList.toggle(\'open\')" aria-label="Menu">'+
        '<span></span><span></span><span></span>'+
      '</button>'+
    '</nav>'+
    '<div class="mobile-nav" id="mob-nav">'+mobileLinks+'</div>';

  var footerEl = document.getElementById('footer-placeholder');
  if (footerEl) {
    var footerLinks = pages.map(function(p){return '<a href="'+kasResolveHref(p.href)+'">'+p.label+'</a>';}).join('');
    footerLinks += '<a href="'+kasResolveHref('payment.html')+'">Pay Now</a>';
    footerLinks += '<a href="'+kasResolveHref('compliance-calendar.html')+'">Tax Calendar</a>';
    footerLinks += isLoggedIn ? '<a href="'+kasResolveHref('dashboard.html')+'">My Account</a>' : '<a href="'+kasResolveHref('login.html')+'">Login</a>';

    footerEl.innerHTML =
      '<footer>'+
        '<div class="footer-links">'+footerLinks+'</div>'+
        '<p><strong>Kunwar Accounting Services</strong><br>'+
        'Dwarka, New Delhi &nbsp;·&nbsp;'+
        '<a href="tel:+918076136300" style="color:rgba(255,255,255,0.6);text-decoration:none;">+91 80761 36300</a> &nbsp;·&nbsp;'+
        '<a href="mailto:sukant@kunwaraccountingservices.in" style="color:rgba(255,255,255,0.6);text-decoration:none;">sukant@kunwaraccountingservices.in</a><br>'+
        '<a href="https://www.kunwaraccountingservices.in" style="color:rgba(255,255,255,0.45);font-size:11px;text-decoration:none;">www.kunwaraccountingservices.in</a><br>'+
        '© '+new Date().getFullYear()+' Kunwar Accounting Services. All rights reserved.</p>'+
      '</footer>'+
      '<a href="https://wa.me/918076136300?text=Hi!%20I%20want%20to%20book%20a%20free%20consultation." target="_blank" rel="noopener" id="wa-float" title="Chat on WhatsApp">'+
        '<svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>'+
        '<span class="wa-label">Chat with us</span>'+
      '</a>';
  }

  // Fix up any other plain hardcoded links elsewhere on the page (CTA
  // buttons, footer-style links inside page content, etc.) for file://
  // browsing. No-op on the live http(s) site.
  kasFixLocalLinks();
}

window.kasNavLogout = function() {
  var target = kasResolveHref('index.html');
  if (typeof kasSignOut === 'function') {
    kasSignOut().then(function() { window.location.href = target; });
  } else {
    localStorage.removeItem('kas_user_data');
    localStorage.removeItem('kas_tool_access');
    window.location.href = target;
  }
};
