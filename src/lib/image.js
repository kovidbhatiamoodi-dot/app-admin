// Client-side event-image validation + optimization.
//
// Zero-dependency: uses Canvas for resize + WebP output. No new npm package.
// Strategy is dimension limiting + quality-level compression — NOT a targeted
// percentage file-size reduction (a fixed % target would over-compress small
// images and under-compress huge ones).

export const MAX_IMAGE_WIDTH = 1600;
export const MAX_IMAGE_HEIGHT = 1600;
export const IMAGE_OUTPUT_FORMAT = 'image/webp';
export const IMAGE_QUALITY = 0.75;
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024; // 5 MB (post-compression guard)
export const MAX_SOURCE_SIZE = 15 * 1024 * 1024; // 15 MB (pre-compression guard)
export const MIN_IMAGE_DIMENSION = 100; // px — reject accidental thumbnails/icons
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const loadImageDimensions = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dims = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dims);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Selected file is not a readable image'));
    };
    img.src = url;
  });

const checkTypeAndSize = (file) => {
  if (!file) return 'Please choose an image file';
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Unsupported image type — use JPG, PNG, or WebP';
  }
  if (file.size > MAX_SOURCE_SIZE) {
    return `Image is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Please use a file under ${MAX_SOURCE_SIZE / 1024 / 1024} MB`;
  }
  return '';
};

// Fast synchronous checks (type + source size). Dimension checks are async.
export function validateImageFile(file) {
  return checkTypeAndSize(file);
}

// Full validation including decode + dimensions. Call before compress/upload.
export async function validateImageDimensions(file) {
  const syncError = checkTypeAndSize(file);
  if (syncError) return syncError;
  let dims;
  try {
    dims = await loadImageDimensions(file);
  } catch {
    return 'Selected file could not be read as an image';
  }
  if (dims.width < MIN_IMAGE_DIMENSION || dims.height < MIN_IMAGE_DIMENSION) {
    return `Image is too small (${dims.width}×${dims.height}px). Minimum is ${MIN_IMAGE_DIMENSION}×${MIN_IMAGE_DIMENSION}px`;
  }
  return '';
}

const fitWithinBounds = (width, height) => {
  const scale = Math.min(1, MAX_IMAGE_WIDTH / width, MAX_IMAGE_HEIGHT / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

const fileExtensionFor = (mimeType) => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/jpeg') return 'jpg';
  return 'webp';
};

// Resize to fit MAX_IMAGE_WIDTH/HEIGHT (aspect-preserving, never upscale),
// then encode to WebP at IMAGE_QUALITY. Throws on failure so callers can
// abort the event submission via the existing error UI.
export async function compressImage(file) {
  const dims = await loadImageDimensions(file);
  const target = fitWithinBounds(dims.width, dims.height);

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image for compression'));
      el.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = target.width;
    canvas.height = target.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Image compression is not supported in this browser');
    ctx.drawImage(img, 0, 0, target.width, target.height);

    // Prefer WebP; fall back to the source type if the browser can't encode it.
    let blob = await canvasToBlob(canvas, IMAGE_OUTPUT_FORMAT, IMAGE_QUALITY);
    let mimeType = IMAGE_OUTPUT_FORMAT;
    if (!blob && file.type && file.type !== IMAGE_OUTPUT_FORMAT) {
      blob = await canvasToBlob(canvas, file.type, IMAGE_QUALITY);
      mimeType = file.type;
    }
    if (!blob) throw new Error('Image compression failed — please try another image');

    if (blob.size > MAX_UPLOAD_SIZE) {
      throw new Error(
        `Compressed image is still too large (${(blob.size / 1024 / 1024).toFixed(1)} MB). Please use a smaller image`
      );
    }

    const baseName = (file.name || 'event-image').replace(/\.[^.]+$/, '');
    return new File([blob], `${baseName}.${fileExtensionFor(mimeType)}`, { type: mimeType });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}

export function revokePreviewUrl(url) {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
}
