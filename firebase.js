// ============================================================
// Kunwar Accounting Services — Firebase Auth (COMPAT VERSION)
// Uses Firebase 9 Compat CDN — NO ES modules, works everywhere
// Requires Firebase CDN scripts to be loaded in HTML first:
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"></script>
// ============================================================

(function() {
  var FB_CONFIG = {
    apiKey:            "AIzaSyDZYQYkyqUYqhmzu2vOtIdX2SrHDROiM0Y",
    authDomain:        "kunwar-accounting.firebaseapp.com",
    projectId:         "kunwar-accounting",
    storageBucket:     "kunwar-accounting.firebasestorage.app",
    messagingSenderId: "775485451446",
    appId:             "1:775485451446:web:6aa2c71f32302680670a17"
  };

  var _auth = null;

  function getKasAuth() {
    if (_auth) return _auth;
    try {
      firebase.initializeApp(FB_CONFIG);
    } catch(e) { /* already initialized */ }
    _auth = firebase.auth();
    _auth.languageCode = 'en';
    return _auth;
  }

  var ADMIN_EMAIL = 'sukant@kunwaraccountingservices.in';
  var SUPABASE_URL = 'https://lkvmlgpuktbxohtuvwmb.supabase.co';

  function getKey() {
    return window.SUPABASE_ANON_KEY || '';
  }

  // Save user to localStorage
  window.kasSaveUser = function(u) {
    if (!u) { localStorage.removeItem('kas_user_data'); return; }
    localStorage.setItem('kas_user_data', JSON.stringify({
      uid: u.uid, email: u.email || '',
      name: u.displayName || u.email || 'Client',
      phone: u.phoneNumber || '', photo: u.photoURL || ''
    }));
  };

  window.kasGetUser = function() {
    try { return JSON.parse(localStorage.getItem('kas_user_data') || 'null'); } catch(e) { return null; }
  };

  window.kasIsAdmin = function(u) {
    var user = u || window.kasGetUser();
    return user && user.email === ADMIN_EMAIL;
  };

  // Sync to Supabase (best effort)
  window.kasSyncDB = function(u) {
    var key = getKey();
    if (!u || !key || key.includes('PASTE')) return;
    var h = { 'apikey':key, 'Authorization':'Bearer '+key, 'Content-Type':'application/json', 'Prefer':'return=representation' };
    var b = { firebase_uid:u.uid, email:u.email||'', name:u.displayName||'', phone:u.phoneNumber||'', photo_url:u.photoURL||'', last_login:new Date().toISOString() };
    fetch(SUPABASE_URL+'/rest/v1/users?firebase_uid=eq.'+u.uid, { method:'PATCH', headers:h, body:JSON.stringify(b) })
      .then(function(r){return r.json();})
      .then(function(d){
        if (!d || !d.length) {
          fetch(SUPABASE_URL+'/rest/v1/users', { method:'POST', headers:h, body:JSON.stringify(Object.assign({role:'client',created_at:new Date().toISOString()},b)) });
        }
      }).catch(function(){});
  };

  // Auth state observer
  window.kasOnAuthChanged = function(cb) {
    var auth = getKasAuth();
    return auth.onAuthStateChanged(function(user) {
      if (user) window.kasSaveUser(user);
      else localStorage.removeItem('kas_user_data');
      cb(user);
    });
  };

  // Email login
  window.kasSignInEmail = function(email, pwd) {
    return getKasAuth().signInWithEmailAndPassword(email, pwd)
      .then(function(c) { window.kasSaveUser(c.user); window.kasSyncDB(c.user); return c.user; });
  };

  // Email signup
  window.kasSignUpEmail = function(email, pwd, name, phone) {
    return getKasAuth().createUserWithEmailAndPassword(email, pwd)
      .then(function(c) {
        return c.user.updateProfile({displayName: name}).then(function() {
          var u = {uid:c.user.uid, email:email, displayName:name, phoneNumber:phone, photoURL:''};
          window.kasSaveUser(u); window.kasSyncDB(u); return c.user;
        });
      });
  };

  // Google sign-in
  window.kasSignInGoogle = function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    return getKasAuth().signInWithPopup(provider)
      .then(function(r) { window.kasSaveUser(r.user); window.kasSyncDB(r.user); return r.user; });
  };

  // Sign out
  window.kasSignOut = function() {
    return getKasAuth().signOut().then(function() {
      localStorage.removeItem('kas_user_data');
      localStorage.removeItem('kas_tool_access');
    });
  };

  // Password reset
  window.kasResetPassword = function(email) {
    return getKasAuth().sendPasswordResetEmail(email);
  };

  // Get current Firebase user
  window.kasCurrentUser = function() {
    return getKasAuth().currentUser;
  };

})();
