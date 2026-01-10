import heic2any from 'heic2any';

/**
 * Converts a File to JPEG if it's an HEIC image.
 * Returns the original file if it's not HEIC.
 */
export async function convertHeicToJpeg(file: File): Promise<File> {
  const isHeic = file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic');
  if (!isHeic) return file;

  try {
    const blob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.9,
    });

    const resultBlob = Array.isArray(blob) ? blob[0] : blob;
    const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
    return new File([resultBlob], newName, { type: 'image/jpeg' });
  } catch (error) {
    console.error("HEIC conversion failed:", error);
    throw new Error("HEIC conversion failed. Please try a different image format.");
  }
}

/**
 * Converts a File object to a base64 Data URL.
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Processes an uploaded image file: converts HEIC to JPEG and returns a Data URL.
 */
export async function processImageFileToDataUrl(file: File): Promise<{ dataUrl: string; mimeType: string; }> {
  const converted = await convertHeicToJpeg(file);
  const dataUrl = await fileToDataUrl(converted);
  return { dataUrl, mimeType: converted.type };
}

/**
 * Resizes and compresses a base64 image string.
 * Returns base64 string without data prefix.
 */
export async function compressImageBase64(base64: string, maxSize = 1024, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const prefix = base64.startsWith('data:') ? '' : 'data:image/jpeg;base64,';
    img.src = prefix + base64;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context failed'));
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl.split(',')[1]);
    };
    img.onerror = () => reject(new Error('Failed to load image for compression'));
  });
}
