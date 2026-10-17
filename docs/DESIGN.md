# Piers design spec: minimal

Status: approved direction, 2026-10-17. Owner: Anthony. Build: Devin. Review and simulator testing: Claude.
Mockups (row 6, "Harbor × Manila, minimal"): https://claude.ai/artifact/NEcKRvFfrSe82PSEF8Xefx

## The goal

**Absolute minimal.** Every screen does one thing. Text says exactly what it means, in plain words, at a size anyone can read. Nothing is decorative.

Piers must also look and sound unlike every other LiPurposeFe app (Keep, Worthwhile, Aliis, Invariably, Incipit). The App Store has rejected the account for similarity (Guideline 4.3), so this is a hard requirement, not a preference. See `two-tone10/purpose-platform` → `docs/app-store/ACCOUNT_CLEANUP.md`.

## Rules (every screen, no exceptions)

1. **One typeface:** Instrument Sans, weights 400 and 600 only (`@expo-google-fonts/instrument-sans`). Remove Raleway and every other font.
2. **Minimum text size 17pt.** No all-caps labels, no letter-spacing, no italics, no handwriting or script fonts.
3. **One idea per screen.** If a sentence can be removed without losing meaning, remove it.
4. **No decoration:** no cards, shadows, gradients, illustrations, icons-as-ornament, dividers, badges or stamps. Space separates things.
5. **Plain words.** Use the vocabulary table below. No nautical metaphors in the UI (no cast off, harbor, logbook, reckoning, shore, voyage, supplies, open water, pulse).
6. **Touch targets:** buttons at least 56pt tall, full width or in equal pairs.
7. **Contrast:** all text meets WCAG AA (4.5:1). The palette below passes; don't add colors.
8. **Light only.** No dark mode for now; it would put Piers back near Keep, Aliis and Worthwhile.

## Tokens

| Token | Value | Use |
|---|---|---|
| `ground` | `#E3EBE5` | Every screen background (pale sea-glass) |
| `ink` | `#123A31` | All text, primary buttons, input borders |
| `onInk` | `#FFFFFF` | Text on primary buttons |
| `field` | `#FFFFFF` | Input backgrounds |
| `stop` | `#8A2A1E` | **Only** the "What might stop you" label and line. Nowhere else. |

Status bar: dark content (`expo-status-bar` `style="dark"`). The current app shows a white status bar on a light background.

| Style | Size / weight | Use |
|---|---|---|
| `count` | 64 / 600 | The progress number ("2 of 3") |
| `title` | 34 / 600, line-height 1.15 | The goal sentence, screen question |
| `body` | 17–18 / 400 | Everything else |
| `button` | 18 / 600 | Button labels |

Spacing: screen padding 28 horizontal, 72 top, 40 bottom. Gaps between groups 32–56. Radius 8 on buttons and inputs. Borders 1.5px `ink`.

Components (only these):
- **Primary button:** `ink` fill, `onInk` text, 60pt tall, full width, pinned to the bottom.
- **Secondary button:** transparent, 1.5px `ink` border, `ink` text.
- **Choice:** a stack or pair of secondary buttons; the selected one becomes a primary button.
- **Input:** `field` background, 1.5px `ink` border, 56pt tall, 18pt text, with a visible `<Text>` label above it (never placeholder-only).

## Screens

Exact copy is in the mockups; tone matters more than the exact words.

1. **Your week** (replaces Home + MyVoyage): "This week" · the goal as `title` · "What might stop me: …" in `stop` · `count` ("2 of 3") · days left · "Marlow and Juniper are your witnesses." · primary button "I ran today" (the goal's own verb when possible, else "Done today").
2. **Set a goal** (replaces CastOff): "One goal for this week." · input "What will you do?" · input "What might stop you?" (label in `stop`) · choice "Who will witness it?": Two friends / Two strangers · primary "Sign it".
3. **A friend's week** (replaces PierWatch): "You're Marlow's witness" · their goal · `count` · days left · input "Send Marlow a note" + Send · if a request is pending: one sentence ("Juniper wants to give Marlow one extra day.") + Agree / Not yet.
4. **End of the week** (replaces Reckoning): "The week is over" · "Did you [goal]?" · "You logged 2 of 3." · Yes / Partly / No · optional input "What happened?" · one witness note if there is one · primary "Close the week".
5. **Witnessing** list (replaces the Together tab / Harbor): plain list of the weeks you're witnessing ("Marlow · Cook dinner at home · 2 of 5"), plus "Join with a code" and "Witness a stranger".
6. **History** (replaces the Record tab / Logbook): plain list of past weeks with Yes / Partly / No. No charts.
7. **Onboarding** (replaces the four dictionary pages): one screen. "Set one goal for the week. Two people witness it. At the end, you say how it went." · handle input · primary "Start". Drop the pier sketch entirely: it has a green fringe from background removal, and illustration breaks rule 4.

Tabs: three, text only, 17pt, never truncated: **This week · Witnessing · History**. The current tab bar cuts off "Together" and "Record".

## Vocabulary

| Use | Instead of |
|---|---|
| goal, this week | voyage, cast off |
| witness, witnessing | pier, standing on, peers (in UI text) |
| what might stop you | obstacle, current |
| note | signal, pulse, flicker |
| one extra day (a request both witnesses agree to) | supplies, amendment, co-sign |
| the week is over / close the week | reckoning, return, harbor |
| history | logbook, record |

"Piers" stays as the app name only.

**Never use** (owned by the other apps): lens, kind of time, worth it, worthwhile, moments, kept / keep (as a verb), pulls, whys, contribution, showing up / show up, purpose (as a headline), reflection, journal, bloom, petals, stars, constellation.

## Open decisions (Anthony)

- **Which requests stay?** The engine has five: `extra_day`, `rest_day`, `call`, `sealed_note`, `link`. Minimal suggests **one extra day only**. Cut the rest from the UI unless Anthony wants them.
- **Witness-only chat (the Shore):** keep as a single "Message Juniper" link on *A friend's week*, or cut. Recommendation: cut for v1.
- **"Go with one" witness:** keep only if it fits the screens above without a new screen.
- **Signatures:** "Sign it" is a plain button. Optionally, the witnesses' names appear under the goal once they accept. No handwriting.

## Before building

1. **Reconcile the code first.** `~/my_apps/piers` has about 600 lines of Anthony's uncommitted July work (App.js, HomeScreen, PierWatchScreen, MyVoyageScreen, theme, TabBarItem, Toast) that overlaps PR #1. Anthony decides what survives. Much of it is visual and is replaced by this spec anyway, so the likely answer is to keep the logic and drop the styling, but don't decide that alone.
2. Build on the local demo world (`EXPO_PUBLIC_PIERS_BACKEND=local`); no backend changes are needed for this redesign.
3. New look and features ship in a reviewed binary, never through `eas update` (Guideline 2.5.19).

## Done means

- Every rule above holds on every screen.
- No word from the "Never use" list appears anywhere a user can see (UI, onboarding, notifications, App Store text).
- Claude has run it in the iOS simulator and checked each screen against the mockups.
