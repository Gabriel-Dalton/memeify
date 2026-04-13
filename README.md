# Memeify

Memeify is a real-time meme battle web app built with **Next.js**, **TypeScript**, **Tailwind CSS**, **Supabase**, and **Fabric.js**.

Users create or join a room, upload an image, edit a meme in a 3-minute round, submit, vote, and view results + leaderboard.

## Features (MVP)

- Landing page
- Create room + join room flow
- Supabase-backed room/meme/vote data
- Meme editor with Fabric.js:
  - image upload
  - draggable text overlays
  - emoji stickers
  - basic filters (grayscale/sepia/invert)
  - rotate + flip
  - funny distortion (pixelate)
- 3-minute countdown timer
- Meme submission flow
- Voting page
- Results page
- Leaderboard page
- Responsive UI

## Tech stack

- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Supabase (Auth, Postgres, Storage, Realtime)
- Fabric.js

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. In Supabase SQL editor, run schema from:

   - `./supabase/schema.sql`

4. Ensure Supabase auth + storage setup:

   - Enable **Anonymous Sign-Ins** in Auth providers
   - Confirm `memes` storage bucket exists and is public

5. Start the app:

   ```bash
   npm run dev
   ```

6. Open:

   - http://localhost:3000

## Testing steps

1. Create a room from the landing page.
2. Open the room code in another browser/session and join as a second user.
3. In each session, go to editor and upload an image.
4. Add text + stickers, apply filter, rotate/flip, and use pixelate distortion.
5. Submit memes before timer expiration.
6. Vote from each session and confirm vote counts update.
7. Open results page and verify winner ranking.
8. Open leaderboard and verify entries update from submitted/voted memes.

## Scripts

- `npm run dev` – start development server
- `npm run lint` – run ESLint
- `npm run build` – production build

## Suggested production improvements

- Server-side authoritative game state transitions (editing/voting/results) via RPCs or Edge Functions
- Stronger RLS policies per room membership and anti-cheat vote controls
- Signed upload URLs + image moderation pipeline
- Room host controls, round history, and rematch automation
- Better anti-spam/rate-limits + abuse reporting
- Integration and E2E tests for multiplayer flows
