import sharp from 'sharp';
import { BarcodeFormat, BinaryBitmap, DecodeHintType, HybridBinarizer, MultiFormatReader, RGBLuminanceSource } from '@zxing/library';

/** Decode actual bytes, cap expansion, strip metadata and verify the pictured UPC. */
export async function validateProofImage(input: Buffer, requiredBarcode: string): Promise<Buffer> {
  const jpeg = input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff;
  const png = input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = input.subarray(0, 4).toString() === 'RIFF' && input.subarray(8, 12).toString() === 'WEBP';
  if (!jpeg && !png && !webp) throw new Error('Unsupported image bytes.');
  const options = { limitInputPixels: 12_000_000, failOn: 'error' as const };
  const metadata = await sharp(input, options).metadata();
  if (!['jpeg', 'png', 'webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) {
    throw new Error('A single JPEG, PNG or WebP photo is required.');
  }
  const sanitized = await sharp(input, options).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.UPC_A, BarcodeFormat.EAN_13]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  for (const rotation of [0, 90, 180, 270]) {
    const { data, info } = await sharp(sanitized).rotate(rotation).greyscale().raw().toBuffer({ resolveWithObject: true });
    try {
      const reader = new MultiFormatReader();
      const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(new Uint8ClampedArray(data), info.width, info.height)));
      const text = reader.decode(bitmap, hints).getText();
      if (text === requiredBarcode || text === `0${requiredBarcode}`) return sanitized;
    } catch { /* Try the other photo orientations. */ }
  }
  throw new Error('The required product barcode could not be verified in this photo. Please capture it clearly and retry.');
}
