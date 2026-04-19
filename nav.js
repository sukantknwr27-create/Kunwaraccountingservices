function injectNav(active) {
  const pages = [
    { id:'home',      label:'Home',      href:'index.html' },
    { id:'services',  label:'Services',  href:'services.html' },
    { id:'packages',  label:'Packages',  href:'packages.html' },
    { id:'testimonials', label:'Reviews', href:'testimonials.html' },
    { id:'about',     label:'About',     href:'about.html' },
    { id:'contact',   label:'Contact',   href:'contact.html' },
    { id:'tools',     label:'Free Tools', href:'tools.html' },
  ];

  const loggedIn  = !!localStorage.getItem('kas_token');
  const user      = loggedIn ? JSON.parse(localStorage.getItem('kas_user')||'{}') : null;
  const uName     = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';
  const initials  = uName.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);

  const navLinks = pages.map(p =>
    `<li><a href="${p.href}"${p.id===active?' class="active"':''}>${p.label}</a></li>`
  ).join('');

  const accountBtn = loggedIn
    ? `<a href="dashboard.html" class="btn-account"><div class="btn-account-avatar">${initials}</div>${uName.split(' ')[0]}</a>`
    : '';

  const mobileExtra = loggedIn
    ? `<a href="dashboard.html">👤 My Account</a><a href="#" onclick="localStorage.removeItem('kas_token');localStorage.removeItem('kas_user');window.location.href='index.html';" style="color:#DC2626;">Logout</a>`
    : `<a href="login.html">👤 Login / My Account</a>`;

  const mobileLinks = pages.map(p=>`<a href="${p.href}">${p.label}</a>`).join('') + mobileExtra +
    `<a href="payment.html" style="color:var(--gold);font-weight:600;">💳 Pay Now</a>
     <a href="compliance-calendar.html">📅 Tax Calendar</a>
     <a href="gst-checker.html">🔍 GST Checker</a>`;

  document.getElementById('nav-placeholder').innerHTML = `
    <nav>
      <a class="nav-logo" href="index.html">
        <div class="nav-logo-icon">
          <svg width="22" height="22" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="14" width="4" height="10" rx="1" fill="white"/>
            <rect x="12" y="9" width="4" height="15" rx="1" fill="white"/>
            <rect x="20" y="4" width="4" height="20" rx="1" fill="white"/>
            <path d="M6 12 L14 7 L22 4" stroke="#85B7EB" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </div>
        <div class="nav-logo-text"><span>Kunwar</span><span>Accounting Services</span></div>
      </a>
      <ul class="nav-links">${navLinks}</ul>
      <div class="nav-actions">
        ${accountBtn}
        <a href="payment.html" class="btn-pay">Pay Now</a>
        <a href="contact.html" class="nav-cta">Book Free Consultation</a>
      </div>
      <button class="hamburger" onclick="document.getElementById('mob-nav').classList.toggle('open')" aria-label="Menu">
        <span></span><span></span><span></span>
      </button>
    </nav>
    <div class="mobile-nav" id="mob-nav">${mobileLinks}</div>
  `;

  document.getElementById('footer-placeholder').innerHTML = `
    <footer>
      <div class="footer-links">
        ${pages.map(p=>`<a href="${p.href}">${p.label}</a>`).join('')}
        <a href="payment.html">Pay Now</a>
        <a href="compliance-calendar.html">Tax Calendar</a>
        <a href="gst-checker.html">GST Checker</a>
        ${loggedIn ? '<a href="dashboard.html">My Account</a>' : '<a href="login.html">Login</a>'}
      </div>
      <p><strong>Kunwar Accounting Services</strong><br>
      Dwarka, New Delhi &nbsp;·&nbsp;
      <a href="tel:+918076136300" style="color:rgba(255,255,255,0.6);text-decoration:none;">+91 80761 36300</a> &nbsp;·&nbsp;
      <a href="mailto:sukant@kunwaraccountingservices.in" style="color:rgba(255,255,255,0.6);text-decoration:none;">sukant@kunwaraccountingservices.in</a><br>
      <a href="https://www.kunwaraccountingservices.in" style="color:rgba(255,255,255,0.45);font-size:11px;text-decoration:none;">www.kunwaraccountingservices.in</a><br>
      © 2025 Kunwar Accounting Services. All rights reserved.</p>
    </footer>

    <a href="https://wa.me/918076136300?text=Hi!%20I%20want%20to%20book%20a%20free%20consultation." target="_blank" rel="noopener" id="wa-float" title="Chat on WhatsApp">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      <span class="wa-label">Chat with us</span>
    </a>
  `;
}
