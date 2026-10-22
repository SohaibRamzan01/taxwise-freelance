import { describe, expect, it } from "vitest";
import { receiptFitsUpload, receiptImagePlan, RECEIPT_MAX_UPLOAD_BYTES, RECEIPT_RESIZE_THRESHOLD_BYTES } from "./image-plan";

describe("receipt image size and dimension decisions", () => {
  it("keeps small images and the exact size/dimension thresholds unchanged", () => {
    expect(receiptImagePlan(RECEIPT_RESIZE_THRESHOLD_BYTES, 2000, 1000)).toEqual({ reencode: false, width: 2000, height: 1000 });
    expect(receiptImagePlan(100, 800, 1200).reencode).toBe(false);
    expect(receiptImagePlan(RECEIPT_RESIZE_THRESHOLD_BYTES + 1, 800, 1200)).toEqual({ reencode: true, width: 800, height: 1200 });
  });
  it.each([
    [4000, 3000, 2000, 1500], [3000, 4000, 1500, 2000],
    [3000, 3000, 2000, 2000], [2001, 1000, 2000, 1000], [1, 10000, 1, 2000],
  ])("scales %i x %i without upscaling or exceeding 2000px", (width, height, expectedWidth, expectedHeight) => {
    expect(receiptImagePlan(100, width, height)).toEqual({ reencode: true, width: expectedWidth, height: expectedHeight });
  });
  it("accepts phone photos above the server limit for preparation and bounds the final upload", () => {
    expect(receiptImagePlan(12 * 1024 * 1024, 4032, 3024)).toEqual({ reencode: true, width: 2000, height: 1500 });
    expect(receiptFitsUpload(RECEIPT_MAX_UPLOAD_BYTES)).toBe(true);
    for (const size of [0, -1, NaN, Infinity, 1.5, RECEIPT_MAX_UPLOAD_BYTES + 1]) expect(receiptFitsUpload(size)).toBe(false);
  });
  it.each([[0, 100, 100], [1, 0, 100], [1, 100, -1], [NaN, 100, 100], [1, Infinity, 100], [1, 1.5, 100]])("rejects invalid input %s/%s/%s", (size, width, height) => {
    expect(() => receiptImagePlan(size, width, height)).toThrow(RangeError);
  });
});
