import {
  inferImageTypeFromName,
  isSupportedLocalImageType,
  type LocalImageInput,
  type SupportedLocalImageType,
} from '../../types/models/local-image.schema';

export interface WechatLocalImageInput {
  tempFilePath: string;
  name: string;
  type: SupportedLocalImageType;
  size: number;
}

interface WxApi {
  chooseMedia: (options: {
    count: number;
    mediaType: string[];
    sourceType: string[];
    success: (result: { tempFiles?: Array<{ tempFilePath: string; size?: number; fileType?: string }> }) => void;
    fail: (error: unknown) => void;
  }) => void;
  getFileSystemManager: () => {
    readFile: (options: {
      filePath: string;
      encoding: 'base64';
      success: (result: { data: string }) => void;
      fail: (error: unknown) => void;
    }) => void;
  };
}

const getWxApi = (): WxApi => {
  const wxApi = (globalThis as typeof globalThis & { wx?: WxApi }).wx;

  if (!wxApi) {
    throw new Error('wx.chooseMedia is only available in a WeChat Mini Program runtime');
  }

  return wxApi;
};

const filenameFromPath = (path: string): string => {
  return path.split('/').pop() || 'image.jpg';
};

const typeFromWxFile = (file: { tempFilePath: string; fileType?: string }): SupportedLocalImageType => {
  if (file.fileType && isSupportedLocalImageType(file.fileType)) {
    return file.fileType;
  }

  const inferred = inferImageTypeFromName(file.tempFilePath);

  if (inferred) {
    return inferred;
  }

  return 'image/jpeg';
};

export const chooseImage = (): Promise<WechatLocalImageInput[]> => {
  return new Promise((resolve, reject) => {
    let wxApi: WxApi;

    try {
      wxApi = getWxApi();
    } catch (error) {
      reject(error);
      return;
    }

    wxApi.chooseMedia({
      count: 9,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (result) => {
        resolve(
          result.tempFiles?.map((file) => ({
            tempFilePath: file.tempFilePath,
            name: filenameFromPath(file.tempFilePath),
            type: typeFromWxFile(file),
            size: file.size ?? 0,
          })) ?? [],
        );
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
};

export const readWechatImageAsLocalInput = (image: WechatLocalImageInput): Promise<LocalImageInput> => {
  return new Promise((resolve, reject) => {
    let wxApi: WxApi;

    try {
      wxApi = getWxApi();
    } catch (error) {
      reject(error);
      return;
    }

    wxApi.getFileSystemManager().readFile({
      filePath: image.tempFilePath,
      encoding: 'base64',
      success: (result) => {
        resolve({
          dataUrl: `data:${image.type};base64,${result.data}`,
          name: image.name,
          type: image.type,
          size: image.size,
        });
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
};
