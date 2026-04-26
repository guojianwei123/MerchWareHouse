export const login = (): Promise<string> => {
  return new Promise((resolve, reject) => {
    const wxApi = globalThis as typeof globalThis & {
      wx?: {
        login: (options: {
          success: (result: { code?: string }) => void;
          fail: (error: unknown) => void;
        }) => void;
      };
    };

    if (!wxApi.wx) {
      reject(new Error('wx.login is only available in a WeChat Mini Program runtime'));
      return;
    }

    wxApi.wx.login({
      success: (result) => {
        if (!result.code) {
          reject(new Error('wx.login did not return a code'));
          return;
        }

        resolve(result.code);
      },
      fail: (error) => {
        reject(error);
      },
    });
  });
};
