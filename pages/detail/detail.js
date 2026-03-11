// pages/detail/detail.js
Page({
  data: {
    record: null,
    originalSrc: '',
    cleanedSrc: '',
    isPaper: false,
    paperPages: [],
    paperSrcMap: {}
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
      const isPaper = record.type === 'paper';
      const pages = isPaper && Array.isArray(record.paperImagePaths) ? record.paperImagePaths : [];
      const original = !isPaper ? (record.originalImagePath || record.imagePath || '') : '';
      const cleaned = !isPaper ? (record.cleanedImagePath || '') : '';
      this.setData({
        record: record,
        originalSrc: original,
        cleanedSrc: cleaned,
        isPaper,
        paperPages: pages,
        paperSrcMap: {}
      });
    } else {
      wx.showToast({
        title: '记录不存在',
        icon: 'none'
      });
      setTimeout(() => wx.navigateBack(), 1500);
    }
  },

  onImageError: function (e) {
    const kind = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.kind : '';
    const record = this.data.record;
    if (!record) return;

    const filePath = kind === 'cleaned' ? (record.cleanedImagePath || '') : (record.originalImagePath || record.imagePath || '');
    if (!filePath) return;
    const fs = wx.getFileSystemManager();

    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        const b64 = res && res.data ? String(res.data).replace(/\s+/g, '') : '';
        if (!b64) return;
        let mime = 'image/png';
        if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) mime = 'image/jpeg';
        if (b64.startsWith('/9j/')) mime = 'image/jpeg';
        if (b64.startsWith('iVBORw0KGgo')) mime = 'image/png';
        const dataUrl = `data:${mime};base64,${b64}`;
        if (kind === 'cleaned') {
          this.setData({ cleanedSrc: dataUrl });
        } else {
          this.setData({ originalSrc: dataUrl });
        }
      },
      fail: (err) => {
        wx.showModal({
          title: '图片加载失败',
          content: err && err.errMsg ? err.errMsg : '无法读取已保存图片',
          showCancel: false
        });
      }
    });
  },

  previewOriginal: function () {
    if (this.data.record && (this.data.record.originalImagePath || this.data.record.imagePath)) {
      wx.previewImage({
        urls: [this.data.originalSrc || this.data.record.originalImagePath || this.data.record.imagePath],
      });
    }
  },

  previewCleaned: function () {
    if (this.data.record && this.data.record.cleanedImagePath) {
      wx.previewImage({
        urls: [this.data.cleanedSrc || this.data.record.cleanedImagePath],
      });
    }
  },

  previewPaper: function () {
    if (!this.data.record || this.data.record.type !== 'paper') return;
    const urls = (this.data.paperPages || []).map((p, idx) => this.data.paperSrcMap[idx] || p);
    if (!urls.length) return;
    wx.previewImage({ urls });
  },

  onPaperImageError: function (e) {
    const idx = e && e.currentTarget && e.currentTarget.dataset ? Number(e.currentTarget.dataset.index) : -1;
    const filePath = e && e.currentTarget && e.currentTarget.dataset ? e.currentTarget.dataset.path : '';
    if (idx < 0 || !filePath) return;
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res) => {
        const b64 = res && res.data ? String(res.data).replace(/\s+/g, '') : '';
        if (!b64) return;
        let mime = 'image/jpeg';
        if (filePath.endsWith('.png')) mime = 'image/png';
        if (b64.startsWith('iVBORw0KGgo')) mime = 'image/png';
        if (b64.startsWith('/9j/')) mime = 'image/jpeg';
        const map = Object.assign({}, this.data.paperSrcMap || {});
        map[idx] = `data:${mime};base64,${b64}`;
        this.setData({ paperSrcMap: map });
      },
      fail: (err) => {
        wx.showModal({
          title: '图片加载失败',
          content: err && err.errMsg ? err.errMsg : '无法读取已保存图片',
          showCancel: false
        });
      }
    });
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
    const paths = [];
    if (this.data.record.imagePath) paths.push(this.data.record.imagePath);
    if (this.data.record.originalImagePath) paths.push(this.data.record.originalImagePath);
    if (this.data.record.cleanedImagePath) paths.push(this.data.record.cleanedImagePath);
    if (Array.isArray(this.data.record.paperImagePaths)) {
      this.data.record.paperImagePaths.forEach(p => { if (p) paths.push(p); });
    }
    const uniq = Array.from(new Set(paths.filter(Boolean)));
    uniq.forEach((p) => {
      fs.removeSavedFile({
        filePath: p,
        success: () => {},
        fail: () => {}
      });
    });

    wx.showToast({
      title: '删除成功',
    });

    setTimeout(() => {
      wx.navigateBack();
    }, 1000);
  }
})
