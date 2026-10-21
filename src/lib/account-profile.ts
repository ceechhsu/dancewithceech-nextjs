export type AccountProfile = {
  account: string;
  first_name: string;
  last_name: string;
  display_name: string;
  photo_mode: string;
  photo_url: string;
  google_photo_url: string;
  email: string;
}

/** Only a small, centered JPEG reaches the server; the original stays on-device. */
export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Choose a JPG, PNG or WebP photo up to 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 50_000_000) throw new Error('Choose a smaller photo.')
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 384
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo editing is unavailable in this browser.')
    const side = Math.min(bitmap.width, bitmap.height)
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, 384, 384)
    context.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 384, 384)
    return canvas.toDataURL('image/jpeg', .85)
  } finally { bitmap.close() }
}
