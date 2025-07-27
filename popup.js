// 存储可用标签和选中标签
let availableTags = [];
let selectedTags = [];
let currentDateMode = null; // 记录当前选择的时间模式
let selectedStartDate = null;
let selectedEndDate = null;
let flatpickrInstance = null; // Flatpickr 实例

// DOM元素引用
const elements = {
  tagSelect: document.getElementById('tagSelect'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  dateRangePicker: document.getElementById('dateRangePicker'),
  selectedTagsInfo: document.getElementById('selectedTagsInfo'),
  selectedTagsList: document.getElementById('selectedTagsList'),
  clearTags: document.getElementById('clearTags'),
  fetchNotes: document.getElementById('fetchNotes'),
  resetFilters: document.getElementById('resetFilters'),
  exportNotes: document.getElementById('exportNotes'),
  filterStatus: document.getElementById('filterStatus'),
  quickDateBtns: document.querySelectorAll('.quick-date-btn')
};

// 初始化 Flatpickr 日期选择器
function initializeDatePicker() {
  console.log('初始化Flatpickr...');
  
  if (!elements.dateRangePicker) {
    console.error('找不到dateRangePicker元素');
    return;
  }
  
  if (typeof flatpickr === 'undefined') {
    console.error('Flatpickr库未加载');
    return;
  }
  
  // 初始化 Flatpickr
  flatpickrInstance = flatpickr(elements.dateRangePicker, {
    mode: "range",
    dateFormat: "Y-m-d",
    locale: "zh", // 中文
    allowInput: false,
    clickOpens: true,
    position: "auto", // 改为auto，让Flatpickr自动选择最佳位置
    animate: true,
    monthSelectorType: "dropdown",
    showMonths: 2, // 显示两个月份
    static: false,
    appendTo: document.body, // 添加到body，避免容器限制
    onChange: function(selectedDates, dateStr, instance) {
      updateHiddenInputs(selectedDates);
    },
    onOpen: function(selectedDates, dateStr, instance) {
      // 弹出时强制设置高z-index和位置
      setTimeout(() => {
        const calendar = document.querySelector('.flatpickr-calendar');
        if (calendar) {
          calendar.style.zIndex = '999999';
          calendar.style.position = 'fixed';
          // 确保日历显示在插件窗口之上
          calendar.style.top = '50%';
          calendar.style.left = '50%';
          calendar.style.transform = 'translate(-50%, -50%)';
        }
      }, 10);
    },
    onClose: function(selectedDates, dateStr, instance) {
      // 关闭时的处理
    },
    onReady: function(selectedDates, dateStr, instance) {
      console.log('Flatpickr初始化完成');
    }
  });
  
  console.log('Flatpickr实例:', flatpickrInstance);

  // 便捷选择按钮事件
  elements.quickDateBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const period = e.target.dataset.period;
      selectQuickDate(period);
    });
  });
}

// 更新隐藏的日期输入框
function updateHiddenInputs(selectedDates) {
  if (selectedDates.length >= 1) {
    selectedStartDate = selectedDates[0];
    elements.startDate.value = formatDate(selectedStartDate);
  } else {
    selectedStartDate = null;
    elements.startDate.value = '';
  }
  
  if (selectedDates.length >= 2) {
    selectedEndDate = selectedDates[1];
    elements.endDate.value = formatDate(selectedEndDate);
  } else {
    selectedEndDate = null;
    elements.endDate.value = '';
  }
}

// 格式化日期
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 快捷日期选择
function selectQuickDate(period) {
  const today = new Date();
  let startDate, endDate;
  
  // 清除之前的 active 状态
  elements.quickDateBtns.forEach(btn => btn.classList.remove('active'));
  
  switch (period) {
    case 'week':
      startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = today;
      currentDateMode = 'week';
      break;
    case 'month':
      startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = today;
      currentDateMode = 'month';
      break;
    case '3months':
      startDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = today;
      currentDateMode = '3months';
      break;
    case 'clear':
      flatpickrInstance.clear();
      currentDateMode = null;
      selectedStartDate = null;
      selectedEndDate = null;
      elements.startDate.value = '';
      elements.endDate.value = '';
      return;
    default:
      return;
  }
  
  // 设置 Flatpickr 的日期
  flatpickrInstance.setDate([startDate, endDate]);
  
  // 设置对应按钮为 active
  document.querySelector(`[data-period="${period}"]`).classList.add('active');
}

// 获取当前有效的时间范围
function getEffectiveDateRange() {
  if (selectedStartDate && selectedEndDate) {
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    return {
      startDate: formatDate(selectedStartDate),
      endDate: formatDate(selectedEndDate)
    };
  } else {
    return {
      startDate: '',
      endDate: ''
    };
  }
}

// 自动获取标签函数
function autoFetchTags() {
  console.log('自动获取标签');
  showFilterStatus('正在获取标签...');
  
  chrome.runtime.sendMessage({action: "autoFetchTags"}, (response) => {
    console.log('自动获取标签响应:', response);
    if (response && response.message) {
      showFilterStatus(response.message);
    } else {
      showFilterStatus('获取标签失败，请重试');
    }
  });
}

// 显示筛选区域状态消息
function showFilterStatus(message) {
  elements.filterStatus.textContent = message;
  elements.filterStatus.style.display = 'block';
  // 不再自动隐藏，保持显示直到下次更新
}

// 显示标签列表
function displayTags(tags) {
  availableTags = tags;
  
  // 清空现有选项，保留默认选项
  elements.tagSelect.innerHTML = '<option value="">选择标签...</option>';
  
  // 添加无标签选项
  const noTagOption = document.createElement('option');
  noTagOption.value = '__NO_TAG__';
  noTagOption.textContent = '无标签';
  elements.tagSelect.appendChild(noTagOption);
  
  if (tags.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.textContent = '暂无标签';
    elements.tagSelect.appendChild(option);
  } else {
    tags.forEach(tag => {
      const option = document.createElement('option');
      option.value = tag;
      option.textContent = tag;
      elements.tagSelect.appendChild(option);
    });
  }
}

// 标签选择改变事件
elements.tagSelect.addEventListener('change', (e) => {
  const selectedTag = e.target.value;
  
  if (selectedTag && !selectedTags.includes(selectedTag)) {
    selectedTags.push(selectedTag);
    updateSelectedTagsDisplay();
    // 重置选择框
    elements.tagSelect.value = '';
  }
});

// 更新选中标签显示
function updateSelectedTagsDisplay() {
  if (selectedTags.length === 0) {
    elements.selectedTagsInfo.style.display = 'none';
  } else {
    elements.selectedTagsInfo.style.display = 'block';
    elements.selectedTagsList.innerHTML = '';
    
    selectedTags.forEach(tag => {
      const tagChip = document.createElement('span');
      tagChip.className = 'tag-chip';
      tagChip.setAttribute('data-tag', tag);
      // 如果是无标签选项，显示特殊文本
      tagChip.textContent = tag === '__NO_TAG__' ? '无标签' : tag;
      tagChip.title = '点击删除';
      
      // 添加删除功能
      tagChip.addEventListener('click', () => {
        selectedTags = selectedTags.filter(t => t !== tag);
        updateSelectedTagsDisplay();
      });
      
      elements.selectedTagsList.appendChild(tagChip);
    });
  }
}

// 清空标签选择
elements.clearTags.addEventListener('click', () => {
  selectedTags = [];
  updateSelectedTagsDisplay();
});

// 重置筛选
elements.resetFilters.addEventListener('click', () => {
  selectedTags = [];
  updateSelectedTagsDisplay();
  
  // 重置日期相关状态
  currentDateMode = null;
  selectedStartDate = null;
  selectedEndDate = null;
  flatpickrInstance.clear(); // 清除 Flatpickr 的日期
  elements.startDate.value = '';
  elements.endDate.value = '';
  
  // 移除所有快捷按钮的active状态
  elements.quickDateBtns.forEach(btn => btn.classList.remove('active'));
  
  // 禁用导出按钮
  elements.exportNotes.disabled = true;
  showFilterStatus('已重置所有筛选条件');
});

// 获取笔记
elements.fetchNotes.addEventListener('click', () => {
  // 获取有效的时间范围
  const dateRange = getEffectiveDateRange();
  
  const filterConditions = {
    tags: selectedTags,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  };
  
  console.log('搜索条件:', filterConditions);
  showFilterStatus('正在获取内容中……需要一些时间，请不要关闭插件，内容越多，等待时间也会延长，可以趁机活动身体、喝杯水，休息一下 ^_^');
  
  // 禁用导出按钮，等待搜索完成
  elements.exportNotes.disabled = true;
  
  chrome.runtime.sendMessage({
    action: "fetchNotes",
    filterConditions: filterConditions
  }, (response) => {
    console.log('搜索启动响应:', response);
    // 不在这里处理搜索结果，搜索结果通过notesSaved消息处理
  });
});

// 导出笔记
elements.exportNotes.addEventListener('click', () => {
  const dateRange = getEffectiveDateRange();
  
  const filterConditions = {
    tags: selectedTags,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate
  };
  
  console.log('导出条件:', filterConditions);
  showFilterStatus('正在导出笔记...');
  
  chrome.runtime.sendMessage({
    action: "exportNotes",
    filterConditions: filterConditions
  }, (response) => {
    console.log('导出响应:', response);
    if (response && response.success) {
      showFilterStatus('导出成功！');
    } else {
      showFilterStatus(response?.message || '导出失败，请重试');
    }
  });
});

// 验证日期
function validateDates() {
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;
  
  if (startDate && endDate && startDate > endDate) {
    showFilterStatus('开始日期不能晚于结束日期');
    return false;
  }
  
  return true;
}

// 初始化日期
function initializeDates() {
  // 不再设置默认日期，让用户手动选择
  // updateDateDisplay(); // 移除旧的日期显示更新
}

// 格式化统计消息
function formatStatsMessage(request) {
  const { totalNotes, filteredNotes, tags } = request;
  let message = `找到 ${filteredNotes} 条笔记`;
  
  if (tags && tags.length > 0) {
    const tagLabels = tags.map(tag => tag === '__NO_TAG__' ? '无标签' : tag);
    message += ` (标签: ${tagLabels.join(', ')})`;
    }
  
  if (totalNotes !== filteredNotes) {
    message += `，共 ${totalNotes} 条`;
  }
  
  return message;
}

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === "displayTags") {
    if (request.success) {
      displayTags(request.tags);
      showFilterStatus(`成功获取 ${request.tags.length} 个标签`);
    } else {
      showFilterStatus(`获取标签失败: ${request.error || '未知错误'}`);
    }
  } else if (request.action === "searchProgress") {
    // 新增：处理搜索进度消息
    showFilterStatus(request.message);
  } else if (request.action === "notesSaved") {
    // 处理笔记保存完成的消息
    if (request.success) {
      const message = formatStatsMessage(request);
      showFilterStatus(message);
      
      // 启用导出按钮
      elements.exportNotes.disabled = false;
    } else {
      showFilterStatus('搜索失败，请重试');
      elements.exportNotes.disabled = true;
    }
  } else if (request.action === "exportCompleted") {
    if (request.success) {
      showFilterStatus(`导出成功！文件已保存为: ${request.filename}`);
    } else {
      showFilterStatus(`导出失败: ${request.error || '未知错误'}`);
    }
  }
});

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
  console.log('页面加载完成，开始初始化...');
  
  // 初始化日期选择器
  initializeDatePicker();
  
  // 初始化日期
  initializeDates();
  
  // 自动获取标签
  autoFetchTags();
  
  // 禁用导出按钮（初始状态）
  elements.exportNotes.disabled = true;
  
  console.log('初始化完成');
});