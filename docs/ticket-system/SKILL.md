---
name: starman-ticket-system
description: Work with or extend the Starman Bulletin Board (shared ticket system for improvements and recommendations) in design/Starman.html. Use when asked to change the board, its posts, voting, statuses, notifications, team accounts, or admin behaviour.
---

# Starman Ticket System Skill

How to work on the Bulletin Board feature without breaking the prototype. Read
`README.md` in this folder first for what the feature does.

## Where the code lives

Everything is in `design/Starman.html` (the single-file design prototype). Search
for these anchors:

- `ADVISORS_SEED` : the Aspire team registry (accounts, roles, admin flag).
- `seedTickets()` : demo posts, plus `TICKET_CATS` and `TICKET_STATUS`.
- `VIEW · BULLETIN BOARD` : the view and all interactions.
- The nav entry `{k:'board', ... label:'Bulletin Board'}` sits between
  `transcripts` (Meeting Intel) and `vault` (Data Vault).
- `TITLES.board` and the `VIEWS` map both register the `board` route.

## Golden rules

1. **Do not remove the admin gate.** Status changes must stay behind `isAdmin()`.
   Only accounts with `admin:true` (currently Andrew Lee, President) may set status.
2. **Audit everything.** Every mutating action calls `logAudit(...)`. Keep this.
3. **Persist through `saveTickets()`** (or `persist()`), never by writing
   localStorage directly.
4. **Notify on the right events.** New post, new comment (to the author), and
   status change (to the author) each call `notify(...)`. Keep recommendations
   called out by name.
5. **Keep keys stable.** Team keys `AL`, `JB`, `EF`, `KN` are referenced by seeded
   clients and deals. Do not rename them. Add new people with new keys.
6. **Match the brand.** Use the CSS variables already in the file
   (`--panel`, `--line`, `--emerald`, `--gold`, `--ink`, `--font-heading`). Do not
   hardcode hex values that fight the theme, and keep the board readable in both
   light and dark mode. Avoid em dashes in any copy.
7. **No real secrets.** The board is a prototype. Do not commit real per-person
   passwords. All demo accounts use the shared public demo password.

## Common changes

- **Add a team member:** add an entry to `ADVISORS_SEED` with a unique key, name,
  role, email, and colour. The auto-upgrade check near the roster load replaces an
  older saved roster so the new person appears without a manual reset.
- **Add a category or status:** extend `TICKET_CATS` or `TICKET_STATUS`. If you add
  a status, add a colour for it in `statusPill()`.
- **Change ranking:** edit the `.sort(...)` in `vBoard()` (currently votes, then
  recency).
- **Make someone else admin:** set `admin:true` on their `ADVISORS_SEED` entry.

## After any change

Follow the prototype changelog convention (see
`docs/Starman-Version-History.md`):

1. Bump `<meta name="version">` in `design/Starman.html`.
2. Update the login footer version and date (`.lfoot`).
3. Add a dated row to the Version Log.

Then sanity check: sign in, open the board, create a post, vote, comment, and (as
admin) change a status. Confirm the notification appears and the audit log records
each action before pushing.

## Verify quickly (console)

```js
// signed-in user and role
ME; me().name; isAdmin();
// board state
tickets.length; tickets[0];
// exercise it
boardVote(tickets[0].id);       // toggle a vote
boardOpen(tickets[0].id);       // open the detail modal
```
