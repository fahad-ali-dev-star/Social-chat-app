# MERN Social App — Starter Scaffold

A boilerplate for a MERN (MongoDB, Express, React, Node.js) social/community app with auth, posts, likes, follows, and notifications already wired up.

## Structure

```
mern-social-app/
  server/    → Express API, MongoDB models, JWT auth, Socket.io
  client/    → React (Vite) frontend, Tailwind CSS, Zustand store
```

## What's included

- **Auth**: register/login/logout with JWT stored in an httpOnly cookie
- **Models**: User, Post, Comment, Notification (Comment/Notification wired in DB but not yet exposed via routes — easy to extend)
- **Posts**: create, feed (paginated), like/unlike, delete
- **Follows**: follow/unfollow, profile lookup by username
- **Realtime**: Socket.io server set up for future live notifications
- **Frontend**: Login/Register/Feed pages, protected routes, axios client with cookies

## Setup

### 1. Backend
```bash
cd server
npm install
cp .env.example .env   # fill in MONGO_URI and JWT_SECRET
npm run dev
```
You'll need a MongoDB instance — easiest is a free MongoDB Atlas cluster (get the connection string from the Atlas dashboard and drop it into `MONGO_URI`).

### 2. Frontend
```bash
cd client
npm install
npm run dev
```
Visit http://localhost:5173 — the Vite dev server proxies `/api` calls to `http://localhost:5000`.

## Next steps to build out

1. **Comments** — routes/controller for the Comment model already exist as a schema; add `commentController.js` + routes following the post pattern
2. **Notifications** — expose a `GET /api/notifications` endpoint and emit real Socket.io events on like/comment/follow (the io instance is already attached via `app.set("io", io)`)
3. **Media uploads** — wire up Cloudinary or S3 for avatar/post images instead of raw URLs
4. **Deployment** — Render or Railway for the API, MongoDB Atlas for the DB, Vercel for the client

## Deploy checklist
- Set `NODE_ENV=production` and a strong `JWT_SECRET`
- Set `CLIENT_URL` to your deployed frontend origin (needed for CORS + cookies)
- Cookies use `sameSite: "lax"` — if frontend and backend end up on different top-level domains, you'll need `sameSite: "none"` + `secure: true`

## Phase 4: Moderation & Admin

New moderation infrastructure:
- Reports for users, posts, comments, messages and stories.
- Duplicate-report protection per reporter/target.
- Admin/moderator roles and account statuses.
- Admin dashboard for platform stats, reports and user moderation.
- Report review states: pending, reviewing, resolved, dismissed.
- Admin can remove reported posts/comments/messages/stories and suspend/ban users.
- Verified badges are controlled from the admin dashboard.

Set `ADMIN_EMAILS` in the server environment to a comma-separated list of trusted administrator emails. Those accounts receive the admin role when they register or log in.
