# Starman Ticket System (Bulletin Board)

A shared, in-app board where the Aspire team posts improvements and
recommendations, votes on them, and discusses them. It lives inside the Starman
design prototype (`design/Starman.html`) under **Administration**, between
**Meeting Intel** and **Data Vault**.

## What it is for

Turn scattered "we should improve X" comments into one visible, rankable list the
whole practice can see and act on. Anyone on the team can post an idea, everyone
can vote, and the President (admin) decides what gets planned and built.

## Where to find it

Sign in, then open **Bulletin Board** from the left sidebar under Administration.
The nav badge shows how many posts are still marked New.

## Core features

- **Post an idea.** Select **+ New post**, give it a title, pick a category, and
  describe the improvement or recommendation.
- **Categories:** Improvement, Feature, Bug, Process, Recommendation.
- **Vote.** One upvote per person per post. Click the vote button again to remove
  your vote. Posts are ranked by votes, then by recency.
- **Discuss.** Open any post to read and add comments.
- **Status (admin).** The President can set each post through the workflow:
  New, Under Review, Planned, In Progress, Done.
- **Filter.** Tabs across the top filter by status.
- **Team roster.** The right rail lists the Aspire team, with the admin marked.

## Notifications

- Creating a post raises a notification (recommendations are called out
  specifically) so the admin is alerted when new ideas arrive.
- Commenting on a post notifies its author.
- A status change notifies the author that their idea moved forward.

Notifications appear in the bell menu, and the sidebar badge counts New posts.

## Accounts and roles

Accounts match the real Aspire team (source: aspireplanning.ca/our-team). Each
person has a profile: name, role, email, and a coloured avatar.

- **Admin:** Andrew Lee (President). Admins can set post status.
- **Contributors:** all other team members can post, vote, and comment.
- **Default signed-in user:** Jack Duzan (Intern).

### Demo login

This is a prototype with no real authentication server. Every account signs in
with its Aspire email and the shared, already-public demo password
`starman123`. No unique per-person secrets are stored or committed. For example:

- `andrew@aspire.ca` / `starman123` signs in as the admin.
- `jack@aspire.ca` / `starman123` signs in as the default user.

Do not treat these as real credentials. In production, authentication would move
to the Starman server (JWT, bcrypt) as documented in `docs/ARCHITECTURE.md`.

## How it works (prototype)

- **State:** posts are held in the browser under the `sm4_tickets` localStorage
  key and reseeded from `seedTickets()` on a fresh load or after Reset demo data.
- **Audit:** every action (post created, upvoted, commented, status set, sign in)
  is written to the local audit log with the acting user and a timestamp.
- **No data leaves the device.** Like the rest of the prototype, the board runs on
  local demo data only.

## Data shape

Each post is one object:

```js
{
  id,                 // number
  title,              // string
  body,               // string
  cat,                // one of TICKET_CATS
  status,             // one of TICKET_STATUS
  author,             // team key, e.g. "JD"
  votes: [],          // array of team keys
  at,                 // ISO timestamp
  comments: [ { by, text, at } ]
}
```

## Production path

The prototype proves the workflow. A production version would move posts, votes,
and comments into Postgres (org-scoped, one board per firm), reuse the existing
audit log, and send notifications through the server. See `SKILL.md` in this
folder for how to extend the feature.
