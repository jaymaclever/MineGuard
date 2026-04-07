import imageCompression from 'browser-image-compression';

export interface PhotoCompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  initialQuality?: number;
}

const DEFAULT_OPTIONS: Required<PhotoCompressionOptions> = {
  maxSizeMB: 0.3,
  maxWidthOrHeight: 1280,
  initialQuality: 0.82,
};

const toJpegFileName = (name: string) => {
  const baseName = name.replace(/\.[^.]+$/, '').trim() || 'photo';
  return `${baseName}.jpg`;
};

export async function compressPhotoToJpeg(file: File, overrides: PhotoCompressionOptions = {}) {
  const compressed = await imageCompression(file, {
    maxSizeMB: overrides.maxSizeMB ?? DEFAULT_OPTIONS.maxSizeMB,
    maxWidthOrHeight: overrides.maxWidthOrHeight ?? DEFAULT_OPTIONS.maxWidthOrHeight,
    initialQuality: overrides.initialQuality ?? DEFAULT_OPTIONS.initialQuality,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });

  const blob = compressed instanceof Blob ? compressed : new Blob([compressed], { type: 'image/jpeg' });

  return new File([blob], toJpegFileName(file.name), {
    type: 'image/jpeg',
    lastModified: file.lastModified || Date.now(),
  });
}
