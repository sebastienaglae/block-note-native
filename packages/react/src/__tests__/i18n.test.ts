/**
 * Guards the "raw i18n key leaked to the UI" bug class: every default slash item
 * must carry both an English fallback and a key that exists in the catalog, and
 * no catalog value may be empty.
 */
import { describe, expect, it } from "vitest";
import { enLabels } from "../i18n/labels";
import { defaultSlashItems } from "../ui/defaultSlashItems";

describe("i18n catalog", () => {
  it("has no empty label values", () => {
    for (const [key, value] of Object.entries(enLabels)) {
      expect(value, `enLabels["${key}"] should be non-empty`).toBeTruthy();
    }
  });

  it("default slash items reference keys that exist in the catalog", () => {
    const keys = new Set(Object.keys(enLabels));
    for (const item of defaultSlashItems) {
      if (item.titleKey) expect(keys.has(item.titleKey), `missing ${item.titleKey}`).toBe(true);
      if (item.subtitleKey) expect(keys.has(item.subtitleKey), `missing ${item.subtitleKey}`).toBe(true);
    }
  });

  it("every default slash item has an English title fallback", () => {
    for (const item of defaultSlashItems) {
      expect(item.title, `slash item "${item.key}" needs a title`).toBeTruthy();
    }
  });
});
