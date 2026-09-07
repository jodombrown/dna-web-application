// Quick-look overlay bookkeeping (ruling 85). The overlay is a real route layered over Feed;
// Feed must not move. openedFromFeed decides whether dismiss is history.back() (the member came
// from Feed in this session) or a navigation to Feed (they landed on /posts/:id directly).
let openedFromFeed = false;

export function markOpenedFromFeed() {
  openedFromFeed = true;
}

/** Read and clear. */
export function consumeOpenedFromFeed(): boolean {
  const v = openedFromFeed;
  openedFromFeed = false;
  return v;
}
