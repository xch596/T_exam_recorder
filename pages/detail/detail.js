// pages/detail/detail.js
Page({
  data: {
    record: null
  },

  onLoad: function (options) {
    if (options.id) {
      this.loadRecord(options.id);
    }
  },

  loadRecord: function (id) {
    const records = wx.getStorageSync('exam_records') || [];
    // id in storage is number, options.id is string
    const record = records.find(r => r.id == id);
    if (record) {
      this.setData({
        record: record
      });
    } else {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  previewImage: function () {
    if (this.data.record && this.data.record.imagePath) {
      wx.previewImage({
        urls: [this.data.record.imagePath],
      });
    }
  },

  deleteRecord: function () {
    wx.showModal({
      title: '提示',
      content: '确定要删除这条错题记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.doDelete();
        }
      }
    });
  },

  doDelete: function () {
    const id = this.data.record.id;
    let records = wx.getStorageSync('exam_records') || [];
    
    // 1. Remove from array
    records = records.filter(r => r.id != id);
    wx.setStorageSync('exam_records', records);

    // 2. Remove file (optional but good practice)
    const fs = wx.getFileSystemManager();
    fs.removeSavedFile({
      filePath: this.data.record.imagePath,
      success: () => {
        console.log('File removed');
      },
      fail: (err) => {
        console.log('File remove failed', err);
      }
    });

    wx.showToast({
      title: '删除成功',
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
})
