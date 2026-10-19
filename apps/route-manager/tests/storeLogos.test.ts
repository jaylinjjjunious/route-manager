import { describe, expect, it } from "vitest";
import {
  normalizeCompanyId,
  normalizeStoreText,
  resolveStoreLogo,
  STORE_LOGO_REGISTRY,
} from "../src/services/storeLogos";

describe("store logo registry", () => {
  it("registers all nine supported stores", () => {
    expect(STORE_LOGO_REGISTRY.map((entry) => entry.companyId)).toEqual([
      "foods-co",
      "sprouts",
      "bevmo",
      "walgreens",
      "dollar-general",
      "family-dollar",
      "vons",
      "target",
      "albertsons",
    ]);
  });

  it("maps logo paths for all nine registered stores", () => {
    const expectedPaths: Record<string, string> = {
      "foods-co": "/store-logos/foods-co.svg",
      sprouts: "/store-logos/sprouts.svg",
      bevmo: "/store-logos/bevmo.svg",
      walgreens: "/store-logos/walgreens.svg",
      "dollar-general": "/store-logos/dollar-general.svg",
      "family-dollar": "/store-logos/family-dollar.svg",
      vons: "/store-logos/vons.svg",
      target: "/store-logos/target.svg",
      albertsons: "/store-logos/albertsons.svg",
    };
    for (const entry of STORE_LOGO_REGISTRY) {
      expect(entry.logoPath).toBe(expectedPaths[entry.companyId]);
      expect(entry.displayName.length).toBeGreaterThan(0);
    }
  });
});

describe("normalizeStoreText", () => {
  it("normalizes case, punctuation, apostrophes, and repeated spaces", () => {
    expect(normalizeStoreText("  Vons   #203 ")).toBe("vons");
    expect(normalizeStoreText("Dollar General - White Ln")).toBe("dollar general white ln");
    expect(normalizeStoreText("Walgreens Pharmacy #1234")).toBe("walgreens");
    expect(normalizeStoreText("albertsons' Rosedale")).toBe("albertsons rosedale");
  });

  it("strips store numbers and common extra words", () => {
    expect(normalizeStoreText("Target Store 1384")).toBe("target");
    expect(normalizeStoreText("Vons Revisit")).toBe("vons");
    expect(normalizeStoreText("Walgreens Revision")).toBe("walgreens");
  });
});

describe("normalizeCompanyId", () => {
  it("collapses separators and case", () => {
    expect(normalizeCompanyId("foods-co")).toBe("foodsco");
    expect(normalizeCompanyId("FOODS_CO")).toBe("foodsco");
  });
});

describe("resolveStoreLogo", () => {
  it("matches an exact stable companyId", () => {
    expect(resolveStoreLogo({ companyId: "vons" })).toMatchObject({
      companyId: "vons",
      displayName: "Vons",
      logoPath: "/store-logos/vons.svg",
    });
    expect(resolveStoreLogo({ companyId: "dollar-general" })).toMatchObject({
      companyId: "dollar-general",
      logoPath: "/store-logos/dollar-general.svg",
    });
    expect(resolveStoreLogo({ companyId: "family-dollar" })).toMatchObject({
      companyId: "family-dollar",
      displayName: "Family Dollar",
      logoPath: "/store-logos/family-dollar.svg",
    });
  });

  it("matches a normalized companyId", () => {
    expect(resolveStoreLogo({ companyId: "Foods-CO" })).toMatchObject({ companyId: "foods-co" });
    expect(resolveStoreLogo({ companyId: "foodsco" })).toMatchObject({ companyId: "foods-co" });
  });

  it("matches a normalized alias", () => {
    expect(resolveStoreLogo({ texts: ["SFM"] })).toMatchObject({ companyId: "sprouts" });
    expect(resolveStoreLogo({ texts: ["Foods Co"] })).toMatchObject({ companyId: "foods-co" });
  });

  it("resolves Vons Revisit to Vons", () => {
    expect(resolveStoreLogo({ texts: ["Vons Revisit"] })).toMatchObject({ companyId: "vons" });
  });

  it("keeps matching through store numbers", () => {
    expect(resolveStoreLogo({ texts: ["Vons #203"] })).toMatchObject({ companyId: "vons" });
    expect(resolveStoreLogo({ texts: ["Target Store 1384"] })).toMatchObject({ companyId: "target" });
  });

  it("resolves Walgreens Pharmacy to Walgreens", () => {
    expect(resolveStoreLogo({ texts: ["Walgreens Pharmacy #1234"] })).toMatchObject({
      companyId: "walgreens",
    });
  });

  it("resolves Family Dollar by companyId", () => {
    expect(resolveStoreLogo({ companyId: "family-dollar" })).toMatchObject({
      companyId: "family-dollar",
    });
    expect(resolveStoreLogo({ companyId: "Family-Dollar" })).toMatchObject({
      companyId: "family-dollar",
    });
    expect(resolveStoreLogo({ companyId: "familydollar" })).toMatchObject({
      companyId: "family-dollar",
    });
  });

  it("resolves Family Dollar from names with store numbers or locations", () => {
    expect(resolveStoreLogo({ texts: ["Family Dollar 2151 S Chester Ave"] })).toMatchObject({
      companyId: "family-dollar",
    });
    expect(resolveStoreLogo({ texts: ["Family Dollar Store #5101"] })).toMatchObject({
      companyId: "family-dollar",
    });
    expect(resolveStoreLogo({ texts: ["Family Dollar Store"] })).toMatchObject({
      companyId: "family-dollar",
    });
  });

  it("resolves the remaining example titles", () => {
    expect(resolveStoreLogo({ texts: ["Dollar General - White Ln"] })).toMatchObject({
      companyId: "dollar-general",
    });
    expect(resolveStoreLogo({ texts: ["Albertsons Rosedale"] })).toMatchObject({
      companyId: "albertsons",
    });
    expect(resolveStoreLogo({ texts: ["Sprouts Farmers Market"] })).toMatchObject({
      companyId: "sprouts",
    });
    expect(resolveStoreLogo({ texts: ["BevMo Stockdale Hwy #500"] })).toMatchObject({
      companyId: "bevmo",
    });
  });

  it("resolves existing saved jobs without migration", () => {
    const savedStoreNames = [
      "Vons",
      "Vons #203",
      "Target Store 1384",
      "Walgreens Pharmacy #1234",
      "Dollar General - White Ln",
      "Family Dollar 2151 S Chester Ave",
      "Albertsons Rosedale",
      "Sprouts",
      "Foods Co",
      "BevMo",
    ];
    const expected: Array<string | null> = [
      "vons",
      "vons",
      "target",
      "walgreens",
      "dollar-general",
      "family-dollar",
      "albertsons",
      "sprouts",
      "foods-co",
      "bevmo",
    ];
    expect(savedStoreNames.map((name) => resolveStoreLogo({ texts: [name] })?.companyId ?? null)).toEqual(
      expected,
    );
  });

  it("tries text sources in order and returns the first match", () => {
    expect(resolveStoreLogo({ texts: [null, "", "Vons", "Target"] })).toMatchObject({
      companyId: "vons",
    });
  });

  it("returns the fallback (null) for unknown companies", () => {
    expect(resolveStoreLogo({ texts: ["Tractor Supply / Buck Café Revisit"] })).toBeNull();
    expect(resolveStoreLogo({ texts: ["Smart & Final Grand"] })).toBeNull();
    expect(resolveStoreLogo({ texts: [""] })).toBeNull();
    expect(resolveStoreLogo({})).toBeNull();
    expect(resolveStoreLogo({ companyId: "unknown-store" })).toBeNull();
  });
});
