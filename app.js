/* ============================================================
   Fireside Corner — shared site logic
   Stores accounts, the logged-in session, and posted notices in
   localStorage, so state survives page navigation, refreshes,
   and the browser's back/forward buttons across every page.
   ============================================================ */

const DB = {
  KEY_USERS: 'ff_users',
  KEY_SESSION: 'ff_session',
  KEY_NOTICES: 'ff_notices',

  getUsers() {
    return JSON.parse(localStorage.getItem(this.KEY_USERS) || '[]');
  },
  saveUsers(users) {
    localStorage.setItem(this.KEY_USERS, JSON.stringify(users));
  },
  findUser(identifier) {
    identifier = (identifier || '').trim().toLowerCase();
    return this.getUsers().find(
      u => u.email.toLowerCase() === identifier || u.phone.replace(/\s/g, '') === identifier.replace(/\s/g, '')
    );
  },
  registerUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    return user;
  },

  getSession() {
    return JSON.parse(localStorage.getItem(this.KEY_SESSION) || 'null');
  },
  setSession(user) {
    // never keep the password in the live session record
    const { password, ...safeUser } = user;
    localStorage.setItem(this.KEY_SESSION, JSON.stringify(safeUser));
  },
  clearSession() {
    localStorage.removeItem(this.KEY_SESSION);
  },

  getNotices() {
    return JSON.parse(localStorage.getItem(this.KEY_NOTICES) || '[]');
  },
  saveNotices(notices) {
    localStorage.setItem(this.KEY_NOTICES, JSON.stringify(notices));
  },
  addNotice(notice) {
    const notices = this.getNotices();
    notices.unshift(notice);
    this.saveNotices(notices);
    return notice;
  },
  getNoticesByUser(email) {
    return this.getNotices().filter(n => n.postedBy === email);
  }
};

/* ---------- shared nav: swaps Log In / Sign Up for the
   user's name / Log Out once a session exists ---------- */
function renderAuthNav() {
  const loginBtn = document.getElementById('loginBtn');
  const signupBtn = document.getElementById('signupBtn');
  if (!loginBtn || !signupBtn) return;

  const session = DB.getSession();
  if (session) {
    loginBtn.textContent = session.fullName.split(' ')[0];
    loginBtn.onclick = () => { window.location.href = 'profile.html'; };
    signupBtn.textContent = 'Log Out';
    signupBtn.onclick = () => {
      DB.clearSession();
      window.location.href = 'lost-and-found.html';
    };
  } else {
    loginBtn.textContent = 'Log In';
    loginBtn.onclick = () => { window.location.href = 'login.html'; };
    signupBtn.textContent = 'Sign Up';
    signupBtn.onclick = () => { window.location.href = 'signup.html'; };
  }
}

/* ---------- main board: render live notices, falling back
   to sample notices the first time the site is opened ---------- */
function renderNoticeFeed() {
  const list = document.getElementById('noticeFeedList');
  if (!list) return;

  let notices = DB.getNotices();
  if (notices.length === 0) {
    notices = [
      { type: 'found', desc: 'Grey tabby cat, green collar', where: 'Near Elm St. Park', when: '2 hrs ago' },
      { type: 'lost', desc: 'Navy backpack, laptop inside', where: 'Corner Café, 5th Ave', when: 'yesterday' },
      { type: 'found', desc: 'Set of house keys, red keychain', where: 'Riverside Trail', when: '2 days ago' }
    ];
  }

  list.innerHTML = notices.slice(0, 6).map(n => `
    <li>
      <div>${n.desc}<br><span class="where">${n.where} · ${n.when || 'just now'}</span></div>
      <span class="tag ${n.type}">${n.type === 'lost' ? 'Lost' : 'Found'}</span>
    </li>
  `).join('');
}

/* ---------- report forms (lost / found): save a notice
   and send the person back to the board ---------- */
function wireReportForm(formId, type) {
  const form = document.getElementById(formId);
  if (!form) return;

  const photoInput = document.getElementById('photos');
  const photoDrop = document.getElementById('photoDrop');
  const previewGrid = document.getElementById('previewGrid');
  let selectedFiles = [];

  function renderPreviews() {
    previewGrid.innerHTML = '';
    selectedFiles.forEach((file, idx) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb';
        thumb.innerHTML = `<img src="${e.target.result}" alt="${file.name}"><button type="button" aria-label="Remove photo">×</button>`;
        thumb.querySelector('button').addEventListener('click', () => {
          selectedFiles.splice(idx, 1);
          renderPreviews();
        });
        previewGrid.appendChild(thumb);
      };
      reader.readAsDataURL(file);
    });
  }

  photoInput.addEventListener('change', (e) => {
    selectedFiles = selectedFiles.concat(Array.from(e.target.files));
    renderPreviews();
  });

  ['dragover', 'dragleave', 'drop'].forEach(evt => {
    photoDrop.addEventListener(evt, (e) => {
      e.preventDefault();
      photoDrop.classList.toggle('dragover', evt === 'dragover');
    });
  });

  photoDrop.addEventListener('drop', (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    selectedFiles = selectedFiles.concat(files);
    renderPreviews();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const session = DB.getSession();

    const finish = (photoDataUrl) => {
      DB.addNotice({
        type,
        desc: document.getElementById('itemName').value.trim(),
        category: document.getElementById('category').value,
        where: document.getElementById('location').value.trim() || 'Location not given',
        description: document.getElementById('description').value.trim(),
        contactNumber: document.getElementById('contactNumber').value.trim(),
        contactEmail: document.getElementById('contactEmail').value.trim(),
        photo: photoDataUrl || null,
        postedBy: session ? session.email : null,
        postedByName: session ? session.fullName : 'Guest',
        when: 'just now',
        status: 'open'
      });
      document.getElementById('successMsg').style.display = 'block';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => { window.location.href = 'lost-and-found.html'; }, 900);
    };

    if (selectedFiles[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => finish(ev.target.result);
      reader.readAsDataURL(selectedFiles[0]);
    } else {
      finish(null);
    }
  });
}

/* ---------- login page ---------- */
function wireLoginForm() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const identifier = document.getElementById('identifier').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMsg = document.getElementById('errorMsg');

    const user = DB.findUser(identifier);
    if (!user || user.password !== password) {
      errorMsg.textContent = user
        ? 'That password doesn\'t match. Try again.'
        : 'No account found with that phone/email. Try signing up.';
      errorMsg.style.display = 'block';
      return;
    }
    DB.setSession(user);
    window.location.href = 'profile.html';
  });
}

/* ---------- signup page ---------- */
function wireSignupForm() {
  const form = document.getElementById('signupForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const fullName = document.getElementById('fullName').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const terms = document.getElementById('terms').checked;
    const errorMsg = document.getElementById('errorMsg');

    if (!fullName || !phone || !email || !password || !terms) {
      errorMsg.textContent = 'Please fill in all required fields.';
      errorMsg.style.display = 'block';
      return;
    }
    if (DB.findUser(email) || DB.findUser(phone)) {
      errorMsg.textContent = 'An account with that phone or email already exists. Try logging in.';
      errorMsg.style.display = 'block';
      return;
    }

    const user = { fullName, phone, email, password, joined: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
    DB.registerUser(user);
    DB.setSession(user);
    window.location.href = 'profile.html';
  });
}

/* ---------- profile page ---------- */
function renderProfile() {
  const idInfo = document.getElementById('profileName');
  if (!idInfo) return;

  const session = DB.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  document.getElementById('profileName').textContent = session.fullName;
  document.getElementById('profileAvatar').textContent = session.fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('profileSince').textContent = `Member since ${session.joined || 'recently'}`;
  document.getElementById('profilePhone').textContent = session.phone;
  document.getElementById('profileEmail').textContent = session.email;

  const notices = DB.getNoticesByUser(session.email);
  const list = document.getElementById('myNoticesList');
  if (notices.length === 0) {
    list.innerHTML = `<div class="notice-row"><div class="desc">You haven't posted any notices yet.</div></div>`;
  } else {
    list.innerHTML = notices.map(n => `
      <div class="notice-row">
        <div>
          <div class="desc">${n.desc}</div>
          <div class="meta">Posted ${n.where} · ${n.when}</div>
        </div>
        <span class="tag ${n.status === 'resolved' ? 'resolved' : n.type}">${n.status === 'resolved' ? 'Resolved' : (n.type === 'lost' ? 'Lost' : 'Found')}</span>
      </div>
    `).join('');
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    DB.clearSession();
    window.location.href = 'lost-and-found.html';
  });
}

/* ---------- run whatever this page needs, every time the
   page is shown — including via back/forward navigation,
   which bfcache can restore without firing 'load' ---------- */
function initPage() {
  renderAuthNav();
  renderNoticeFeed();
  wireReportForm('lostForm', 'lost');
  wireReportForm('foundForm', 'found');
  wireLoginForm();
  wireSignupForm();
  renderProfile();
}

document.addEventListener('DOMContentLoaded', initPage);
window.addEventListener('pageshow', (e) => {
  if (e.persisted) initPage();
});
