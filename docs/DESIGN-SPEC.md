# Facts-Finder: Design Spec and Build Brief

Status: **provisional visual direction.** Everything here is a working decision until reviewed. Items marked **(Provisional)** are open.
Source design: Claude Design canvas "Facts-Finder, Visual Direction" (9 mobile screens, 390 x 844).
Mascot reference: `Faxi: Your Learning Companion` sheet (expressions and poses).

---

## 0. How to use this file

1. Paste this whole file into ChatGPT (or Cursor) as the first message and ask it to confirm understanding, flag gaps, and propose a build plan.
2. In Cursor, keep this file in the repo root (`/docs/DESIGN-SPEC.md`) and reference it with `@DESIGN-SPEC.md` in every prompt.
3. Build in the order in section 11. Do not build backend, auth providers, question generation, or live multiplayer yet. Use mock data and stubs (section 10).

---

## 1. Product summary

Facts-Finder is a gamified general-knowledge app. People play short quizzes, progress through levels, earn XP, return daily, and compete with friends. Tone: premium mobile game, curious and encouraging, **not childish**, not a SaaS dashboard.

Topics: geography and cultures, African and world history, science and nature, psychology, technology, business and money, sports/entertainment/literature, random facts.

Audience: young adults and adults.

## 2. Mascot: Faxi

Stylised 3D navy fox with cyan and lime accents, explorer suit, compass chest badge. Personality: curious, intelligent, playful, adventurous, encouraging.

- Faxi **supports** the experience. Never covers the question or answers.
- Use for: welcome, recommendations, encouragement on hard questions, celebration.
- Expressions available on the reference sheet: Happy, Thinking, Excited, Encouraging, Surprised, Cheerful.
- Poses: Welcome (waving), Explaining, Celebrating, Guiding, Playing, With Achievement.
- **Asset task:** export each expression and pose from the reference sheet as a transparent PNG (or have them regenerated on transparent background), at 1x/2x/3x. Name them `faxi-welcome.png`, `faxi-thinking.png`, `faxi-celebrating.png`, `faxi-encouraging.png`, and so on. The design mockups used the sheet cropped onto a light tile as a stand-in; production should use transparent cutouts.

| Moment | Expression / pose |
|---|---|
| Splash, Get started, Home | Welcome (waving) |
| Question shown | Thinking (small avatar) |
| Wrong answer | Encouraging |
| Correct answer | Cheerful or Excited |
| Level complete | Celebrating |
| Achievement unlocked | With Achievement |

## 3. Design tokens

### 3.1 Colour

```css
:root {
  /* Surfaces */
  --ink: #0B1B38;          /* app background */
  --surface: #14284A;      /* cards, answer buttons */
  --surface-deep: #08142B; /* bottom nav */
  --border: #243B63;       /* card borders, empty progress track */

  /* Brand */
  --cyan: #00C2FF;         /* discovery, links, interactive accents, timer */
  --lime: #A3E635;         /* progress, success, rewards, primary CTA */
  --lime-shadow: #6E9E1C;  /* primary button bottom edge */
  --ivory: #F7F6EE;        /* primary text, light panels */
  --muted: #A9B8CE;        /* secondary text (passes contrast on --ink) */

  /* Feedback */
  --wrong: #FF8F70;        /* incorrect state (always paired with icon + label) */
  --wrong-bg: #3A2230;
  --right-bg: #1D3A33;

  /* Mascot tile */
  --faxi-tile: #EEF3FA;
}
```

Semantic roles: `--lime` = progress, success, reward, primary action. `--cyan` = information, selection, timer, secondary action. `--wrong` = mistakes only, never used decoratively. Brand reference navy from the Faxi sheet is `#0F2A44`; slate `#6B7C93` is for illustration only, not text.

Rules: no decorative gradients, glow, or glassmorphism. Colour is never the only signal (answer states always carry an icon and a text label).

### 3.2 Typography

- Display / headings / numbers / buttons: **Bricolage Grotesque** (600, 800)
- Body / UI: **DM Sans** (400, 600, 700)
- Fallbacks: `system-ui, sans-serif`

| Role | Size / weight |
|---|---|
| Hero score | 64 / 800 |
| Screen title | 26 to 28 / 800 (display) |
| Question text | 26 / 800, line-height 1.2 |
| Card title | 18 to 22 / 800 |
| Primary button | 18 to 24 / 800 |
| Body | 15 to 17 / 600 |
| Label (overline) | 12 / 700, uppercase, letter-spacing .08em, `--muted` |
| Small / caption | 12 to 14 / 400 to 600 |

### 3.3 Spacing, radius, elevation

- Spacing scale (px): 4, 6, 8, 10, 12, 14, 20, 28. Screen padding 20. Default gap between blocks 14.
- Radius: 14 (inputs, answers), 16 (cards, buttons), 20 to 28 (Faxi tiles), 999 (pills, nodes).
- Elevation: flat. Only the primary button has a 4px solid bottom edge (`0 4px 0 var(--lime-shadow)`) for a tactile "game" press.
- Touch targets: minimum 44 x 44. Primary buttons 56 to 68 high.
- Reference frame: 390 x 844. On desktop, centre a phone-sized column (max-width 430) on the page. The app itself must stay responsive.

## 4. Components

| Component | Spec |
|---|---|
| **Primary button** | Lime fill, ink text, 16 radius, 56 min height, bottom edge shadow. Pressed: translateY(3px), shadow shrinks to 1px, 80ms. Disabled: 40% opacity, no shadow. |
| **Ghost button** | Transparent, 2px `--border`, ivory text. Pressed: background `--surface`. |
| **Pill / chip** | 32 high (44 if tappable), `--border` fill. Selected: cyan fill, ink text. |
| **Card** | `--surface`, 1px `--border`, 16 radius, 14 padding. Highlight variant: cyan border (daily challenge, head-to-head). |
| **Progress bar** | 10 high, `--border` track, lime fill, 5 radius. Animate width 400ms ease-out. |
| **Answer option** | 58 min height, 14 radius, 2px border, letter badge (A to D) at left. See states below. |
| **Bubble (Faxi speech)** | Ivory fill, ink text, 14 radius, 15/600. Sits **beside** Faxi, never over content. |
| **Input** | 52 high, `--surface`, 2px `--border`, 14 radius. Focus: border cyan. Error: border `--wrong` plus message text. Always has a visible `<label>`. |
| **Segmented toggle** | `--surface` container, 4 padding; active segment lime, inactive transparent. |
| **Social button** | Ivory fill, ink text, brand mark at left, 56 high. (Use official Google/Apple button assets in production.) |
| **Bottom nav** | `--surface-deep`, top border, 5 items: Home, Play, Compete, Discover, Profile. Active item cyan. 44+ touch target, 11px labels. |
| **Level node** | Circle. Completed: lime fill with check. Current: 84px cyan with number and cyan ring (ink gap, then cyan). Locked: `--surface` with border and muted number. Bonus: dashed ivory border. |

### Answer states

| State | Look | Icon / label |
|---|---|---|
| Default | `--surface`, `--border` | Letter badge |
| Pressed / selected | Cyan border | Badge turns cyan |
| Correct | `--right-bg`, lime border | Lime badge with check, "Correct" |
| Incorrect (chosen) | `--wrong-bg`, `--wrong` border | Coral badge with x, "Your answer" |
| Revealed correct (after a miss) | Same as Correct | Check, "Correct" |
| Dimmed | Opacity .55 | None |

## 5. Navigation and flow

```
Splash -> Get started -> Sign up / Log in -> Home
Home -> Play Now -> (resume current level) Gameplay
Home / Play tab -> Level map -> select level -> Gameplay
Gameplay -> Answer feedback -> (next question, loop x10) -> Results
Results -> Next level | Replay | Explore topics
Compete tab -> Find opponent | Create room | Join by code | Challenge friend (stubs)
```

Bottom nav destinations (Provisional): Home, Play, Compete, Discover, Profile. Settings lives inside Profile. The nav is hidden during Gameplay, Feedback, Results, and the onboarding screens.

## 6. Screens

All screens are 390 x 844, background `--ink`, 20 padding. Copy is placeholder.

### 6.1 Splash
Faxi (large, centred) above the wordmark "Facts-Finder" (hyphen in cyan, 44/800), tagline "Small facts. Big adventures." in `--muted`. Lime loading bar and "Loading your adventure…" at the bottom.
**Behaviour:** shows while the app boots (session check, assets). Min 1.2s, max about 3s, then route to Home if signed in, otherwise Get started.

### 6.2 Get started
Faxi waving, overline "Meet Faxi", headline "Learn something new, every day." Card with three points: quick quizzes; climb levels and earn XP; challenge friends in live games. Primary button **Get started** and ghost button **I already have an account**.
**Behaviour:** Get started opens Sign up tab. "I already have an account" opens Log in tab.

### 6.3 Sign up / Log in
Faxi avatar plus "Join the adventure". Segmented toggle Sign up | Log in. **Continue with Google**, **Continue with Apple**, divider "or use email", Email and Password fields, primary **Create account**, terms line.
- Log in variant (not yet mocked): primary label **Log in**, add "Forgot password?" link under password, headline "Welcome back".
- Validation: email format, password minimum 8 characters, inline errors, no shaming copy ("That email doesn't look right. Check for typos.").
- Auth is **stubbed** for now (section 10). Do not integrate real providers yet.

### 6.4 Home
Order top to bottom: greeting and streak pill; level and XP card (Level 12, 1,240 / 1,500 XP); Faxi with speech bubble; **Play now** (68 high, 24px, dominant); Daily challenge card (cyan border, "Lost cities of Africa", 5 questions, +120 XP, Start pill); "Picked for you" topic chips; compact last-played and latest-badge row; bottom nav (Home active).
Priority: immediate play. Never a crowded analytics dashboard.

### 6.5 Level map
Top: path tabs General | History | Science (General default). Title "General knowledge", "Level 4 of 50". Vertical winding path, bottom to top: levels 1 to 3 completed, level 4 current with Faxi beside it, level 5 locked, level 6 bonus (locked). Footer card: "Level 4 · 10 questions · 3 lives". Nav: Play active.
Behaviour: tapping the current level starts it. Completed levels can be replayed. Locked levels show a gentle "Finish level 4 to unlock" message. Map scrolls vertically, newest level auto-scrolled into view. Each topic tab has its own path.

### 6.6 Gameplay
Top row: close (x), "Question 4 of 10" label with progress bar, timer pill (cyan). Second row: "Mistakes left: 2 of 3" and points (lime). Question card (overline "History · Africa", 26/800 question). Four answers A to D. Bottom: small Faxi (thinking) with bubble "Take your time. You've got this."
Sample question: *In which city is the University of al-Qarawiyyin, founded in 859?* A Cairo, B Timbuktu, **C Fez**, D Tunis.
Rules (Provisional): 10 questions per level; 3 mistakes ends the level; per-question timer (length TBD, mock 20s).

### 6.7 Answer feedback
Same top rows with the question collapsed. Chosen wrong answer shows incorrect state, correct answer revealed, others dimmed. Ivory panel: Faxi (encouraging), heading "Not quite, and a fair guess!", short explanation (1 to 2 sentences). Primary **Continue**.
Correct variant (build it): chosen answer in correct state, Faxi cheerful, heading from a rotating set ("Nice one!", "Spot on!"), same panel and Continue, +points chip.
Copy rule: encouraging, never shaming.

### 6.8 Results
Faxi celebrating, overline "Level 4 complete", score "8 / 10" (64/800), line of encouragement. Two stat cards: Accuracy, XP earned (+180, lime). Level progress card with bar. Highlights card (for example "7 correct in a row"). Primary **Next level**, ghost **Replay** and **Explore topics**.
If the level was failed (3 mistakes): Faxi encouraging, "So close. Let's try again.", primary **Try again**, ghost **Review facts**, XP partial or zero (Provisional).

### 6.9 Compete
Title "Compete". Head-to-head card (cyan border): "Live 1v1 duel", **Find opponent**. Group game card: "Host or join a room", **Create room** and a 4 to 6 character code field. Friends list with **Challenge** pills. Nav: Compete active.
Multiplayer rules: same questions, same timing for everyone; host creates a room, others join by code or link. **Visual only for now.**

## 7. Interactions and motion

Principles: quick (120 to 400ms), satisfying, purposeful, never blocking. Respect `prefers-reduced-motion` (swap movement for fades, skip confetti).

| Interaction | Behaviour |
|---|---|
| Splash to next | Faxi fades up and scales .96 to 1 (300ms); loading bar fills; cross-fade out (200ms) |
| Any primary button | Press: down 3px, 80ms. Release: spring back, 120ms |
| Play now | Button press, then slide-up transition into Gameplay (250ms) |
| Tab / nav switch | Cross-fade content 150ms; active icon scales 1.1 with colour change |
| Level map open | Path draws in; current node pulses once (cyan ring, 600ms); Faxi hops beside it |
| Select level | Node scales 1.08, bottom sheet or direct route to Gameplay with "Level 4, 10 questions, 3 lives" |
| Locked level tap | Small horizontal shake (200ms) plus toast |
| Question appear | Question card fades and rises 12px (250ms); answers stagger in 60ms apart |
| Choose answer | Option goes to selected state instantly, then resolves to correct or incorrect within 150ms |
| Correct | Badge pops (scale 1.15 to 1), lime border, points tick up, small lime spark burst (400ms), Faxi cheerful |
| Incorrect | Gentle 2-cycle shake (240ms), coral state, correct answer reveals with a soft pulse, mistake pip drops; no harsh sound or red flash |
| Timer low (last 5s) | Pill turns coral-outlined with text change; no flashing |
| Continue | Panel slides down, next question slides in from right (250ms) |
| Results | Score counts up (800ms); accuracy and XP cards stagger in; XP bar fills; Faxi celebrates; confetti in lime/cyan/ivory (once, 1s) |
| Level up | Full-screen moment: badge scale-in, Faxi "With Achievement" pose, **Continue** |
| Sign up toggle | Segment slides (150ms); fields cross-fade |
| Input error | Border to coral, message fades in below; focus moves to first invalid field |
| Compete join | Code field auto-uppercases, auto-advances; invalid code shows inline message |

Sound and haptics (Provisional): short tap, correct chime, soft miss tone, level-complete fanfare; light haptic on correct, soft on incorrect. Must be mutable in Settings.

## 8. Game rules (working, all Provisional)

- A level = 10 questions, 4 options, 1 correct.
- 3 mistakes end the level.
- Points per correct answer with a speed bonus; XP awarded at level end from accuracy and points.
- Daily challenge: separate 5-question set, bonus XP, drives streaks.
- Trade-off to decide: lives per level (current) vs. lives across the session. Per-level is friendlier; per-session creates more tension.

## 9. Accessibility and quality bar

- Text contrast at least 4.5:1 (all `--muted` use passes on `--ink`).
- Real `<button>`, `<a>`, `<input>` with `<label>`. Icon-only buttons need `aria-label`.
- Answer states: icon plus text, never colour alone. Coral vs. lime also differ in lightness.
- Focus rings visible (cyan, 2px, offset 2px).
- Touch targets at least 44px. Support dynamic text up to 130% without clipping.
- Loading states: skeleton cards on Home, skeleton path on Level map, shimmer on question load (no spinners over content).
- Small screens (320 to 360 wide): reduce Faxi tile size, keep Play now and answers full width, let content scroll; never clip a question.
- Faxi images need meaningful `alt` text (or empty alt when purely decorative).

## 10. What to mock, what not to build yet

Build with **mock data and stubs**:
- Auth: fake sign-up/login that stores a local session. Google and Apple buttons call a stub that resolves after 600ms.
- Questions: a local JSON of about 30 questions across 4 topics, shape `{id, topic, text, options[4], correctIndex, explanation}`.
- Progress: local storage for level, XP, streak, completed levels.
- Compete: static UI only; buttons show a "Coming soon" toast.

Do **not** build yet: backend, real OAuth, database, question-generation pipeline, live multiplayer infrastructure, payments.

## 11. Suggested stack and build order

Suggested (Provisional): React + TypeScript + Vite, Tailwind with the tokens above in `tailwind.config`, Framer Motion for animation, React Router, Zustand for game state. Mobile-first; centred phone column on desktop.

Build order:
1. Tokens, fonts, base layout, phone-column wrapper, Button, Card, Pill, ProgressBar, Input.
2. Bottom nav and route shell.
3. Home.
4. Level map (static data, then state).
5. Gameplay (timer, mistakes, scoring), then Answer feedback.
6. Results and XP.
7. Splash, Get started, Sign up / Log in (stubbed).
8. Compete (visual only).
9. Motion pass, accessibility pass, loading states.

## 12. Prompt to start Cursor

> Read @DESIGN-SPEC.md. Set up a React + TypeScript + Vite project with Tailwind, using the design tokens in section 3 exactly. Build the shared components from section 4, the bottom-nav route shell from section 5, and then the Home screen from section 6.4 using mock data. Mobile-first at 390 px, centred phone column on desktop. Do not build any backend or real auth. Show me the result before moving on.

## 13. Open decisions

1. Final timer length and whether it affects scoring.
2. Lives per level vs. per session.
3. Final bottom-nav labels and whether Discover is separate from Play.
4. Failed-level XP rules.
5. Sound and haptics set.
6. Final Faxi transparent asset set and any 3D/Lottie animation of Faxi.
7. A second Home treatment (not yet explored).
8. Log in variant and Forgot password screen (not yet mocked).
