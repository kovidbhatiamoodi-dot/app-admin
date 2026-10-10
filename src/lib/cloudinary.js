// Unsigned Cloudinary direct upload for event images.
//
// Security: browser code holds ONLY the public cloud name + unsigned upload
// preset. No API secret, signing secret, or private credential lives here.
// The backend keeps using its own server-side credentials (see
// app_backend/src/utils/cloudinary.js) — this module never touches those.
//
// Flow: React -> Cloudinary (direct) -> secure_url -> existing Moodi event
// POST payload (imageUrl). The image binary never goes through our backend.
//
// NOTE: there is intentionally no delete/destroy helper here. Orphaned
// uploads (Cloudinary succeeded, event POST failed) are documented, not
// cleaned up from the browser — deletion needs the API secret server-side.

export const CLOUDINARY_FOLDER = 'events/';

export function getCloudinaryConfig() {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Image upload is not configured (missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET). Contact the app admin to set the unsigned upload preset.'
    );
  }
  return { cloudName, uploadPreset };
}

// Uploads an optimized image Blob/File. Resolves to the secure_url string.
// Throws with a human-readable message for the existing error UI.
export async function uploadToCloudinary(file) {
  const { cloudName, uploadPreset } = getCloudinaryConfig();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', CLOUDINARY_FOLDER);

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Could not reach Cloudinary — check your connection and try again');
  }

  let json = null;
  try {
    json = await res.json();
  } catch {
    // fall through to the !res.ok handler below
  }

  if (!res.ok) {
    throw new Error(json?.error?.message || `Image upload failed (${res.status})`);
  }

  const secureUrl = json?.secure_url;
  if (!secureUrl) throw new Error('Image upload returned no URL — please try again');
  return secureUrl;
}
