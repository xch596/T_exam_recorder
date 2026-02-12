// pages/index/index.js
Page({
  data: {
    records: []
  },

  onShow: function () {
    this.loadRecords();
  },

  loadRecords: function () {
    const records = wx.getStorageSync('exam_records') || [];
    // Sort by date descending
    records.sort((a, b) => b.id - a.id);
    this.setData({
      records: records
    });
  },

  goToAdd: function () {
    wx.navigateTo({
      url: '/pages/add/add',
    });
  },

  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`,
    });
  }
})
