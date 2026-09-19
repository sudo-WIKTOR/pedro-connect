// ===== Pedro Connect – Client =====
const { createClient } = supabase;
let sb = null;
let currentUser = null;
let currentProfile = null;
let currentView = 'home';
let viewingProfileId = null;

// ---------- Init ----------
function initSupabase() {
  if (
    SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
    SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY'
  ) {
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

      const { error } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });

      if (error) throw error;

      authError.textContent = 'Account created! You can now log in.';
      tabLogin.click();

    } else {
      const { error } = await sb.auth.signInWithPassword({
        email,
        password
      });

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
  const {
    data: { session }
  } = await sb.auth.getSession();

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

  currentUserEl.textContent =
    profile?.username
      ? `@${profile.username}`
      : currentUser.email;

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

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ---------- Navigation ----------
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document
      .querySelectorAll('.nav-item')
      .forEach(b => b.classList.remove('active'));

    btn.classList.add('active');

    const view = btn.dataset.view;

    if (view === 'home') {
      showHome();
    }

    if (view === 'profile') {
      showProfile(currentUser.id);
    }
  });
});

function showHome() {
  currentView = 'home';
  viewingProfileId = null;

  document
    .querySelector('.compose-card')
    ?.classList.remove('hidden');

  loadPosts();
}

// ---------- Verified Badge ----------
function renderVerifiedBadge(isVerified) {
  if (!isVerified) return '';

  return `
    <span
      class="verified-badge"
      title="Verified"
      aria-label="Verified"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M21.6 12c0 1.1-1.1 1.9-1.4 2.9-.3 1 .1 2.3-.5 3.1-.7.8-2 .6-2.9 1.1-.9.5-1.4 1.7-2.4 2-1 .3-2-.5-3-.5s-2 .8-3 .5c-1-.3-1.5-1.5-2.4-2-.9-.5-2.2-.3-2.9-1.1-.6-.8-.2-2.1-.5-3.1C2.5 13.9 1.4 13.1 1.4 12s1.1-1.9 1.4-2.9c.3-1-.1-2.3.5-3.1.7-.8 2-.6 2.9-1.1.9-.5 1.4-1.7 2.4-2 1-.3 2 .5 3 .5s2-.8 3-.5c1 .3 1.5 1.5 2.4 2 .9.5 2.2.3 2.9 1.1.6.8.2 2.1.5 3.1.3 1 1.4 1.8 1.4 2.9Z"
        />
        <path
          class="verified-check"
          d="m8.2 12.2 2.4 2.4 5.2-5.2"
        />
      </svg>
    </span>
  `;
}

// ---------- Profile ----------
async function showProfile(userId) {
  currentView = 'profile';
  viewingProfileId = userId;

  document
    .querySelector('.compose-card')
    ?.classList.add('hidden');

  const { data: profile } = await sb
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    postsList.innerHTML = `
      <div class="empty-state">
        <p>User not found</p>
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
    .select('*', {
      count: 'exact',
      head: true
    })
    .eq('following_id', userId);

  const { count: followingCount } = await sb
    .from('follows')
    .select('*', {
      count: 'exact',
      head: true
    })
    .eq('follower_id', userId);

  const isOwnProfile =
    currentUser &&
    currentUser.id === userId;

  const followBtnHtml = isOwnProfile
    ? ''
    : `
      <button
        id="follow-btn"
        class="btn ${isFollowing ? '' : 'primary'}"
        style="width:auto; margin-top:1rem;"
      >
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;

  const verifiedBadge =
    renderVerifiedBadge(profile.is_verified);

  const bioHtml = profile.bio
    ? `
      <p
        style="
          margin-top:.5rem;
          margin-bottom:.5rem;
          color:var(--text);
          font-size:.95rem;
        "
      >
        ${escapeHtml(profile.bio)}
      </p>
    `
    : '';

  postsList.innerHTML = `
    <div
      class="post-card"
      style="margin-bottom:1.5rem;"
    >
      <div
        style="
          display:flex;
          align-items:center;
          gap:1rem;
        "
      >

        <div
          class="avatar"
          style="
            width:64px;
            height:64px;
            font-size:1.5rem;
          "
        >
          ${(profile.display_name || profile.username || 'U')
            .charAt(0)
            .toUpperCase()}
        </div>

        <div>

          <div
            style="
              font-weight:700;
              font-size:1.25rem;
              display:flex;
              align-items:center;
            "
          >
            ${escapeHtml(
              profile.display_name || profile.username
            )}
            ${verifiedBadge}
          </div>

          <div style="color:var(--text-muted);">
            @${escapeHtml(profile.username)}
          </div>

          ${bioHtml}

          <div
            style="
              margin-top:.5rem;
              color:var(--text-muted);
              font-size:.9rem;
            "
          >
            <strong style="color:var(--text);">
              ${followingCount || 0}
            </strong>
            Following
            ·
            <strong style="color:var(--text);">
              ${followersCount || 0}
            </strong>
            Followers
          </div>

          ${followBtnHtml}

        </div>
      </div>
    </div>

    <div id="profile-posts"></div>
  `;

  const followBtn =
    document.getElementById('follow-btn');

  if (followBtn) {
    followBtn.addEventListener(
      'click',
      () => toggleFollow(userId, followBtn)
    );
  }

  loadUserPosts(userId);

  if (window.lucide) {
    lucide.createIcons();
  }
}

// ---------- Follow ----------
async function toggleFollow(userId, btn) {
  if (!currentUser) return;

  const isFollowing =
    btn.textContent.trim() === 'Following';

  try {
    if (isFollowing) {

      await sb
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId);

      btn.textContent = 'Follow';
      btn.classList.add('primary');

    } else {

      await sb
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: userId
        });

      btn.textContent = 'Following';
      btn.classList.remove('primary');
    }

    showProfile(userId);

  } catch (err) {
    alert(err.message);
  }
}

// ---------- User Posts ----------
async function loadUserPosts(userId) {
  const container =
    document.getElementById('profile-posts');

  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <p>Loading posts…</p>
    </div>
  `;

  const { data: posts, error } = await sb
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
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false
    });

  if (error) {
    container.innerHTML = `
      <div class="empty-state">
        <p>${escapeHtml(error.message)}</p>
      </div>
    `;
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No posts yet</p>
      </div>
    `;
    return;
  }

  container.innerHTML =
    posts.map(p => renderPost(p)).join('');

  if (window.lucide) {
    lucide.createIcons();
  }

  bindPostActions();
  loadCommentCounts();
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

  postBtn.disabled =
    len === 0 ||
    len > 280;
});

postBtn.addEventListener('click', async () => {
  const content =
    postContent.value.trim();

  if (!content || !currentUser) return;

  postBtn.disabled = true;
  postBtn.textContent = 'Posting…';

  try {
    const { error } = await sb
      .from('posts')
      .insert({
        user_id: currentUser.id,
        body: content
      });

    if (error) throw error;

    postContent.value = '';
    charCount.textContent = '0/280';

    if (currentView === 'home') {
      loadPosts();
    } else {
      showProfile(currentUser.id);
    }

  } catch (err) {
    alert(err.message);

  } finally {
    postBtn.disabled = false;
    postBtn.textContent = 'Post';
  }
});

// ---------- Load Posts ----------
async function loadPosts() {
  postsList.innerHTML = `
    <div class="empty-state">
      <i data-lucide="loader"></i>
      <p>Loading…</p>
    </div>
  `;

  if (window.lucide) {
    lucide.createIcons();
  }

  try {
    const { data: posts, error } = await sb
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
      .order('created_at', {
        ascending: false
      })
      .limit(50);

    if (error) throw error;

    if (!posts || posts.length === 0) {
      postsList.innerHTML = `
        <div class="empty-state">
          <i data-lucide="message-circle"></i>
          <p>No posts yet. Be the first!</p>
        </div>
      `;

      if (window.lucide) {
        lucide.createIcons();
      }

      return;
    }

    postsList.innerHTML =
      posts.map(post => renderPost(post)).join('');

    if (window.lucide) {
      lucide.createIcons();
    }

    bindPostActions();
    loadCommentCounts();

  } catch (err) {
    postsList.innerHTML = `
      <div class="empty-state">
        <p>
          Error loading posts:
          ${escapeHtml(err.message)}
        </p>
      </div>
    `;
  }
}

// ---------- Render Post ----------
function renderPost(post) {
  const profile = post.profiles || {};

  const username =
    profile.username || 'unknown';

  const display =
    profile.display_name || username;

  const initial =
    display.charAt(0).toUpperCase();

  const time =
    formatTime(post.created_at);

  const likes =
    post.likes || [];

  const likeCount =
    likes.length;

  const liked =
    currentUser &&
    likes.some(
      l => l.user_id === currentUser.id
    );

  return `
    <article
      class="post-card"
      data-id="${post.id}"
    >

      <div class="post-header">

        <div class="avatar">
          ${escapeHtml(initial)}
        </div>

        <div class="post-meta">

          <span
            class="post-author"
            style="cursor:pointer;"
            onclick="showProfile('${post.user_id}')"
          >
            ${escapeHtml(display)}
            ${renderVerifiedBadge(profile.is_verified)}
          </span>

          <span class="post-time">
            @${escapeHtml(username)}
            ·
            ${time}
          </span>

        </div>
      </div>

      <div class="post-body">
        ${escapeHtml(post.body)}
      </div>

      <div class="post-actions">

        <button
          class="action-btn comment-btn"
          data-post-id="${post.id}"
          type="button"
        >
          <i data-lucide="message-circle"></i>
          <span class="comment-count">0</span>
        </button>

        <button
          class="action-btn like-btn ${liked ? 'liked' : ''}"
          data-post-id="${post.id}"
          type="button"
        >
          <i data-lucide="heart"></i>
          <span>${likeCount}</span>
        </button>

      </div>

      <div
        class="comments-section hidden"
        id="comments-${post.id}"
      >

        <div class="comments-list"></div>

        <form
          class="comment-form"
          data-post-id="${post.id}"
        >

          <input
            class="comment-input"
            maxlength="280"
            placeholder="Write a comment…"
            autocomplete="off"
          >

          <button
            class="comment-submit"
            type="submit"
          >
            Reply
          </button>

        </form>

      </div>

    </article>
  `;
}

// ---------- Post Actions ----------
function bindPostActions() {

  document
    .querySelectorAll('.like-btn')
    .forEach(btn => {

      btn.onclick = () =>
        toggleLike(
          btn.dataset.postId,
          btn
        );
    });

  document
    .querySelectorAll('.comment-btn')
    .forEach(btn => {

      btn.onclick = () =>
        toggleComments(
          btn.dataset.postId
        );
    });

  document
    .querySelectorAll('.comment-form')
    .forEach(form => {

      form.onsubmit = async e => {
        e.preventDefault();

        await submitComment(
          form.dataset.postId,
          form
        );
      };
    });
}

// ---------- Likes ----------
async function toggleLike(postId, btn) {
  if (!currentUser) return;

  const isLiked =
    btn.classList.contains('liked');

  const countSpan =
    btn.querySelector('span');

  let count =
    parseInt(countSpan.textContent) || 0;

  try {

    if (isLiked) {

      const { error } = await sb
        .from('likes')
        .delete()
        .match({
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) throw error;

      btn.classList.remove('liked');

      countSpan.textContent =
        Math.max(0, count - 1);

    } else {

      const { error } = await sb
        .from('likes')
        .insert({
          post_id: postId,
          user_id: currentUser.id
        });

      if (error) throw error;

      btn.classList.add('liked');

      countSpan.textContent =
        count + 1;
    }

  } catch (err) {
    console.error(err);
    alert(err.message);
  }
}

// ---------- Comments ----------
async function toggleComments(postId) {

  const section =
    document.getElementById(
      `comments-${postId}`
    );

  if (!section) return;

  section.classList.toggle('hidden');

  if (!section.classList.contains('hidden')) {

    await loadComments(postId);

    section
      .querySelector('.comment-input')
      ?.focus();
  }
}

async function loadCommentCounts() {

  const postIds = [
    ...document.querySelectorAll(
      '.post-card[data-id]'
    )
  ]
    .map(card => card.dataset.id)
    .filter(Boolean);

  if (!postIds.length) return;

  const { data, error } = await sb
    .from('comments')
    .select('post_id')
    .in('post_id', postIds);

  if (error) {
    console.error(
      'Could not load comment counts:',
      error
    );
    return;
  }

  const counts = {};

  (data || []).forEach(comment => {

    counts[comment.post_id] =
      (counts[comment.post_id] || 0) + 1;
  });

  document
    .querySelectorAll('.comment-btn')
    .forEach(btn => {

      const count =
        counts[btn.dataset.postId] || 0;

      const span =
        btn.querySelector('.comment-count');

      if (span) {
        span.textContent = count;
      }
    });
}

async function loadComments(postId) {

  const section =
    document.getElementById(
      `comments-${postId}`
    );

  const list =
    section?.querySelector(
      '.comments-list'
    );

  if (!list) return;

  list.innerHTML =
    '<div class="comment-loading">Loading comments…</div>';

  const { data: comments, error } =
    await sb
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
      .order('created_at', {
        ascending: true
      });

  if (error) {

    list.innerHTML = `
      <div class="comment-loading">
        ${escapeHtml(error.message)}
      </div>
    `;

    return;
  }

  if (!comments || comments.length === 0) {

    list.innerHTML =
      '<div class="comment-loading">No comments yet.</div>';

    return;
  }

  list.innerHTML =
    comments.map(comment => {

      const profile =
        comment.profiles || {};

      const display =
        profile.display_name ||
        profile.username ||
        'Unknown';

      return `
        <div class="comment-item">

          <div class="avatar comment-avatar">
            ${escapeHtml(
              display.charAt(0).toUpperCase()
            )}
          </div>

          <div class="comment-content">

            <div class="comment-meta">

              <strong>
                ${escapeHtml(display)}
              </strong>

              ${renderVerifiedBadge(
                profile.is_verified
              )}

              <span>
                @${escapeHtml(
                  profile.username || 'unknown'
                )}
                ·
                ${formatTime(comment.created_at)}
              </span>

            </div>

            <div class="comment-body">
              ${escapeHtml(comment.body)}
            </div>

          </div>

        </div>
      `;
    })
    .join('');

  if (window.lucide) {
    lucide.createIcons();
  }
}

async function submitComment(postId, form) {

  if (!currentUser) return;

  const input =
    form.querySelector('.comment-input');

  const submit =
    form.querySelector('.comment-submit');

  const body =
    input.value.trim();

  if (!body || body.length > 280) return;

  submit.disabled = true;
  submit.textContent = 'Posting…';

  try {

    const { error } =
      await sb
        .from('comments')
        .insert({
          post_id: postId,
          user_id: currentUser.id,
          body
        });

    if (error) throw error;

    input.value = '';

    await loadComments(postId);

    const countSpan =
      document.querySelector(
        `.comment-btn[data-post-id="${postId}"] .comment-count`
      );

    if (countSpan) {

      countSpan.textContent =
        String(
          (parseInt(countSpan.textContent) || 0) + 1
        );
    }

  } catch (err) {

    alert(err.message);

  } finally {

    submit.disabled = false;
    submit.textContent = 'Reply';
  }
}

// ---------- Helpers ----------
function formatTime(iso) {

  const d = new Date(iso);
  const now = new Date();

  const diff =
    (now - d) / 1000;

  if (diff < 60)
    return 'just now';

  if (diff < 3600)
    return `${Math.floor(diff / 60)}m`;

  if (diff < 86400)
    return `${Math.floor(diff / 3600)}h`;

  return d.toLocaleDateString();
}

function escapeHtml(str) {

  const div =
    document.createElement('div');

  div.textContent = str;

  return div.innerHTML;
}

// ---------- Boot ----------
document.addEventListener(
  'DOMContentLoaded',
  async () => {

    sb = initSupabase();

    if (!sb) {

      authError.textContent =
        'Please configure your Supabase keys in js/supabase-config.js';

      return;
    }

    sb.auth.onAuthStateChange(
      (event, session) => {

        if (session)
          loadUser();
        else
          showAuth();
      }
    );

    await loadUser();

    if (window.lucide) {
      lucide.createIcons();
    }
  }
);
