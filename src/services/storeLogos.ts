/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Store logo registry and resolver.
 *
 * Pure, deterministic matching used to swap generic job icon squares for
 * matching store logos in the Today's Other Jobs Panel. The registry is
 * structured so logo URLs can later be supplied by backend data without
 * changing the resolver contract.
 */

export interface StoreLogoEntry {
  companyId: string;
  displayName: string;
  logoPath: string;
  aliases: string[];
}

export interface StoreLogoMatch {
  companyId: string;
  displayName: string;
  logoPath: string;
}

/** Common filler words stripped before matching a store's name/title text. */
const EXTRA_WORDS = new Set(["revisit", "revision", "store", "pharmacy"]);

export const STORE_LOGO_REGISTRY: readonly StoreLogoEntry[] = [
  {
    companyId: "foods-co",
    displayName: "Foods Co",
    logoPath: "/store-logos/foods-co.svg",
    aliases: ["foods co", "foodsco", "foods"],
  },
  {
    companyId: "sprouts",
    displayName: "Sprouts",
    logoPath: "/store-logos/sprouts.svg",
    aliases: ["sprouts farmers market", "sprouts market", "sprouts farmers", "sfm"],
  },
  {
    companyId: "bevmo",
    displayName: "BevMo",
    logoPath: "/store-logos/bevmo.svg",
    aliases: ["bev mo", "bev"],
  },
  {
    companyId: "walgreens",
    displayName: "Walgreens",
    logoPath: "/store-logos/walgreens.svg",
    aliases: ["walgreens pharmacy"],
  },
  {
    companyId: "dollar-general",
    displayName: "Dollar General",
    logoPath: "/store-logos/dollar-general.svg",
    aliases: ["dollar general market", "dg"],
  },
  {
    companyId: "vons",
    displayName: "Vons",
    logoPath: "/store-logos/vons.svg",
    aliases: [],
  },
  {
    companyId: "target",
    displayName: "Target",
    logoPath: "/store-logos/target.svg",
    aliases: [],
  },
  {
    companyId: "albertsons",
    displayName: "Albertsons",
    logoPath: "/store-logos/albertsons.svg",
    aliases: [],
  },
];

function toMatch(entry: StoreLogoEntry): StoreLogoMatch {
  return { companyId: entry.companyId, displayName: entry.displayName, logoPath: entry.logoPath };
}

/** Lowercases and removes every non-alphanumeric character (e.g. `foods-co` → `foodsco`). */
export function normalizeCompanyId(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Normalizes a company/store/title string for matching: lowercases, strips
 * apostrophes and punctuation, collapses whitespace, and removes store numbers
 * plus common filler words such as `revisit`, `revision`, `store`, and
 * `pharmacy`. Location text such as `White Ln` or `Rosedale` is retained so a
 * token-prefix match on the company name still succeeds.
 */
export function normalizeStoreText(value: string): string {
  return value
    .toLowerCase()
    .replace(/['\u2019]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0 && !EXTRA_WORDS.has(token) && !/^\d+$/.test(token))
    .join(" ");
}

function tokenPrefixMatch(source: string, prefix: string): boolean {
  if (prefix.length === 0) return false;
  const sourceTokens = source.split(" ").filter(Boolean);
  const prefixTokens = prefix.split(" ").filter(Boolean);
  if (prefixTokens.length === 0 || sourceTokens.length < prefixTokens.length) return false;
  return prefixTokens.every((token, index) => sourceTokens[index] === token);
}

export interface StoreLogoResolveOptions {
  /** Stable companyId/storeId if the job already carries one. */
  companyId?: string | null;
  /**
   * Best-available company/store/title text, tried in order. First match wins.
   * Passed without mutating stored job data.
   */
  texts?: readonly (string | null | undefined)[];
}

/**
 * Resolves a registered store logo for a job.
 *
 * Priority:
 * 1. A stable companyId/storeId field, when present.
 * 2. The best available company/store/title text (normalized).
 *
 * Returns `null` when nothing matches so callers keep the generic icon.
 */
export function resolveStoreLogo(options: StoreLogoResolveOptions = {}): StoreLogoMatch | null {
  if (options.companyId) {
    const exact = STORE_LOGO_REGISTRY.find(
      (entry) => entry.companyId.toLowerCase() === options.companyId!.toLowerCase(),
    );
    if (exact) return toMatch(exact);
    const normalizedId = normalizeCompanyId(options.companyId);
    if (normalizedId.length > 0) {
      const byNormalizedId = STORE_LOGO_REGISTRY.find(
        (entry) => normalizeCompanyId(entry.companyId) === normalizedId,
      );
      if (byNormalizedId) return toMatch(byNormalizedId);
    }
  }

  const texts = options.texts ?? [];
  for (const text of texts) {
    if (!text || text.trim().length === 0) continue;
    const normalized = normalizeStoreText(text);
    if (normalized.length === 0) continue;
    for (const entry of STORE_LOGO_REGISTRY) {
      const keys = [entry.companyId, ...entry.aliases].map(normalizeStoreText);
      if (keys.some((key) => tokenPrefixMatch(normalized, key))) {
        return toMatch(entry);
      }
    }
  }

  return null;
}
