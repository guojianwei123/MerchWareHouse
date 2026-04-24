export const login = (): Promise<string> => {
  return new Promise((resolve) => {
    // Placeholder for wx.login
    console.log('Calling wx.login...');
    resolve('mock-code-12345');
  });
};
