export const REQUIRED_SHOWER_BARCODE = '075371003233';
export const SHOWER_CYCLE_RESET_HOUR = 6;

export const getLocalDateKey = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export const getShowerCycleId = (date: Date = new Date()) => {
  const cycleDate = new Date(date);
  if (cycleDate.getHours() < SHOWER_CYCLE_RESET_HOUR) {
    cycleDate.setDate(cycleDate.getDate() - 1);
  }
  return getLocalDateKey(cycleDate);
};

export const getBarcodeEnding = (barcode: string) => barcode.slice(-4);
