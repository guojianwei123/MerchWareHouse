export const SUPPORTED_LOCAL_IMAGE_TYPES = ['image/jpeg', 'image/png'] as const;

export const LOCAL_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const LOCAL_IMAGE_ACCEPT = SUPPORTED_LOCAL_IMAGE_TYPES.join(',');

export type SupportedLocalImageType = (typeof SUPPORTED_LOCAL_IMAGE_TYPES)[number];

export interface LocalImageInput {
  dataUrl: string;
  name: string;
  type: SupportedLocalImageType;
  size: number;
}

export const isSupportedLocalImageType = (type: string): type is SupportedLocalImageType => {
  return SUPPORTED_LOCAL_IMAGE_TYPES.includes(type as SupportedLocalImageType);
};

export const isSupportedImageDataUrl = (value: string): boolean => {
  const match = value.match(/^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/]+={0,2})$/);

  if (!match) {
    return false;
  }

  const payload = match[2];
  return payload.length > 0 && payload.length % 4 !== 1;
};

export const isSupportedImageSource = (value: string): boolean => {
  if (value.length === 0 || isSupportedImageDataUrl(value)) {
    return isSupportedImageDataUrl(value);
  }

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const inferImageTypeFromName = (name: string): SupportedLocalImageType | null => {
  const normalized = name.toLowerCase();

  if (normalized.endsWith('.jpg') || normalized.endsWith('.jpeg')) {
    return 'image/jpeg';
  }

  if (normalized.endsWith('.png')) {
    return 'image/png';
  }

  return null;
};
