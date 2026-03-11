// pages/add/add.js
const app = getApp();

function getServerUrl() {
  const base = app && app.globalData && app.globalData.serverBaseUrl ? app.globalData.serverBaseUrl : 'http://127.0.0.1:8001';
  const path = app && app.globalData && app.globalData.serverRemoveHandwritingPath ? app.globalData.serverRemoveHandwritingPath : '/remove-handwriting';
  return `${base}${path}`;
}

Page({
  data: {
    imagePath: '',
    processedImagePath: '', // 存储处理后（去笔迹）的图片
    processedFilePath: '',
    croppedOriginalPath: '',
    croppedCleanedPath: '',
    cropMode: false,
    cropDisplaySrc: '',
    cropRectActive: false,
    cropRectLeft: 0,
    cropRectTop: 0,
    cropRectWidth: 0,
    cropRectHeight: 0,
    cropWrapLeft: 0,
    cropWrapTop: 0,
    cropWrapWidth: 0,
    cropWrapHeight: 0,
    cropImageWidth: 0,
    cropImageHeight: 0,
    cropStartX: 0,
    cropStartY: 0,
    rectDragMode: '',
    rectHandle: '',
    rectTouchStartX: 0,
    rectTouchStartY: 0,
    rectBaseLeft: 0,
    rectBaseTop: 0,
    rectBaseWidth: 0,
    rectBaseHeight: 0,
    canvasW: 1,
    canvasH: 1,
    isProcessing: false,
    note: '',
    
    // 分类数据
    subjects: ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'],
    grades: ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'],
    semesters: ['上册', '下册'],
    
    // 选中索引
    subjectIndex: 1, // 默认数学
    gradeIndex: 0,
    semesterIndex: 0
  },

  confirmCropAndSave: async function () {
    await this.confirmCrop();
    if (this.data.croppedCleanedPath) {
      this.saveRecord();
    }
  },

  // 选择图片
  chooseImage: function () {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imagePath: tempFilePath,
          processedImagePath: '',
          processedFilePath: '',
          croppedOriginalPath: '',
          croppedCleanedPath: '',
          cropMode: false,
          cropDisplaySrc: '',
          cropRectActive: false
        });
      }
    });
  },

  // 真实去笔迹/OCR处理
  processImage: function() {
    if (!this.data.imagePath) return;
    
    this.setData({ isProcessing: true });
    wx.showLoading({ title: 'AI处理中...', mask: true });

    wx.uploadFile({
      url: getServerUrl(),
      filePath: this.data.imagePath,
      name: 'file',
      //formData: {}, // 不需要额外参数了
      success: (res) => {
        if (res.statusCode === 200) {
          try {
            const data = JSON.parse(res.data);
            if (data.image_base64) {
              const raw = String(data.image_base64);
              const m = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
              let mime = m && m[1] ? m[1] : '';
              let b64 = m && m[2] ? m[2] : '';
              b64 = b64.replace(/\s+/g, '');
              if (b64.startsWith('/9j/')) mime = 'image/jpeg';
              if (b64.startsWith('iVBORw0KGgo')) mime = 'image/png';
              const normalized = mime ? `data:${mime};base64,${b64}` : raw;
              this.setData({
                processedImagePath: normalized,
                processedFilePath: '',
                croppedOriginalPath: '',
                croppedCleanedPath: '',
                cropDisplaySrc: ''
              });
              this.persistDataUrlToFile(normalized).then((p) => {
                if (p) this.setData({ processedFilePath: p });
              });
              wx.showToast({ title: '去笔迹成功', icon: 'success' });
            } else {
              const errMsg = data.error ? String(data.error) : '无数据';
              wx.showModal({
                title: '处理失败',
                content: errMsg,
                showCancel: false
              });
            }
          } catch (e) {
            console.error('Parse error', e);
            wx.showToast({ title: '解析响应失败', icon: 'none' });
          }
        } else {
          wx.showToast({ title: '服务器错误: ' + res.statusCode, icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('Upload failed', err);
        wx.showModal({
          title: '网络请求失败',
          content: `无法连接到本地服务器。\n\n错误信息: ${err.errMsg}\n\n可能原因：\n1. 本地服务未启动\n2. 真机调试请使用局域网IP\n3. 开发者工具未勾选"不校验合法域名"`,
          showCancel: false
        });
      },
      complete: () => {
        this.setData({ isProcessing: false });
        wx.hideLoading();
      }
    });
  },

  persistDataUrlToFile: function (dataUrl) {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image')) return resolve('');
      const fs = wx.getFileSystemManager();
      const now = Date.now();
      const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
      let mime = m && m[1] ? m[1] : '';
      let b64 = m && m[2] ? m[2] : '';
      b64 = String(b64).replace(/\s+/g, '');
      while (b64.length % 4 !== 0) b64 += '=';
      if (b64.startsWith('/9j/')) mime = 'image/jpeg';
      if (b64.startsWith('iVBORw0KGgo')) mime = 'image/png';
      let ext = 'png';
      if (mime === 'image/jpeg') ext = 'jpg';
      if (mime === 'image/png') ext = 'png';
      const filePath = `${wx.env.USER_DATA_PATH}/processed_${now}.${ext}`;
      let arrayBuffer;
      try {
        arrayBuffer = wx.base64ToArrayBuffer(b64);
      } catch (e) {
        return resolve('');
      }
      fs.writeFile({
        filePath,
        data: arrayBuffer,
        success: () => resolve(filePath),
        fail: () => resolve('')
      });
    });
  },

  openCrop: async function () {
    if (!this.data.processedImagePath) return;
    if (!this.data.processedFilePath) {
      const p = await this.persistDataUrlToFile(this.data.processedImagePath);
      if (p) this.setData({ processedFilePath: p });
    }
    if (!this.data.processedFilePath) {
      wx.showToast({ title: '准备图片失败', icon: 'none' });
      return;
    }
    this.setData({
      cropMode: true,
      cropDisplaySrc: this.data.processedImagePath,
      cropRectActive: false,
      cropRectLeft: 0,
      cropRectTop: 0,
      cropRectWidth: 0,
      cropRectHeight: 0
    });
  },

  closeCrop: function () {
    this.setData({ cropMode: false });
  },

  onCropImageError: function () {
    if (this.data.cropDisplaySrc !== this.data.processedImagePath) {
      this.setData({ cropDisplaySrc: this.data.processedImagePath });
    }
  },

  onCropImageLoad: function () {
    const q = wx.createSelectorQuery().in(this);
    q.select('#cropWrap').boundingClientRect();
    q.select('#cropImage').boundingClientRect();
    q.exec((res) => {
      const wrap = res && res[0] ? res[0] : null;
      const img = res && res[1] ? res[1] : null;
      if (wrap) {
        this.setData({
          cropWrapLeft: wrap.left,
          cropWrapTop: wrap.top,
          cropWrapWidth: wrap.width,
          cropWrapHeight: wrap.height
        });
      }
      if (img) {
        this.setData({
          cropImageWidth: img.width,
          cropImageHeight: img.height
        });
      }

      if (img && this.data.cropMode && !this.data.cropRectActive) {
        const iw = img.width || 0;
        const ih = img.height || 0;
        if (iw > 0 && ih > 0) {
          const rectW = Math.max(120, Math.floor(iw * 0.7));
          const rectH = Math.max(120, Math.floor(ih * 0.5));
          const w = Math.min(rectW, Math.max(1, iw - 20));
          const h = Math.min(rectH, Math.max(1, ih - 20));
          const left = Math.max(0, Math.floor((iw - w) / 2));
          const top = Math.max(0, Math.floor((ih - h) / 2));
          this.setData({
            cropRectActive: true,
            cropRectLeft: left,
            cropRectTop: top,
            cropRectWidth: w,
            cropRectHeight: h
          });
        }
      }
    });
  },

  onCropTouchStart: function (e) {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const x = t.pageX - this.data.cropWrapLeft;
    const y = t.pageY - this.data.cropWrapTop;
    const nx = Math.max(0, Math.min(this.data.cropImageWidth, x));
    const ny = Math.max(0, Math.min(this.data.cropImageHeight, y));
    this.setData({
      cropStartX: nx,
      cropStartY: ny,
      cropRectActive: true,
      cropRectLeft: nx,
      cropRectTop: ny,
      cropRectWidth: 0,
      cropRectHeight: 0
    });
  },

  onCropTouchMove: function (e) {
    if (!this.data.cropRectActive) return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const x = t.pageX - this.data.cropWrapLeft;
    const y = t.pageY - this.data.cropWrapTop;
    const nx = Math.max(0, Math.min(this.data.cropImageWidth, x));
    const ny = Math.max(0, Math.min(this.data.cropImageHeight, y));
    const left = Math.min(this.data.cropStartX, nx);
    const top = Math.min(this.data.cropStartY, ny);
    const width = Math.abs(nx - this.data.cropStartX);
    const height = Math.abs(ny - this.data.cropStartY);
    this.setData({
      cropRectLeft: left,
      cropRectTop: top,
      cropRectWidth: width,
      cropRectHeight: height
    });
  },

  onCropTouchEnd: function () {
    if (!this.data.cropRectActive) return;
    const minSize = 30;
    let w = this.data.cropRectWidth;
    let h = this.data.cropRectHeight;
    if (w < minSize) w = minSize;
    if (h < minSize) h = minSize;
    const left = Math.max(0, Math.min(this.data.cropRectLeft, Math.max(0, this.data.cropImageWidth - w)));
    const top = Math.max(0, Math.min(this.data.cropRectTop, Math.max(0, this.data.cropImageHeight - h)));
    this.setData({
      cropRectLeft: left,
      cropRectTop: top,
      cropRectWidth: w,
      cropRectHeight: h
    });
  },

  onRectTouchStart: function (e) {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    this.setData({
      rectDragMode: 'move',
      rectHandle: '',
      rectTouchStartX: t.pageX,
      rectTouchStartY: t.pageY,
      rectBaseLeft: this.data.cropRectLeft,
      rectBaseTop: this.data.cropRectTop,
      rectBaseWidth: this.data.cropRectWidth,
      rectBaseHeight: this.data.cropRectHeight
    });
  },

  onRectTouchMove: function (e) {
    if (this.data.rectDragMode !== 'move') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const dx = t.pageX - this.data.rectTouchStartX;
    const dy = t.pageY - this.data.rectTouchStartY;
    const maxLeft = Math.max(0, this.data.cropImageWidth - this.data.rectBaseWidth);
    const maxTop = Math.max(0, this.data.cropImageHeight - this.data.rectBaseHeight);
    const left = Math.max(0, Math.min(maxLeft, this.data.rectBaseLeft + dx));
    const top = Math.max(0, Math.min(maxTop, this.data.rectBaseTop + dy));
    this.setData({ cropRectLeft: left, cropRectTop: top });
  },

  onRectTouchEnd: function () {
    if (this.data.rectDragMode === 'move') {
      this.setData({ rectDragMode: '', rectHandle: '' });
    }
  },

  onHandleTouchStart: function (e) {
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const handle = e.currentTarget.dataset.handle || '';
    this.setData({
      rectDragMode: 'resize',
      rectHandle: handle,
      rectTouchStartX: t.pageX,
      rectTouchStartY: t.pageY,
      rectBaseLeft: this.data.cropRectLeft,
      rectBaseTop: this.data.cropRectTop,
      rectBaseWidth: this.data.cropRectWidth,
      rectBaseHeight: this.data.cropRectHeight
    });
  },

  onHandleTouchMove: function (e) {
    if (this.data.rectDragMode !== 'resize') return;
    if (!e.touches || !e.touches.length) return;
    const t = e.touches[0];
    const dx = t.pageX - this.data.rectTouchStartX;
    const dy = t.pageY - this.data.rectTouchStartY;
    const minSize = 30;
    let left = this.data.rectBaseLeft;
    let top = this.data.rectBaseTop;
    let width = this.data.rectBaseWidth;
    let height = this.data.rectBaseHeight;
    const handle = this.data.rectHandle;

    if (handle === 'tl') {
      left = this.data.rectBaseLeft + dx;
      top = this.data.rectBaseTop + dy;
      width = this.data.rectBaseWidth - dx;
      height = this.data.rectBaseHeight - dy;
    } else if (handle === 'tr') {
      top = this.data.rectBaseTop + dy;
      width = this.data.rectBaseWidth + dx;
      height = this.data.rectBaseHeight - dy;
    } else if (handle === 'bl') {
      left = this.data.rectBaseLeft + dx;
      width = this.data.rectBaseWidth - dx;
      height = this.data.rectBaseHeight + dy;
    } else if (handle === 'br') {
      width = this.data.rectBaseWidth + dx;
      height = this.data.rectBaseHeight + dy;
    }

    if (width < minSize) {
      if (handle === 'tl' || handle === 'bl') {
        left = left + (width - minSize);
      }
      width = minSize;
    }
    if (height < minSize) {
      if (handle === 'tl' || handle === 'tr') {
        top = top + (height - minSize);
      }
      height = minSize;
    }

    if (left < 0) {
      width = width + left;
      left = 0;
    }
    if (top < 0) {
      height = height + top;
      top = 0;
    }

    const maxW = Math.max(minSize, this.data.cropImageWidth - left);
    const maxH = Math.max(minSize, this.data.cropImageHeight - top);
    width = Math.min(width, maxW);
    height = Math.min(height, maxH);

    this.setData({
      cropRectLeft: left,
      cropRectTop: top,
      cropRectWidth: width,
      cropRectHeight: height
    });
  },

  onHandleTouchEnd: function () {
    if (this.data.rectDragMode === 'resize') {
      this.setData({ rectDragMode: '', rectHandle: '' });
    }
  },

  cropOne: function (srcPath, outExt, imageW, imageH, sx, sy, sw, sh, maxSide) {
    const doPrimary = () => new Promise((resolve) => {
      const outW = Math.max(1, Math.round(Math.min(sw, maxSide)));
      const scale = outW / sw;
      const outH = Math.max(1, Math.round(sh * scale));
      this.setData({ canvasW: outW, canvasH: outH }, () => {
        const ctx = wx.createCanvasContext('cropCanvas', this);
        ctx.setFillStyle('#ffffff');
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(srcPath, sx, sy, sw, sh, 0, 0, outW, outH);
        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'cropCanvas',
            width: outW,
            height: outH,
            destWidth: outW,
            destHeight: outH,
            fileType: outExt === 'png' ? 'png' : 'jpg',
            quality: 1,
            success: (res) => resolve(res.tempFilePath),
            fail: () => resolve('')
          }, this);
        });
      });
    });
    const doFallback = () => new Promise((resolve) => {
      const ratio = Math.min(1, maxSide / sw, maxSide / sh);
      const outW = Math.max(1, Math.floor(sw * ratio));
      const outH = Math.max(1, Math.floor(sh * ratio));
      this.setData({ canvasW: outW, canvasH: outH }, () => {
        const ctx = wx.createCanvasContext('cropCanvas', this);
        ctx.setFillStyle('#ffffff');
        ctx.fillRect(0, 0, outW, outH);
        const dx = -Math.floor(sx * ratio);
        const dy = -Math.floor(sy * ratio);
        const dw = Math.floor(imageW * ratio);
        const dh = Math.floor(imageH * ratio);
        ctx.drawImage(srcPath, dx, dy, dw, dh);
        ctx.draw(false, () => {
          wx.canvasToTempFilePath({
            canvasId: 'cropCanvas',
            width: outW,
            height: outH,
            destWidth: outW,
            destHeight: outH,
            fileType: outExt === 'png' ? 'png' : 'jpg',
            quality: 1,
            success: (res) => resolve(res.tempFilePath),
            fail: () => resolve('')
          }, this);
        });
      });
    });
    return doPrimary().then((p) => {
      if (p) return p;
      return doFallback();
    }).catch(() => doFallback());
  },

  saveTempToUserFile: function (tempFilePath) {
    return new Promise((resolve) => {
      const fs = wx.getFileSystemManager();
      fs.saveFile({
        tempFilePath,
        success: (res) => resolve(res.savedFilePath),
        fail: () => resolve('')
      });
    });
  },

  getImageInfoP: function (src) {
    return new Promise((resolve) => {
      wx.getImageInfo({
        src,
        success: (res) => resolve(res),
        fail: () => resolve(null)
      });
    });
  },

  confirmCrop: async function () {
    const cleanedSrc = this.data.processedFilePath || '';
    const originalSrc = this.data.imagePath || '';
    if (!cleanedSrc || !originalSrc) return;
    if (!this.data.cropRectActive) return;
    const displayW = this.data.cropImageWidth;
    const displayH = this.data.cropImageHeight;
    if (!displayW || !displayH) return;

    const cleanedInfo = await this.getImageInfoP(cleanedSrc);
    if (!cleanedInfo) {
      wx.showToast({ title: '读取图片失败', icon: 'none' });
      return;
    }
    const cleanedDrawPath = cleanedInfo.path || cleanedSrc;

    let sxC = Math.max(0, Math.floor((this.data.cropRectLeft / displayW) * cleanedInfo.width));
    let syC = Math.max(0, Math.floor((this.data.cropRectTop / displayH) * cleanedInfo.height));
    let swC = Math.max(1, Math.floor((this.data.cropRectWidth / displayW) * cleanedInfo.width));
    let shC = Math.max(1, Math.floor((this.data.cropRectHeight / displayH) * cleanedInfo.height));
    sxC = Math.min(sxC, Math.max(0, cleanedInfo.width - 1));
    syC = Math.min(syC, Math.max(0, cleanedInfo.height - 1));
    swC = Math.min(swC, Math.max(1, cleanedInfo.width - sxC));
    shC = Math.min(shC, Math.max(1, cleanedInfo.height - syC));

    wx.showLoading({ title: '裁剪中...' });

    const cleanedExt = cleanedSrc.endsWith('.png') ? 'png' : 'jpg';

    const cleanedTemp = await this.cropOne(cleanedDrawPath, cleanedExt, cleanedInfo.width, cleanedInfo.height, sxC, syC, swC, shC, 2048);
    const cleanedSaved = cleanedTemp ? await this.saveTempToUserFile(cleanedTemp) : '';

    wx.hideLoading();

    if (!cleanedSaved) {
      wx.showToast({ title: '裁剪失败', icon: 'none' });
      return;
    }

    this.setData({
      croppedCleanedPath: cleanedSaved,
      processedImagePath: cleanedSaved,
      processedFilePath: cleanedSaved,
      cropMode: false,
      cropRectActive: false
    });
    wx.showToast({ title: '裁剪完成，点击保存', icon: 'none' });
    if (wx.pageScrollTo) {
      wx.pageScrollTo({ scrollTop: 100000, duration: 300 });
    }
  },

  // Picker 变更事件
  onSubjectChange: function(e) { this.setData({ subjectIndex: e.detail.value }); },
  onGradeChange: function(e) { this.setData({ gradeIndex: e.detail.value }); },
  onSemesterChange: function(e) { this.setData({ semesterIndex: e.detail.value }); },

  onInputNote: function (e) {
    this.setData({ note: e.detail.value });
  },

  saveRecord: function () {
    const originalSrc = this.data.imagePath;
    if (!originalSrc) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中...' });

    const hasCleaned = !!this.data.processedImagePath;
    const hasManualCrop = !!this.data.croppedCleanedPath;

    const fs = wx.getFileSystemManager();

    fs.saveFile({
      tempFilePath: originalSrc,
      success: async (res) => {
        const originalSaved = res.savedFilePath;
        if (!hasCleaned) {
          this.saveRecordToStorage({
            imagePath: originalSaved,
            originalImagePath: originalSaved,
            cleanedImagePath: ''
          });
          return;
        }

        let cleanedSaved = hasManualCrop ? this.data.croppedCleanedPath : this.data.processedFilePath;
        if (!cleanedSaved && !hasManualCrop) cleanedSaved = await this.persistDataUrlToFile(this.data.processedImagePath);
        if (!cleanedSaved) {
          wx.hideLoading();
          wx.showToast({ title: '保存失败', icon: 'none' });
          return;
        }

        this.saveRecordToStorage({
          imagePath: cleanedSaved,
          originalImagePath: originalSaved,
          cleanedImagePath: cleanedSaved
        });
      },
      fail: (err) => {
        console.error(err);
        wx.hideLoading();
        wx.showToast({ title: '保存文件失败', icon: 'none' });
      }
    });
  },

  saveRecordToStorage: function(payload) {
    const imagePath = payload && payload.imagePath ? payload.imagePath : '';
    const originalImagePath = payload && payload.originalImagePath ? payload.originalImagePath : '';
    const cleanedImagePath = payload && payload.cleanedImagePath ? payload.cleanedImagePath : '';
    const newRecord = {
      id: Date.now(),
      imagePath,
      originalImagePath,
      cleanedImagePath,
      note: this.data.note,
      date: new Date().toLocaleString(),
      subject: this.data.subjects[this.data.subjectIndex],
      grade: this.data.grades[this.data.gradeIndex],
      semester: this.data.semesters[this.data.semesterIndex]
    };

    const records = wx.getStorageSync('exam_records') || [];
    records.unshift(newRecord);
    wx.setStorageSync('exam_records', records);

    wx.hideLoading();
    wx.showToast({ title: '保存成功' });

    setTimeout(() => wx.navigateBack(), 1500);
  }
})
