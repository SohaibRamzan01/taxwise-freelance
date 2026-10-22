export const RECEIPT_RESIZE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;
export const RECEIPT_MAX_EDGE = 2000;
// Leave room for multipart headers below Vercel's 4.5 MB request limit.
export const RECEIPT_MAX_UPLOAD_BYTES = 4_000_000;

/** Dimensions must be measured after applying the image's EXIF orientation. */
export function receiptImagePlan(size: number, width: number, height: number) {
  if (![size, width, height].every(value => Number.isSafeInteger(value) && value > 0)) {
    throw new RangeError("The receipt image is empty or has invalid dimensions.");
  }
  const scale = Math.min(1, RECEIPT_MAX_EDGE / Math.max(width, height));
  return {
    reencode: size > RECEIPT_RESIZE_THRESHOLD_BYTES || scale < 1,
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function receiptFitsUpload(size: number) {
  return Number.isSafeInteger(size) && size > 0 && size <= RECEIPT_MAX_UPLOAD_BYTES;
}
