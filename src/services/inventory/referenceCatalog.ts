export interface InventoryCatalogEntry {
  partNumber: string;
  description: string;
  source: string;
}

// Source: 1099 CE TJX agreement, Trunk Stock List / Parts list.
export const INVENTORY_REFERENCE_CATALOG: InventoryCatalogEntry[] = [
  {
    partNumber: '24173-02-R',
    description: 'CABLE, PURPLE MULTIPORT ETH, PROJECT TJX',
    source: '1099 CE TJX agreement',
  },
  {
    partNumber: 'CBL445-040-02-A',
    description: 'CABLE, MXX PWR USB 12V 1.5A, 2M, PRJ TJX',
    source: '1099 CE TJX agreement',
  },
  {
    partNumber: 'MSC445-032-01-A',
    description: 'CABLE ASSY, BERG ADAPTER, MULTIPORT. PET',
    source: '1099 CE TJX agreement',
  },
  {
    partNumber: 'M379-122-21-WWA-5-DN-0001027',
    description: 'M440, 8" DISPLAY, 2GB RAM / 16GB FLASH, MSR, SCANNER',
    source: '1099 CE TJX agreement',
  },
];

export function normalizeInventoryPartNumber(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function findInventoryCatalogMatch(value: string): InventoryCatalogEntry | null {
  const normalized = normalizeInventoryPartNumber(value);
  if (!normalized) return null;
  return INVENTORY_REFERENCE_CATALOG.find(entry => normalizeInventoryPartNumber(entry.partNumber) === normalized) || null;
}
