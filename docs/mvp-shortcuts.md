# MVP shortcuts register

Shortcuts taken to ship the donation hero request queue quickly. Each one must
be resolved before building past the MVP.

This file lists only the shortcuts that live in this repository. The full
register (MVP-01 to MVP-14) lives in the `donordrive-obs-dashboard` repository,
in `docs/mvp-shortcuts.md`, and uses the same IDs.

The connection URL from the dock's setup page is only the channel URL
(`wss://<origin>/api/channel/<key>`). Which incentive counts as a hero request
is an OverwatchRoulette setting: the "Hero request incentive ID" field on the
dashboard, saved in localStorage as `owr:v1:hero-incentive` and shared by every
page of the origin. With no ID saved, no hero requests are queued.

A second field, "Un-complete incentive ID" (`owr:v1:uncomplete-incentive`),
marks the incentive that lets a donor ask to clear a hero's completed state.
Its redemptions are queued as `kind: 'uncomplete'` items, matched against
completed heroes only, and wait in the pending list; accepting one clears
`isCompleted` right away and drops it, so it never joins the queue. With no ID saved, none
are queued. If both fields hold the same ID, it counts as a hero request.

## Code markers

Every shortcut has a comment at the exact spot in the code:

```js
// MVP-SHORTCUT(MVP-xx): <one line>
```

`rg "MVP-SHORTCUT"` lists them all. Every ID in this register must have at
least one marker, and every marker must point to an entry here. When you add a
shortcut, add both; when you fix one, remove both.

## Register

| ID | Where | Shortcut | Risk | Proper fix | Fix before |
|---|---|---|---|---|---|
| MVP-11 | `store/match-hero.js` | Hand-written alias list and fuzzy match; no-match items need a manual pick. | A donor's message matches the wrong hero, or no hero, and the streamer has to fix it before accepting. | Requests now arrive pending and only reach the overlay once the streamer accepts them; what remains is maintaining the aliases from roster data. | When manual picks become frequent |
| MVP-12 | `store/queue.js` | Queue in localStorage, per OBS page; relies on every page connecting and deduping. | Pages that aren't open, or that write at the same moment, see a different queue. | Queue state kept in the `DockChannel` DO or a single owning page, with the other pages subscribing. | The queue going out of sync between pages |
