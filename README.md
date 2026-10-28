# Facts-Finder

Mobile-first preview of the Facts-Finder game. Accounts, progress, ratings, and voice notes are stored in Supabase. The colour mode stays in the browser. Questions stay in the app. There is no live multiplayer.

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in the two Supabase values before creating an account. Until those values exist, sign-up cannot create a real account.

On a wide screen the game sits in a centred phone column. On a phone it fills the screen.

The design brief is in `docs/DESIGN-SPEC.md`. The `@tweakcn` registry is registered for the shadcn MCP and is not applied as the theme. Colours and type follow the Facts-Finder artboards, with a light and a dark mode.

## Accounts

Passwords are hashed by Supabase Auth. They are not stored in the browser. Each player can read and update only their own profile and progress. Emails are not shown to other players. You read them on the admin screen, or in the Supabase dashboard.

1. Create a free Supabase project.
2. Open the SQL editor, paste `supabase/schema.sql`, and run it.
3. Open Authentication → Sign In / Providers → Email and turn off Confirm email, so Create account signs the player in immediately.
4. Open Project Settings → API. Copy the project URL and the anon public key.
5. Locally, put them in `facts-finder/.env.local`:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

6. On Vercel, add those same two environment variables, then redeploy.
7. Never put the service_role key in the app or in a public environment variable. Emails are under Authentication → Users. Notes are under Table Editor → feedback. Voice files are under Storage → feedback-audio.

Sign up asks for a first name, last name, email, and password. The username is made from the first name. Home greets the player by their first name. On Profile they can change the username, then the next change waits three months. They can also pick a portrait and a colour for their avatar.

## How to share

This is a website that fills the phone screen. People do not download it from an app store yet. They open a link.

1. Create a free Vercel account with the GitHub login for `J-osas/luxury-living-within-reach`.
2. Import that repo. Set the root directory to `facts-finder`. The build command, the output folder, and the page routing (`/admin`, `/home`, and the rest) come from `vercel.json`. Add the two Supabase environment variables before the first deploy.
3. Deploy. Vercel gives an `https://` address.
4. Send that address to friends, family, and group chats.
5. On a phone, open the link, then use the browser Share menu and Add to Home Screen. It then opens like an app.
6. Each person taps Get started and creates an account with their email. Their progress stays with that account.
7. After they clear 2 levels, the game asks them to rate it. They can also open Send feedback, type, record a voice note, and send it. You read the rating, the note, and the voice file on the admin screen.

## Admin screen

Open `/admin` on your link, or Profile → Open admin. It shows who has joined, their level, XP and streak, and every feedback note with its rating, its text, and a button to play the voice file. Download as spreadsheet gives you the notes as a CSV to analyze.

Only an account marked as admin can open it. The mark cannot be set from the app.

1. Create your own account in the app first.
2. In the Supabase SQL editor, run this once with your own email:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

3. Run `supabase/schema.sql` again whenever it changes. It is safe to run more than once.
4. Log out and back in. Profile now shows Open admin.

## Voice notes as text

While someone records, their words are typed into the note box as they speak, on Android Chrome and desktop Chrome. They can fix a word before they send. The voice file is always saved too.

iPhones do not type while recording, so those notes (and any voice note sent with an empty box) are turned into text on the server after upload:

1. Install the Supabase CLI and link the project: `supabase link --project-ref <your-ref>`.
2. Deploy: `supabase functions deploy transcribe-feedback`.
3. Add an OpenAI key as a secret: `supabase secrets set OPENAI_API_KEY=sk-...`.

Until step 3 is done, those notes show Waiting for a transcript on the admin screen. Once the key is set, Make transcript on a note fills it in. The key stays on the server and never reaches the website.

## Compete: friends and rooms

Compete needs an account. Run `supabase/schema.sql` again first. It adds the friends and rooms tables and the functions behind them.

**Friends.** Compete → Add and manage. Type a friend's username to send a request. They accept it on the same screen. Only accepted friends can be challenged.

**Rooms.** Compete → pick a topic and 5 or 10 questions → Create room. The room gets a 6-character code and a link (`/join/CODE`). Send either one. Anyone who opens the link and has no account is sent to sign up, then lands in the room.

- Everyone in a room gets the same questions in the same order.
- Each person plays once. The game saves the score when the round ends.
- Rank is points, then total time, then who finished first.
- A room lasts 48 hours, holds 20 players, and one host can have 10 open rooms.
- A room round has no mistake limit and gives half the usual XP.
- Challenge on a friend makes a 10-question room for the two of you.

Closing the tab in the middle of a room round counts as the one attempt. The score is checked on the server: it must fit the number of correct answers, and it must arrive within 10 minutes of pressing Play.

Questions live in the app code, so a technical player could read the answers. That is fine for friends and family. Move questions to the database before a public launch.

### Two-account test

1. Sign up as A in one browser and B in a private window.
2. A: Compete → Add and manage → enter B's username. B: accept the request.
3. A: create a room, tap Share link. B opens the link and lands in the room.
4. Both tap Play now. Finish the round. Each is returned to the room with a saved note.
5. The leaderboard lists both, ranked. Tapping Play now again says the room allows one attempt.
6. A: Compete → Challenge B. B sees it under Your rooms.

## Play as a guest

The start screen has Play as guest. A guest plays levels, the daily challenge and topic paths with no email, name or password. Their XP, streak and cleared levels are saved in the browser (`localStorage`), not in Supabase, so nothing about a guest appears on the admin screen.

- Rooms, friends and the leaderboard need an account. A guest who opens Compete or Friends sees a sign-up message.
- The Profile and results screens show a Create account button.
- When a guest signs up or logs in, their progress is merged into the account: every cleared level, and the higher XP and streak. The browser copy is then removed.
- If someone opens a room link without an account, the start screen asks them to create an account instead, so they land in the room after sign-up.
- Clearing the browser data removes guest progress.

The splash screen stays for 4 seconds while its bar fills. Change `SPLASH_MS` in `src/pages/splash.tsx` to alter that.

## Question bank

- Questions live in `src/data/questions.ts` (the original set) and `src/data/more-questions.ts` (added later). Every question needs a unique `id`, four options, and a `correctIndex` from 0 to 3.
- Each level deals its own set of 10. Levels 1 to 8 never share a question on the General path, and replaying a cleared level moves to a new set. The History and Science paths wrap around until their pools reach 80 questions each.
- To add more, append to `more-questions.ts`. Keep the wording unambiguous, so only one option is correct.

## Visitor stats

The app includes Vercel Web Analytics. In the Vercel project, open Analytics and click Enable once. Guests do not show up in the admin screen, so use Analytics to count visitors.
