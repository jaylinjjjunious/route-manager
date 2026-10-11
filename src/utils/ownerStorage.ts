// Only authenticated shell code selects an owner. Unattributed legacy keys are
// preserved for an explicit ownership-confirmed import, never adopted silently.
let activeOwner: string | null = null;
let ownerEpoch = 0;
export function setStorageOwner(owner: string | null) { if (activeOwner !== owner) ownerEpoch += 1; activeOwner = owner; }
export function getStorageOwnerEpoch() { return ownerEpoch; }
export function getStorageOwner() { return activeOwner; }
export function ownedStorageKey(key: string) { return activeOwner ? `${key}:${activeOwner}` : null; }
export function readOwnedStorage(key: string) {
  const scoped = ownedStorageKey(key);
  return scoped ? localStorage.getItem(scoped) : null;
}
export function writeOwnedStorage(key: string, value: string) {
  const scoped = ownedStorageKey(key);
  if (scoped) localStorage.setItem(scoped, value);
}
export function removeOwnedStorage(key: string) {
  const scoped = ownedStorageKey(key);
  if (scoped) localStorage.removeItem(scoped);
}
