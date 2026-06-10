let counter = 0;

/** Generates a reasonably unique, sortable-ish block id. */
export function createId(): string {
  counter = (counter + 1) % 0xffffff;
  const time = Date.now().toString(36);
  const rand = Math.floor(Math.random() * 0xffffff).toString(36);
  return `${time}-${counter.toString(36)}-${rand}`;
}
