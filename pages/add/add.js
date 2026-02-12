// pages/add/add.js
Page({
  data: {
    imagePath: '',
    note: ''
  },

  chooseImage: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imagePath: tempFilePath
        });
      }
    });
  },

  onInputNote: function (e) {
    this.setData({
      note: e.detail.value
    });
  },

  saveRecord: function () {
    if (!this.data.imagePath) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '保存中...',
    });

    // 1. Save file permanently
    const fs = wx.getFileSystemManager();
    const tempPath = this.data.imagePath;
    // Generate a unique filename
    const fileName = `exam_${Date.now()}.png`;
    const savedFilePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

    fs.saveFile({
      tempFilePath: tempPath,
      filePath: savedFilePath,
      success: (res) => {
        const finalPath = res.savedFilePath;
        
        // 2. Create record
        const newRecord = {
          id: Date.now(),
          imagePath: finalPath,
          note: this.data.note,
          date: new Date().toLocaleString()
        };

        // 3. Save to storage
        const records = wx.getStorageSync('exam_records') || [];
        records.unshift(newRecord); // Add to beginning
        wx.setStorageSync('exam_records', records);

        wx.hideLoading();
        wx.showToast({
          title: '保存成功',
        });

        // 4. Navigate back
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      },
      fail: (err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({
          title: '保存文件失败',
          icon: 'none'
        });
      }
    });
  }
})
