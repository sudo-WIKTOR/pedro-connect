// ===== Pedro Connect – Client =====
const { createClient } = supabase;
let sb = null;
let currentUser = null;
let currentProfile = null;
let currentView = 'home';
let viewingProfileId = null;
let authReady = false;
let searchTimer = null;

function initSupabase() {
  if (
    SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
    SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY'
  ) {
    console.warn('Replace SUPABASE_URL and SUPABASE_ANON_KEY in js/supabase-config.js');
    return null;
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

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
const composeCard = document.querySelector('.compose-card');
const modalRoot = document.getElementById('modal-root');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

let isSignup = false;

function refreshIcons() {
  if (window.lucide) lucide.createIcons();
}

function setNav(view) {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}

tabLogin.addEventListener('click', () => {
  isSignup = false;
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  usernameGroup.classList.add('hidden');
  authBtn.textContent = 'Login';
  authError.textContent = '';
  passwordInput.autocomplete = 'current-password';
});

tabSignup.addEventListener('click', () => {
  isSignup = true;
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  usernameGroup.classList.remove('hidden');
  authBtn.textContent = 'Sign Up';
  authError.textContent = '';
  passwordInput.autocomplete = 'new-password';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!sb) return;

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

      const { error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { username } }
      });

      if (error) throw error;

      authError.textContent = 'Account created! You can now log in.';
      tabLogin.click();
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
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

async function loadUser() {
  if (!sb) return;

  const {
    data: { session }
  } = await sb.auth.getSession();

  if (!session) {
    currentUser = null;
    currentProfile = null;
    showAuth();
    return;
  }

  currentUser = session.user;

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) console.error('Could not load profile:', error);

  currentProfile = profile;

  currentUserEl.innerHTML = renderUserName(
    profile || { username: currentUser.email, is_verified: false }
  );

  showMain();
  if (currentView === 'profile') {
    showProfile(viewingProfileId || currentUser.id);
  } else if (currentView === 'search') {
    showSearch();
  } else {
    showHome();
  }
}

function showAuth() {
  authScreen.classList.remove('hidden');
  mainScreen.classList.add('hidden');
  closeModal();
}

function showMain() {
  authScreen.classList.add('hidden');
  mainScreen.classList.remove('hidden');
  refreshIcons();
}

document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    const view = btn.dataset.view;
    setNav(view);

    if (view === 'home') showHome();
    if (view === 'search') showSearch();
    if (view === 'profile') showProfile(currentUser?.id);
  });
});

currentUserEl.addEventListener('click', () => {
  if (!currentUser) return;
  setNav('profile');
  showProfile(currentUser.id);
});

function showHome() {
  currentView = 'home';
  viewingProfileId = null;
  composeCard?.classList.remove('hidden');
  loadPosts();
}

function showSearch(preset) {
  currentView = 'search';
  viewingProfileId = null;
  composeCard?.classList.add('hidden');

  postsList.innerHTML = `
    <div class="search-card">
      <label class="input-group" style="margin:0">
        <span class="hidden">Search people</span>
        <input id="user-search" class="search-input" type="search" placeholder="Search people" maxlength="40" value="${escapeHtml(preset || '')}" />
      </label>
    </div>
    <div id="search-results"></div>
  `;

  const input = document.getElementById('user-search');
  input?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchUsers(input.value), 220);
  });

  if (preset) searchUsers(preset);
  else {
    document.getElementById('search-results').innerHTML =
      '<div class="empty-state"><p>Search for people on Pedro Connect</p></div>';
  }

  refreshIcons();
  input?.focus();
}

async function searchUsers(query) {
  const results = document.getElementById('search-results');
  if (!results) return;

  const q = (query || '')
    .trim()
    .replace(/^@/, '')
    .replace(/[%_,.()\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 40);

  if (q.length < 1) {
    results.innerHTML = '<div class="empty-state"><p>Search for people on Pedro Connect</p></div>';
    return;
  }

  results.innerHTML = '<div class="empty-state"><p>Searching…</p></div>';

  const { data, error } = await sb
    .from('profiles')
    .select('id, username, display_name, is_verified, bio')
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .limit(30);

  if (error) {
    results.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  if (!data || data.length === 0) {
    results.innerHTML = '<div class="empty-state"><p>No people found</p></div>';
    return;
  }

  results.innerHTML = data.map(renderUserCard).join('');
  bindUserLinks();
}

function renderUserCard(profile) {
  const display = profile.display_name || profile.username || 'Unknown';
  const initial = escapeHtml(String(display).charAt(0).toUpperCase());

  return `
    <button class="user-card" type="button" data-profile-id="${profile.id}">
      <div class="avatar">${initial}</div>
      <div class="user-card-meta">
        ${renderUserName(profile)}
        <div class="user-card-handle">@${escapeHtml(profile.username || 'unknown')}</div>
      </div>
    </button>
  `;
}

async function showProfile(userId) {
  if (!userId) return;

  currentView = 'profile';
  viewingProfileId = userId;
  composeCard?.classList.add('hidden');

  postsList.innerHTML = '<div class="empty-state"><p>Loading profile…</p></div>';

  const { data: profile, error } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    postsList.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error?.message || 'User not found')}</p>
      </div>
    `;
    return;
  }

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

  const { count: followersCount } = await sb
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', userId);

  const { count: followingCount } = await sb
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', userId);

  const isOwnProfile = currentUser && currentUser.id === userId;

  const followBtnHtml = isOwnProfile
    ? ''
    : `<button id="follow-btn" class="btn ${isFollowing ? 'outline' : 'primary'}" type="button">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>`;

  const bioHtml = profile.bio
    ? `<p class="profile-bio">${escapeHtml(profile.bio)}</p>`
    : '';

  postsList.innerHTML = `
    <div class="profile-card">
      <div class="profile-header">
        <div class="avatar profile-avatar">
          ${escapeHtml(String(profile.display_name || profile.username || 'U').charAt(0).toUpperCase())}
        </div>
        <div class="profile-info">
          <div class="profile-display">${renderUserName(profile)}</div>
          <div class="profile-handle">@${escapeHtml(profile.username || 'unknown')}</div>
          ${bioHtml}
          <div class="profile-stats">
            <button class="stat-btn" type="button" data-list="following" data-user-id="${profile.id}">
              <strong>${followingCount || 0}</strong> Following
            </button>
            <button class="stat-btn" type="button" data-list="followers" data-user-id="${profile.id}">
              <strong>${followersCount || 0}</strong> Followers
            </button>
          </div>
          <div class="profile-actions">${followBtnHtml}</div>
        </div>
      </div>
    </div>
    <div id="profile-posts"></div>
  `;

  const followBtn = document.getElementById('follow-btn');
  if (followBtn) {
    followBtn.addEventListener('click', () => toggleFollow(userId, followBtn));
  }

  postsList.querySelectorAll('.stat-btn').forEach((btn) => {
    btn.addEventListener('click', () => openPeopleList(btn.dataset.list, btn.dataset.userId));
  });

  loadUserPosts(userId);
  refreshIcons();
}

async function openPeopleList(kind, userId) {
  modalTitle.textContent = kind === 'followers' ? 'Followers' : 'Following';
  modalBody.innerHTML = '<div class="empty-state"><p>Loading…</p></div>';
  modalRoot.classList.remove('hidden');
  refreshIcons();

  const column = kind === 'followers' ? 'following_id' : 'follower_id';
  const other = kind === 'followers' ? 'follower_id' : 'following_id';

  const { data: rows, error } = await sb
    .from('follows')
    .select(`${other}`)
    .eq(column, userId);

  if (error) {
    modalBody.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  const ids = [...new Set((rows || []).map((r) => r[other]).filter(Boolean))];
  if (!ids.length) {
    modalBody.innerHTML = `<div class="empty-state"><p>No ${kind} yet</p></div>`;
    return;
  }

  const { data: people, error: peopleError } = await sb
    .from('profiles')
    .select('id, username, display_name, is_verified, bio')
    .in('id', ids);

  if (peopleError) {
    modalBody.innerHTML = `<div class="empty-state"><p>${escapeHtml(peopleError.message)}</p></div>`;
    return;
  }

  modalBody.innerHTML = (people || []).map(renderUserCard).join('');
  bindUserLinks();
}

function closeModal() {
  modalRoot.classList.add('hidden');
  modalBody.innerHTML = '';
}

modalClose.addEventListener('click', closeModal);
modalRoot.addEventListener('click', (e) => {
  if (e.target === modalRoot) closeModal();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

async function toggleFollow(userId, btn) {
  if (!currentUser) return;

  const isFollowing = btn.textContent.trim() === 'Following';

  try {
    if (isFollowing) {
      const { error } = await sb
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);
      if (error) throw error;

      btn.textContent = 'Follow';
      btn.classList.remove('outline');
      btn.classList.add('primary');
    } else {
      const { error } = await sb.from('follows').insert({
        follower_id: currentUser.id,
        following_id: userId
      });
      if (error) throw error;

      btn.textContent = 'Following';
      btn.classList.remove('primary');
      btn.classList.add('outline');
    }

    showProfile(userId);
  } catch (err) {
    alert(err.message);
  }
}

async function loadUserPosts(userId) {
  const container = document.getElementById('profile-posts');
  if (!container) return;

  container.innerHTML = '<div class="empty-state"><p>Loading posts…</p></div>';

  const { data: posts, error } = await fetchPostsQuery().eq('user_id', userId);

  if (error) {
    container.innerHTML = `<div class="empty-state"><p>${escapeHtml(error.message)}</p></div>`;
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No posts yet</p></div>';
    return;
  }

  container.innerHTML = posts.map(renderPost).join('');
  afterPostsRender();
}

function fetchPostsQuery() {
  return sb
    .from('posts')
    .select(`
      id,
      body,
      created_at,
      user_id,
      profiles!posts_user_id_fkey (
        username,
        display_name,
        is_verified
      ),
      likes (
        id,
        user_id
      )
    `)
    .order('created_at', { ascending: false });
}

logoutBtn.addEventListener('click', async () => {
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  showAuth();
});

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
    postBtn.disabled = true;

    if (currentView === 'home') loadPosts();
    else showProfile(currentUser.id);
  } catch (err) {
    alert(err.message);
    postBtn.disabled = false;
  } finally {
    postBtn.textContent = 'Post';
  }
});

async function loadPosts() {
  postsList.innerHTML = `
    <div class="empty-state">
      <i data-lucide="loader"></i>
      <p>Loading…</p>
    </div>
  `;
  refreshIcons();

  try {
    const { data: posts, error } = await fetchPostsQuery().limit(50);
    if (error) throw error;

    if (!posts || posts.length === 0) {
      postsList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="message-circle"></i>
          <p>No posts yet. Be the first!</p>
        </div>
      `;
      refreshIcons();
      return;
    }

    postsList.innerHTML = posts.map(renderPost).join('');
    afterPostsRender();
  } catch (err) {
    postsList.innerHTML = `
      <div class="empty-state">
        <p>Error loading posts: ${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

function renderPost(post) {
  const profile = post.profiles || {};
  const username = profile.username || 'unknown';
  const display = profile.display_name || username;
  const initial = String(display).charAt(0).toUpperCase();
  const likes = post.likes || [];
  const liked = currentUser && likes.some((l) => l.user_id === currentUser.id);

  return `
    <article class="post-card" data-id="${post.id}">
      <div class="post-header">
        <button class="avatar" type="button" data-profile-id="${post.user_id}" title="View profile">
          ${escapeHtml(initial)}
        </button>
        <div class="post-meta">
          <button class="post-author" type="button" data-profile-id="${post.user_id}">
            ${renderUserName(profile)}
          </button>
          <span class="post-time">@${escapeHtml(username)} · ${formatTime(post.created_at)}</span>
        </div>
      </div>
      <div class="post-body">${escapeHtml(post.body)}</div>
      <div class="post-actions">
        <button class="action-btn comment-btn" data-post-id="${post.id}" type="button">
          <i data-lucide="message-circle"></i>
          <span class="comment-count">0</span>
        </button>
        <button class="action-btn like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}" type="button">
          <i data-lucide="heart"></i>
          <span>${likes.length}</span>
        </button>
      </div>
      <div class="comments-section hidden" id="comments-${post.id}">
        <div class="comments-list"></div>
        <form class="comment-form" data-post-id="${post.id}">
          <input class="comment-input" maxlength="280" placeholder="Write a comment…" autocomplete="off" />
          <button class="comment-submit" type="submit">Reply</button>
        </form>
      </div>
    </article>
  `;
}

function afterPostsRender() {
  refreshIcons();
  bindPostActions();
  bindUserLinks();
  loadCommentCounts();
}

function bindUserLinks() {
  document.querySelectorAll('[data-profile-id]').forEach((el) => {
    el.onclick = () => {
      const id = el.dataset.profileId;
      if (!id) return;
      closeModal();
      setNav(currentUser && id === currentUser.id ? 'profile' : 'profile');
      showProfile(id);
    };
  });
}

function bindPostActions() {
  document.querySelectorAll('.like-btn').forEach((btn) => {
    btn.onclick = () => toggleLike(btn.dataset.postId, btn);
  });

  document.querySelectorAll('.comment-btn').forEach((btn) => {
    btn.onclick = () => toggleComments(btn.dataset.postId);
  });

  document.querySelectorAll('.comment-form').forEach((form) => {
    form.onsubmit = async (e) => {
      e.preventDefault();
      await submitComment(form.dataset.postId, form);
    };
  });
}

async function toggleLike(postId, btn) {
  if (!currentUser) return;

  const isLiked = btn.classList.contains('liked');
  const countSpan = btn.querySelector('span');
  let count = parseInt(countSpan.textContent, 10) || 0;

  try {
    if (isLiked) {
      const { error } = await sb.from('likes').delete().match({
        post_id: postId,
        user_id: currentUser.id
      });
      if (error) throw error;
      btn.classList.remove('liked');
      countSpan.textContent = Math.max(0, count - 1);
    } else {
      const { error } = await sb.from('likes').insert({
        post_id: postId,
        user_id: currentUser.id
      });
      if (error) throw error;
      btn.classList.add('liked');
      countSpan.textContent = count + 1;
    }
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

async function toggleComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  if (!section) return;

  section.classList.toggle('hidden');
  if (!section.classList.contains('hidden')) {
    await loadComments(postId);
    section.querySelector('.comment-input')?.focus();
  }
}

async function loadCommentCounts() {
  const postIds = [...document.querySelectorAll('.post-card[data-id]')]
    .map((card) => card.dataset.id)
    .filter(Boolean);

  if (!postIds.length) return;

  const { data, error } = await sb.from('comments').select('post_id').in('post_id', postIds);

  if (error) {
    console.error('Could not load comment counts:', error);
    return;
  }

  const counts = {};
  (data || []).forEach((comment) => {
    counts[comment.post_id] = (counts[comment.post_id] || 0) + 1;
  });

  document.querySelectorAll('.comment-btn').forEach((btn) => {
    const span = btn.querySelector('.comment-count');
    if (span) span.textContent = counts[btn.dataset.postId] || 0;
  });
}

async function loadComments(postId) {
  const section = document.getElementById(`comments-${postId}`);
  const list = section?.querySelector('.comments-list');
  if (!list) return;

  list.innerHTML = '<div class="comment-loading">Loading comments…</div>';

  const { data: comments, error } = await sb
    .from('comments')
    .select(`
      id,
      body,
      created_at,
      user_id,
      profiles!comments_user_id_fkey (
        username,
        display_name,
        is_verified
      )
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) {
    list.innerHTML = `<div class="comment-loading">${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!comments || comments.length === 0) {
    list.innerHTML = '<div class="comment-loading">No comments yet.</div>';
    return;
  }

  list.innerHTML = comments
    .map((comment) => {
      const profile = comment.profiles || {};
      const display = profile.display_name || profile.username || 'Unknown';

      return `
        <div class="comment-item">
          <button class="avatar comment-avatar" type="button" data-profile-id="${comment.user_id}">
            ${escapeHtml(String(display).charAt(0).toUpperCase())}
          </button>
          <div class="comment-content">
            <div class="comment-meta">
              <button class="post-author" type="button" data-profile-id="${comment.user_id}">
                ${renderUserName(profile)}
              </button>
              <span>@${escapeHtml(profile.username || 'unknown')} · ${formatTime(comment.created_at)}</span>
            </div>
            <div class="comment-body">${escapeHtml(comment.body)}</div>
          </div>
        </div>
      `;
    })
    .join('');

  bindUserLinks();
  refreshIcons();
}

async function submitComment(postId, form) {
  if (!currentUser) return;

  const input = form.querySelector('.comment-input');
  const submit = form.querySelector('.comment-submit');
  const body = input.value.trim();
  if (!body || body.length > 280) return;

  submit.disabled = true;
  submit.textContent = 'Posting…';

  try {
    const { error } = await sb.from('comments').insert({
      post_id: postId,
      user_id: currentUser.id,
      body
    });
    if (error) throw error;

    input.value = '';
    await loadComments(postId);

    const countSpan = document.querySelector(
      `.comment-btn[data-post-id="${postId}"] .comment-count`
    );
    if (countSpan) {
      countSpan.textContent = String((parseInt(countSpan.textContent, 10) || 0) + 1);
    }
  } catch (err) {
    alert(err.message);
  } finally {
    submit.disabled = false;
    submit.textContent = 'Reply';
  }
}

function formatTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';

  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString();
}

document.addEventListener('DOMContentLoaded', async () => {
  sb = initSupabase();

  if (!sb) {
    authError.textContent =
      'Please configure your Supabase keys in js/supabase-config.js';
    return;
  }

  sb.auth.onAuthStateChange((event, session) => {
    if (!authReady) return;
    if (event === 'SIGNED_OUT' || !session) {
      currentUser = null;
      currentProfile = null;
      showAuth();
      return;
    }
    if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      loadUser();
    }
  });

  await loadUser();
  authReady = true;
  refreshIcons();
});
