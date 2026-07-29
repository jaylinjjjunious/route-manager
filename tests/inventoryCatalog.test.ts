import { describe, expect, it } from 'vitest';
import { findInventoryCatalogMatch, INVENTORY_REFERENCE_CATALOG } from '../src/services/inventory/referenceCatalog';

describe('inventory reference catalog', () => {
  it('contains only the four contract-sourced initial parts', () => {
    expect(INVENTORY_REFERENCE_CATALOG.map(entry => entry.partNumber)).toEqual([
      '24173-02-R',
      'CBL445-040-02-A',
      'MSC445-032-01-A',
      'M379-122-21-WWA-5-DN-0001027',
    ]);
  });

  it('matches normalized scanned values and leaves unknown values unmatched', () => {
    expect(findInventoryCatalogMatch(' cbl44504002a ')?.partNumber).toBe('CBL445-040-02-A');
    expect(findInventoryCatalogMatch('UNKNOWN-PART')).toBeNull();
  });
});
