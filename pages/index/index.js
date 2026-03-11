// pages/index/index.js
const app = getApp();

Page({
  data: {
    allRecords: [], // 所有原始数据
    groupedRecords: [], // 分组后的数据（二维数组）
    paperRecords: [],
    paperCanvasW: 1,
    paperCanvasH: 1,
    filteredPaperRecords: [],
    
    // 筛选条件
    subjects: ['全部', '语文', '数学', '英语', '物理', '化学', '生物', '历史', '地理', '政治'],
    grades: ['全部', '一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '初一', '初二', '初三', '高一', '高二', '高三'],
    semesters: ['全部', '上册', '下册'],
    
    subjectIndex: 0,
    gradeIndex: 0,
    semesterIndex: 0,
    
    // 展开状态：记录哪些分组是展开的，key为 groupIndex，value为 boolean
    expandedGroups: {},

    paperSelectGroupIndex: -1,
    paperSelectedMap: {},
    paperSelectedCount: 0,
    isGeneratingPaper: false
  },

  onShow: function () {
    this.loadRecords();
  },

  loadRecords: function () {
    const records = wx.getStorageSync('exam_records') || [];
    // 按时间倒序
    records.sort((a, b) => b.id - a.id);

    const paperRecords = records.filter(r => r && r.type === 'paper');
    const questionRecords = records.filter(r => !r || r.type !== 'paper');

    this.setData({ allRecords: questionRecords, paperRecords });
    this.applyFilterAndGroup();
  },

  // 筛选器变更
  onSubjectChange: function(e) { 
    this.setData({ subjectIndex: e.detail.value }, () => this.applyFilterAndGroup()); 
  },
  onGradeChange: function(e) { 
    this.setData({ gradeIndex: e.detail.value }, () => this.applyFilterAndGroup()); 
  },
  onSemesterChange: function(e) { 
    this.setData({ semesterIndex: e.detail.value }, () => this.applyFilterAndGroup()); 
  },

  // 核心逻辑：筛选 + 分组
  applyFilterAndGroup: function() {
    let list = this.data.allRecords;
    const { subjects, grades, semesters, subjectIndex, gradeIndex, semesterIndex } = this.data;

    const selectedSubject = subjects[subjectIndex];
    const selectedGrade = grades[gradeIndex];
    const selectedSemester = semesters[semesterIndex];

    // 1. 筛选
    if (selectedSubject !== '全部') {
      list = list.filter(item => item.subject === selectedSubject);
    }
    if (selectedGrade !== '全部') {
      list = list.filter(item => item.grade === selectedGrade);
    }
    if (selectedSemester !== '全部') {
      list = list.filter(item => item.semester === selectedSemester);
    }

    // 2. 分组（每10个一组）
    const groups = [];
    const chunkSize = 10;
    for (let i = 0; i < list.length; i += chunkSize) {
      groups.push({
        id: i / chunkSize,
        name: `错题集 ${Math.floor(i / chunkSize) + 1}`,
        range: `${i + 1} - ${Math.min(i + chunkSize, list.length)}`,
        items: list.slice(i, i + chunkSize)
      });
    }

    // 默认展开第一个分组
    const expandedGroups = {};
    if (groups.length > 0) {
      expandedGroups[0] = true;
    }

    this.setData({
      groupedRecords: groups,
      expandedGroups: expandedGroups
    });

    this.setData({
      filteredPaperRecords: this.getFilteredPaperRecords()
    });
  },

  getFilteredPaperRecords: function () {
    let list = this.data.paperRecords || [];
    const { subjects, grades, semesters, subjectIndex, gradeIndex, semesterIndex } = this.data;
    const selectedSubject = subjects[subjectIndex];
    const selectedGrade = grades[gradeIndex];
    const selectedSemester = semesters[semesterIndex];

    if (selectedSubject !== '全部') list = list.filter(item => item.subject === selectedSubject);
    if (selectedGrade !== '全部') list = list.filter(item => item.grade === selectedGrade);
    if (selectedSemester !== '全部') list = list.filter(item => item.semester === selectedSemester);

    return list;
  },

  // 切换分组展开/收起
  toggleGroup: function(e) {
    const index = e.currentTarget.dataset.index;
    const expandedGroups = this.data.expandedGroups;
    expandedGroups[index] = !expandedGroups[index];
    this.setData({ expandedGroups });
  },

  onPaperBtn: function (e) {
    const groupIndex = Number(e.currentTarget.dataset.index);
    const group = this.data.groupedRecords[groupIndex];
    if (!group || !group.items || !group.items.length) return;

    if (this.data.isGeneratingPaper) return;

    if (this.data.paperSelectGroupIndex !== groupIndex) {
      const selectedMap = {};
      group.items.forEach((r) => { selectedMap[r.id] = true; });
      this.setData({
        paperSelectGroupIndex: groupIndex,
        paperSelectedMap: selectedMap,
        paperSelectedCount: group.items.length
      });
      return;
    }

    this.generatePaperForSelected(groupIndex);
  },

  togglePaperItem: function (e) {
    const id = e.currentTarget.dataset.id;
    const groupIndex = Number(e.currentTarget.dataset.groupIndex);
    if (this.data.paperSelectGroupIndex !== groupIndex) return;
    const map = Object.assign({}, this.data.paperSelectedMap || {});
    map[id] = !map[id];
    const count = Object.keys(map).reduce((acc, k) => acc + (map[k] ? 1 : 0), 0);
    this.setData({ paperSelectedMap: map, paperSelectedCount: count });
  },

  cancelPaperSelect: function () {
    this.setData({
      paperSelectGroupIndex: -1,
      paperSelectedMap: {},
      paperSelectedCount: 0
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

  canvasToTempFilePathP: function () {
    return new Promise((resolve) => {
      wx.canvasToTempFilePath({
        canvasId: 'paperCanvas',
        fileType: 'jpg',
        quality: 1,
        success: (res) => resolve(res.tempFilePath),
        fail: () => resolve('')
      }, this);
    });
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

  renderPaperPage: async function (drawList, pageW, pageH, margin) {
    this.setData({ paperCanvasW: pageW, paperCanvasH: pageH });
    const ctx = wx.createCanvasContext('paperCanvas', this);
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, pageW, pageH);

    drawList.forEach((d) => {
      ctx.drawImage(d.path, d.x, d.y, d.w, d.h);
    });

    await new Promise((resolve) => ctx.draw(false, resolve));

    const temp = await this.canvasToTempFilePathP();
    if (!temp) return '';
    const saved = await this.saveTempToUserFile(temp);
    return saved;
  },

  generatePaperForSelected: async function (groupIndex) {
    const group = this.data.groupedRecords[groupIndex];
    if (!group || !group.items || !group.items.length) return;

    const selected = group.items.filter(r => this.data.paperSelectedMap && this.data.paperSelectedMap[r.id]);
    if (!selected.length) {
      wx.showToast({ title: '请选择至少1题', icon: 'none' });
      return;
    }

    this.setData({ isGeneratingPaper: true });
    wx.showLoading({ title: '生成中...', mask: true });

    const pageW = 1240;
    const pageH = 1754;
    const margin = 40;
    const gap = 20;
    const maxW = pageW - margin * 2;

    const pages = [];
    let current = [];
    let y = margin;

    for (let i = 0; i < selected.length; i++) {
      const r = selected[i];
      const imgPath = r.cleanedImagePath || r.imagePath;
      const info = await this.getImageInfoP(imgPath);
      if (!info) continue;

      let scale = maxW / info.width;
      let drawW = maxW;
      let drawH = Math.floor(info.height * scale);

      const maxH = pageH - margin * 2;
      if (drawH > maxH) {
        scale = maxH / info.height;
        drawH = maxH;
        drawW = Math.floor(info.width * scale);
      }

      if (y + drawH > pageH - margin && current.length) {
        pages.push(current);
        current = [];
        y = margin;
      }

      const x = Math.floor((pageW - drawW) / 2);
      current.push({ path: imgPath, x, y, w: drawW, h: drawH });
      y += drawH + gap;
    }

    if (current.length) pages.push(current);

    const savedPages = [];
    for (let p = 0; p < pages.length; p++) {
      const saved = await this.renderPaperPage(pages[p], pageW, pageH, margin);
      if (saved) savedPages.push(saved);
    }

    wx.hideLoading();
    this.setData({ isGeneratingPaper: false });

    if (!savedPages.length) {
      wx.showToast({ title: '生成失败', icon: 'none' });
      return;
    }

    const all = wx.getStorageSync('exam_records') || [];
    const nextIndex = all.filter(r => r && r.type === 'paper').length + 1;
    const metaFrom = selected[0] || {};
    const paperRecord = {
      id: Date.now(),
      type: 'paper',
      paperImagePaths: savedPages,
      imagePath: savedPages[0],
      note: `错题卷 ${nextIndex}`,
      date: new Date().toLocaleString(),
      subject: metaFrom.subject || '未知',
      grade: metaFrom.grade || '未知',
      semester: metaFrom.semester || '上册'
    };

    all.unshift(paperRecord);
    wx.setStorageSync('exam_records', all);

    this.cancelPaperSelect();
    this.loadRecords();

    wx.showToast({ title: '已生成错题卷', icon: 'success' });
  },

  goToAdd: function () {
    wx.navigateTo({ url: '/pages/add/add' });
  },

  goToDetail: function (e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
})
