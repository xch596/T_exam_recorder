// app.js
App({
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  globalData: {
    userInfo: null,
    serverBaseUrl: 'http://192.168.31.247:8001',
    serverRemoveHandwritingPath: '/remove-handwriting'
  }
})
