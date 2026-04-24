export const chooseImage = (): Promise<string[]> => {
  return new Promise((resolve) => {
    // Placeholder for wx.chooseMedia
    console.log('Calling wx.chooseMedia...');
    resolve(['mock-image-url.png']);
  });
};
