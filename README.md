# Pedro Connect

A clean, black & white Twitter/X-style social app you can host for free on **GitHub Pages**.

Built with:
- Vanilla HTML / CSS / JS
- **Supabase** (Auth + Database + Realtime-ready)
- Lucide icons
- Rounded modern UI

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account.
2. Create a **new project**.
3. Wait until the database is ready.

### Get your keys
Go to **Project Settings → API**:
- Copy the **Project URL** → this is `SUPABASE_URL`
- Copy the **anon public** key → this is `SUPABASE_ANON_KEY`

---

## 2. Set up the Database

Go to **SQL Editor** in Supabase and run this entire script:

```sql
-- Enable UUID extension (usually already on)
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  bio text,
  avatar_url text,
  created_at timestamptz default now() not null,
  constraint username_length check (char_length(username) >= 3 and char_length(username) <= 24)
);

-- Posts table
create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz default now() not null,
  constraint body_length check (char_length(body) > 0 and char_length(body) <= 280)
);

-- Likes table
create table public.likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique (post_id, user_id)
);

-- Indexes for performance
create index posts_created_at_idx on public.posts (created_at desc);
create index likes_post_id_idx on public.likes (post_id);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.likes enable row level security;

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Posts policies
create policy "Anyone can read posts"
  on public.posts for select using (true);

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- Likes policies
create policy "Anyone can read likes"
  on public.likes for select using (true);

create policy "Authenticated users can like"
  on public.likes for insert with check (auth.uid() = user_id);

create policy "Users can unlike their own likes"
  on public.likes for delete using (auth.uid() = user_id);
```

---

## 3. Configure the Frontend

Open `js/supabase-config.js` and paste your keys:

```js
const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
```

---

## 4. Host on GitHub Pages

1. Create a new GitHub repository (e.g. `pedro-connect`).
2. Upload all files in this folder (or push via git).
3. Go to **Settings → Pages**.
4. Under **Source**, choose **Deploy from a branch**.
5. Select `main` (or `master`) and `/ (root)`.
6. Save. Your site will be live at:
   `https://YOUR_USERNAME.github.io/pedro-connect/`

> **Important**: Make sure the repo is public if you want free GitHub Pages.

---

## 5. Optional Improvements

### Enable Email Confirmation (recommended for production)
In Supabase → Authentication → Providers → Email → turn on “Confirm email”.

### Add Realtime (live updates)
In `app.js` you can subscribe to new posts:

```js
sb.channel('posts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
    loadPosts(); // or prepend the new post
  })
  .subscribe();
```

### Custom Domain
GitHub Pages supports custom domains in the same Pages settings.

---

## Project Structure

```
pedro-connect/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── supabase-config.js   ← put your keys here
│   └── app.js
└── README.md
```

---

## Features included

- Sign up / Login (email + password)
- Create posts (280 chars)
- Like / unlike posts
- Black & white modern UI with rounded corners
- Responsive (mobile friendly)
- Fully static → free GitHub Pages hosting
- Supabase handles auth + database securely

---

Made for Pedro. Enjoy building!
```
