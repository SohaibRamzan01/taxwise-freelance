import { receiptFitsUpload, receiptImagePlan } from "./image-plan";

const tooLarge = "This photo is still too large after resizing. Try cropping it or taking a closer photo of just the receipt.";

/** Browser-only preparation; the server still validates size, MIME and magic bytes. */
export async function prepareReceiptImage(file: File): Promise<File> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("We couldn't read this photo. Choose a different JPG, PNG or WebP image, or enter the expense manually.");
  }
  try {
    const plan = receiptImagePlan(file.size, bitmap.width, bitmap.height);
    if (!plan.reencode) {
      if (!receiptFitsUpload(file.size)) throw new Error(tooLarge);
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = plan.width; canvas.height = plan.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("We couldn't resize this photo. Try a smaller image or enter the expense manually.");
    // Flatten transparent PNG/WebP receipts onto white for JPEG.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, plan.width, plan.height);
    context.drawImage(bitmap, 0, 0, plan.width, plan.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) throw new Error("We couldn't resize this photo. Try a smaller image or enter the expense manually.");
    if (!receiptFitsUpload(blob.size)) throw new Error(tooLarge);
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
