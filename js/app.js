// ===== Pedro Connect – Client =====
const { createClient } = supabase;
let sb = null;
let currentUser = null;
let currentProfile = null;
let currentView = 'home'; // 'home' or 'profile'
let viewingProfileId = null;

// ---------- Init ----------
function initSupabase() {
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
    console.warn('⚠️ Replace SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-config.js');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// ---------- DOM refs ----------
const authScreen = document.getElementById('auth-screen');
const mainScreen = document.getElementById('main-screen');
const authForm = document.getElementById('auth-form');
const authBtn = document.getElementById('auth-btn');
const authError = document.getElementById('auth-error');
const tabLogin = document.getElementById('tab-login');
const tabSignup = document.getElementById('tab-signup');
const usernameGroup = document.getElementById('username-group');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const usernameInput = document.getElementById('username');
const postContent = document.getElementById('post-content');
const charCount = document.getElementById('char-count');
const postBtn = document.getElementById('post-btn');
const postsList = document.getElementById('posts-list');
const currentUserEl = document.getElementById('current-user');
const logoutBtn = document.getElementById('logout-btn');

let isSignup = false;

// ---------- Auth Tabs ----------
tabLogin.addEventListener('click', () => {
  isSignup = false;
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  usernameGroup.classList.add('hidden');
  authBtn.textContent = 'Login';
  authError.textContent = '';
});

tabSignup.addEventListener('click', () => {
  isSignup = true;
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  usernameGroup.classList.remove('hidden');
  authBtn.textContent = 'Sign Up';
  authError.textContent = '';
});

// ---------- Auth Submit ----------
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  authError.textContent = '';
  authBtn.disabled = true;
  authBtn.textContent = isSignup ? 'Creating…' : 'Logging in…';

  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const username = usernameInput.value.trim().toLowerCase();

  try {
    if (isSignup) {
      if (!username || username.length < 3) {
        throw new Error('Username must be at least 3 characters');
      }

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });
      if (error) throw error;

      authError.textContent = 'Account created! You can now log in.';
      tabLogin.click();
    } else {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadUser();
    }
  } catch (err) {
    authError.textContent = err.message || 'Something went wrong';
  } finally {
    authBtn.disabled = false;
    authBtn.textContent = isSignup ? 'Sign Up' : 'Login';
  }
});

// ---------- Session ----------
async function loadUser() {
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    showAuth();
    return;
  }
  currentUser = session.user;

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  currentProfile = profile;
  currentUserEl.textContent = profile?.username ? `@${profile.username}` : currentUser.email;
  showMain();
  showHome();
}

function showAuth() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
}

function showMain() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  lucide.createIcons();
}

// ---------- Navigation ----------
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const view = btn.dataset.view;
    if (view === 'home') showHome();
    if (view === 'profile') showProfile(currentUser.id);
  });
});

function showHome() {
  currentView = 'home';
  viewingProfileId = null;
  document.querySelector('.compose-card').classList.remove('hidden');
  loadPosts();
}

async function showProfile(userId) {
  currentView = 'profile';
  viewingProfileId = userId;
  document.querySelector('.compose-card').classList.add('hidden');

  // Load profile info
  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    postsList.innerHTML = `<div class="empty-state"><p>User not found</p></div>`;
    return;
  }

  // Check if following
  let isFollowing = false;
  if (currentUser && currentUser.id !== userId) {
    const { data: follow } = await sb
      .from('follows')
      .select('id')
      .eq('follower_id', currentUser.id)
      .eq('following_id', userId)
      .maybeSingle();
    isFollowing = !!follow;
  }

  // Count followers / following
  const { count: followersCount } = await sb
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: followingCount } = await sb
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  // Render profile header
  const isOwnProfile = currentUser && currentUser.id === userId;
  const followBtnHtml = isOwnProfile ? '' : `
    <button id="follow-btn" class="btn ${isFollowing ? '' : 'primary'}" style="width:auto; margin-top:1rem;">
      ${isFollowing ? 'Following' : 'Follow'}
    </button>
  `;

  postsList.innerHTML = `
    <div class="post-card" style="margin-bottom:1.5rem;">
      <div style="display:flex; align-items:center; gap:1rem;">
        <div class="avatar" style="width:64px; height:64px; font-size:1.5rem;">
          ${(profile.display_name || profile.username || 'U').charAt(0).toUpperCase()}
        </div>
        <div>
          <div style="font-weight:700; font-size:1.25rem;">${escapeHtml(profile.display_name || profile.username)}</div>
          <div style="color:var(--text-muted);">@${escapeHtml(profile.username)}</div>
          <div style="margin-top:0.5rem; color:var(--text-muted); font-size:0.9rem;">
            <strong style="color:var(--text);">${followingCount || 0}</strong> Following
            · 
            <strong style="color:var(--text);">${followersCount || 0}</strong> Followers
          </div>
          ${followBtnHtml}
        </div>
      </div>
    </div>
    <div id="profile-posts"></div>
  `;

  // Follow button handler
  const followBtn = document.getElementById('follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', () => toggleFollow(userId, followBtn));
  }

  // Load this user's posts
  loadUserPosts(userId);
}

async function toggleFollow(userId, btn) {
  if (!currentUser) return;

  const isFollowing = btn.textContent.trim() === 'Following';

  try {
    if (isFollowing) {
      await sb.from('follows').delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);
      btn.textContent = 'Follow';
      btn.classList.add('primary');
    } else {
      await sb.from('follows').insert({
        follower_id: currentUser.id,
        following_id: userId
      });
      btn.textContent = 'Following';
      btn.classList.remove('primary');
    }
    // Refresh counts
    showProfile(userId);
  } catch (err) {
    alert(err.message);
  }
}

async function loadUserPosts(userId) {
  const container = document.getElementById('profile-posts');
  if (!container) return;

  container.innerHTML = '<div class="empty-state"><p>Loading posts…</p></div>';

  const { data: posts, error } = await sb
    .from('posts')
    .select(`
      id, body, created_at, user_id,
      profiles!posts_user_id_fkey (username, display_name),
      likes (id, user_id)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No posts yet</p></div>`;
    return;
  }

  container.innerHTML = posts.map(p => renderPost(p)).join('');
  lucide.createIcons();

  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleLike(btn.dataset.postId, btn));
  });
}

// ---------- Logout ----------
logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showAuth();
});

// ---------- Compose ----------
postContent.addEventListener('input', () => {
  const len = postContent.value.length;
  charCount.textContent = `${len}/280`;
  postBtn.disabled = len === 0 || len > 280;
});

postBtn.addEventListener('click', async () => {
  const content = postContent.value.trim();
  if (!content || !currentUser) return;

  postBtn.disabled = true;
  postBtn.textContent = 'Posting…';

  try {
    const { error } = await sb.from('posts').insert({
      user_id: currentUser.id,
      body: content
    });
    if (error) throw error;
    postContent.value = '';
    charCount.textContent = '0/280';
    if (currentView === 'home') loadPosts();
    else showProfile(currentUser.id);
  } catch (err) {
    alert(err.message);
  } finally {
    postBtn.disabled = false;
    postBtn.textContent = 'Post';
  }
});

// ---------- Load Posts (Home) ----------
async function loadPosts() {
  postsList.innerHTML = '<div class="empty-state"><i data-lucide="loader"></i><p>Loading…</p></div>';
  lucide.createIcons();

  try {
    const { data: posts, error } = await sb
      .from('posts')
      .select(`
        id, body, created_at, user_id,
        profiles!posts_user_id_fkey (username, display_name),
        likes (id, user_id)
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      postsList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="message-circle"></i>
          <p>No posts yet. Be the first!</p>
        </div>`;
      lucide.createIcons();
      return;
    }

    postsList.innerHTML = posts.map(post => renderPost(post)).join('');
    lucide.createIcons();

    document.querySelectorAll('.like-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleLike(btn.dataset.postId, btn));
    });
  } catch (err) {
    postsList.innerHTML = `<div class="empty-state"><p>Error loading posts: ${err.message}</p></div>`;
  }
}

function renderPost(post) {
  const profile = post.profiles || {};
  const username = profile.username || 'unknown';
  const display = profile.display_name || username;
  const initial = display.charAt(0).toUpperCase();
  const time = formatTime(post.created_at);
  const likes = post.likes || [];
  const likeCount = likes.length;
  const liked = currentUser && likes.some(l => l.user_id === currentUser.id);

  return `
    <article class="post-card" data-id="${post.id}">
      <div class="post-header">
        <div class="avatar">${initial}</div>
        <div class="post-meta">
          <span class="post-author" style="cursor:pointer;" onclick="showProfile('${post.user_id}')">
            ${escapeHtml(display)}
          </span>
          <span class="post-time">@${escapeHtml(username)} · ${time}</span>
        </div>
      </div>
      <div class="post-body">${escapeHtml(post.body)}</div>
      <div class="post-actions">
        <button class="action-btn like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}">
          <i data-lucide="heart"></i>
          <span>${likeCount}</span>
        </button>
      </div>
    </article>
  `;
}

async function toggleLike(postId, btn) {
  if (!currentUser) return;

  const isLiked = btn.classList.contains('liked');
  const countSpan = btn.querySelector('span');
  let count = parseInt(countSpan.textContent) || 0;

  try {
    if (isLiked) {
      await sb.from('likes').delete().match({ post_id: postId, user_id: currentUser.id });
      btn.classList.remove('liked');
      countSpan.textContent = Math.max(0, count - 1);
    } else {
      await sb.from('likes').insert({ post_id: postId, user_id: currentUser.id });
      btn.classList.add('liked');
      countSpan.textContent = count + 1;
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// ---------- Helpers ----------
function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', async () => {
  sb = initSupabase();
  if (!sb) {
    authError.textContent = 'Please configure your Supabase keys in js/supabase-config.js';
    return;
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (session) loadUser();
    else showAuth();
  });

  await loadUser();
  lucide.createIcons();
});
