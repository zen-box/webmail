/**
 * Generates deterministic DiceBear Critters SVG avatar for any email or name.
 * Each unique address gets a persistent, adorable critter avatar!
 */
export function getDiceBearAvatar(seed?: string): string {
  const clean = (seed || 'webmaill').trim();
  return `https://api.dicebear.com/10.x/critters/svg?seed=${encodeURIComponent(clean)}`;
}
