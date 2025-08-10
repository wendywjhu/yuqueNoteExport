// 存储可用标签和选中标签
let availableTags = [];
let selectedTags = [];
let currentDateMode = null; // 记录当前选择的时间模式
let selectedStartDate = null;
let selectedEndDate = null;

// DOM元素引用
const elements = {
  tagSelectButton: document.getElementById('tagSelectButton'),
  tagSelectText: document.getElementById('tagSelectText'),
  tagDropdown: document.getElementById('tagDropdown'),
  tagOptionsList: document.getElementById('tagOptionsList'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  startDateInput: document.getElementById('startDateInput'),
  endDateInput: document.getElementById('endDateInput'),
  quickDateSelect: document.getElementById('quickDateSelect'),
  selectAllTags: document.getElementById('selectAllTags'),
  clearTags: document.getElementById('clearTags'),
  fetchNotes: document.getElementById('fetchNotes'),
  resetFilters: document.getElementById('resetFilters'),
  exportNotes: document.getElementById('exportNotes'),
  filterStatus: document.getElementById('filterStatus')
};

// 初始化日期输入框
function initializeDateInputs() {
  console.log('初始化日期输入框...');
  
  if (!elements.startDateInput || !elements.endDateInput) {
    console.error('找不到日期输入框元素');
    return;
  }
  
  // 不设置默认日期，让用户主动选择
  elements.startDateInput.value = '';
  elements.endDateInput.value = '';
  
  // 清空隐藏的输入框
  elements.startDate.value = '';
  elements.endDate.value = '';
  
  // 初始化全局变量
  selectedStartDate = null;
  selectedEndDate = null;
  
  // 添加输入事件监听器
  elements.startDateInput.addEventListener('change', handleDateInputChange);
  elements.startDateInput.addEventListener('blur', handleDateInputChange);
  elements.endDateInput.addEventListener('change', handleDateInputChange);
  elements.endDateInput.addEventListener('blur', handleDateInputChange);
  
  // 添加快捷日期选择事件监听器
  elements.quickDateSelect.addEventListener('change', (e) => {
    const period = e.target.value;
    if (period) {
      selectQuickDate(period);
      // 不重置下拉框，保持显示选中的选项
    }
  });
  
  console.log('日期输入框初始化完成');
}

// 处理日期输入框变化
function handleDateInputChange(event) {
  console.log('日期输入框变化');
  
  const input = event.target;
  const startDateStr = elements.startDateInput.value;
  const endDateStr = elements.endDateInput.value;
  
  // 清除之前的错误状态
  elements.startDateInput.classList.remove('error');
  elements.endDateInput.classList.remove('error');
  
  // 验证当前输入的日期
  if (input.value && !isValidDateInput(input.value)) {
    input.classList.add('error');
    showFilterStatus('请输入合理日期');
    return;
  }
  
  // 验证日期范围
  if (startDateStr && endDateStr && startDateStr > endDateStr) {
    elements.endDateInput.classList.add('error');
    showFilterStatus('开始日期不能晚于结束日期');
    return;
  }
  
  // 清除状态提示（如果日期有效）
  if ((startDateStr && isValidDateInput(startDateStr)) || (endDateStr && isValidDateInput(endDateStr))) {
    // 可以在这里清除状态，但不强制清空
  }
  
  // 更新隐藏的输入框 - 转换为使用短横线格式
  elements.startDate.value = startDateStr ? convertToHyphenFormat(startDateStr) : '';
  elements.endDate.value = endDateStr ? convertToHyphenFormat(endDateStr) : '';
  
  // 更新全局变量
  selectedStartDate = startDateStr ? new Date(startDateStr) : null;
  selectedEndDate = endDateStr ? new Date(endDateStr) : null;
  
  // 重置快捷选择状态  
  elements.quickDateSelect.value = '';
  currentDateMode = null;
  
  console.log('日期更新完成:', { selectedStartDate, selectedEndDate });
}

// 验证日期输入是否合理
function isValidDateInput(dateString) {
  if (!dateString) return true; // 空值是有效的
  
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  
  const date = new Date(dateString);
  const isValidDate = date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
  
  // 检查日期是否在合理范围内（1900年到2100年）
  if (isValidDate) {
    const year = date.getFullYear();
    return year >= 1900 && year <= 2100;
  }
  
  return false;
}

// 转换日期格式为短横线格式（用于显示）
function convertToHyphenFormat(dateString) {
  return dateString; // HTML5 date input已经是YYYY-MM-DD格式
}

// 兼容性：保留原有的验证函数
function isValidDate(dateString) {
  return isValidDateInput(dateString);
}

// 格式化日期
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// 快捷日期选择
function selectQuickDate(period) {
  console.log('快捷日期选择被调用，period:', period);
  const today = new Date();
  let startDate, endDate;
  
  // 清除快捷选择状态 (不再需要按钮状态管理)
  
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
      console.log('选择全部时间');
      currentDateMode = null;
      selectedStartDate = null;
      selectedEndDate = null;
      elements.startDateInput.value = '';
      elements.endDateInput.value = '';
      elements.startDate.value = '';
      elements.endDate.value = '';
      return;
    default:
      return;
  }
  
  console.log('计算出的日期范围:', {startDate, endDate});
  
  // 更新输入框
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);
  
  elements.startDateInput.value = startDateStr;
  elements.endDateInput.value = endDateStr;
  
  // 更新隐藏的输入框 - 使用短横线格式
  elements.startDate.value = convertToHyphenFormat(startDateStr);
  elements.endDate.value = convertToHyphenFormat(endDateStr);
  
  // 更新全局变量
  selectedStartDate = startDate;
  selectedEndDate = endDate;
  
  // 快捷选择完成 (下拉框会自动重置)
  
  console.log('快捷日期设置完成');
  console.log('selectedStartDate:', selectedStartDate);
  console.log('selectedEndDate:', selectedEndDate);
}

// 获取当前有效的时间范围
function getEffectiveDateRange() {
  console.log('getEffectiveDateRange 被调用');
  console.log('selectedStartDate:', selectedStartDate);
  console.log('selectedEndDate:', selectedEndDate);
  console.log('elements.startDate.value:', elements.startDate.value);
  console.log('elements.endDate.value:', elements.endDate.value);
  
  if (selectedStartDate && selectedEndDate) {
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };
    
    const result = {
      startDate: formatDate(selectedStartDate),
      endDate: formatDate(selectedEndDate)
    };
    
    console.log('返回日期范围:', result);
    return result;
  } else {
    console.log('没有选择日期，返回空值');
    return {
      startDate: '',
      endDate: ''
    };
  }
}

// 自动获取标签函数
function autoFetchTags() {
  console.log('自动获取标签');
  // 移除页面显示，只在控制台记录
  
  chrome.runtime.sendMessage({action: "autoFetchTags"}, (response) => {
    console.log('自动获取标签响应:', response);
    if (response && response.message) {
      // 移除页面显示，只在控制台记录
      console.log('标签获取消息:', response.message);
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
  renderTagOptions();
  updateTagSelectText();
}

// 渲染标签选项
function renderTagOptions() {
  elements.tagOptionsList.innerHTML = '';
  
  // 添加无标签选项
  const noTagItem = createTagOptionItem('__NO_TAG__', '无标签');
  elements.tagOptionsList.appendChild(noTagItem);
  
  if (availableTags.length === 0) {
    const emptyItem = document.createElement('div');
    emptyItem.className = 'tag-option-item';
    emptyItem.style.color = '#999';
    emptyItem.textContent = '暂无标签';
    elements.tagOptionsList.appendChild(emptyItem);
  } else {
    availableTags.forEach(tag => {
      const tagItem = createTagOptionItem(tag, tag);
      elements.tagOptionsList.appendChild(tagItem);
    });
  }
}

// 创建标签选项元素
function createTagOptionItem(value, text) {
  const item = document.createElement('div');
  item.className = 'tag-option-item';
  item.dataset.value = value;
  
  const checkbox = document.createElement('div');
  checkbox.className = 'tag-option-checkbox';
  
  const label = document.createElement('span');
  label.textContent = text;
  
  item.appendChild(checkbox);
  item.appendChild(label);
  
  // 点击选中/取消选中
  item.addEventListener('click', () => {
    toggleTagSelection(value);
  });
  
  return item;
}

// 切换标签选中状态
function toggleTagSelection(tagValue) {
  if (selectedTags.includes(tagValue)) {
    selectedTags = selectedTags.filter(tag => tag !== tagValue);
  } else {
    selectedTags.push(tagValue);
  }
  updateTagOptionDisplay();
  updateTagSelectText();
}

// 更新标签选项显示状态
function updateTagOptionDisplay() {
  const items = elements.tagOptionsList.querySelectorAll('.tag-option-item');
  items.forEach(item => {
    const value = item.dataset.value;
    const checkbox = item.querySelector('.tag-option-checkbox');
    const isSelected = selectedTags.includes(value);
    
    if (isSelected) {
      item.classList.add('selected');
      checkbox.classList.add('checked');
    } else {
      item.classList.remove('selected');
      checkbox.classList.remove('checked');
    }
  });
}

// 更新标签选择按钮的显示文本
function updateTagSelectText() {
  if (selectedTags.length === 0) {
    elements.tagSelectText.textContent = '选择标签...';
  } else if (selectedTags.length === 1) {
    const tagName = selectedTags[0] === '__NO_TAG__' ? '无标签' : selectedTags[0];
    elements.tagSelectText.textContent = tagName;
  } else {
    elements.tagSelectText.textContent = `已选择 ${selectedTags.length} 个标签`;
  }
}

// 更新全选按钮的显示状态
function updateSelectAllButtonDisplay() {
  if (availableTags.length === 0) {
    elements.selectAllTags.style.display = 'none';
    return;
  }
  
  // 计算所有可选择的标签（包括"无标签"选项）
  const allSelectableTags = ['__NO_TAG__', ...availableTags];
  const allSelected = allSelectableTags.every(tag => selectedTags.includes(tag));
  
  if (allSelected) {
    elements.selectAllTags.textContent = '取消全选';
    elements.selectAllTags.style.display = 'inline-block';
  } else if (selectedTags.length > 0) {
    elements.selectAllTags.textContent = '全选';
    elements.selectAllTags.style.display = 'inline-block';
  } else {
    elements.selectAllTags.textContent = '全选';
    elements.selectAllTags.style.display = availableTags.length > 0 ? 'inline-block' : 'none';
  }
}

// 标签选择按钮点击事件
elements.tagSelectButton.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleDropdown();
});

// 切换下拉菜单显示/隐藏
function toggleDropdown() {
  const isOpen = elements.tagDropdown.style.display !== 'none';
  if (isOpen) {
    closeDropdown();
  } else {
    openDropdown();
  }
}

// 打开下拉菜单
function openDropdown() {
  elements.tagDropdown.style.display = 'block';
  elements.tagSelectButton.classList.add('open');
  updateTagOptionDisplay();
}

// 关闭下拉菜单
function closeDropdown() {
  elements.tagDropdown.style.display = 'none';
  elements.tagSelectButton.classList.remove('open');
}

// 点击页面其他地方关闭下拉菜单
document.addEventListener('click', (e) => {
  if (!elements.tagSelectButton.contains(e.target) && !elements.tagDropdown.contains(e.target)) {
    closeDropdown();
  }
});

// 全选标签
elements.selectAllTags.addEventListener('click', (e) => {
  e.stopPropagation();
  // 计算所有可选择的标签（包括"无标签"选项）
  const allSelectableTags = ['__NO_TAG__', ...availableTags];
  const allSelected = allSelectableTags.every(tag => selectedTags.includes(tag));
  
  if (allSelected) {
    // 如果已全选，则取消全选
    selectedTags = [];
  } else {
    // 否则选择所有标签
    selectedTags = [...allSelectableTags];
  }
  
  updateTagOptionDisplay();
  updateTagSelectText();
});

// 清空标签选择
elements.clearTags.addEventListener('click', (e) => {
  e.stopPropagation();
  selectedTags = [];
  updateTagOptionDisplay();
  updateTagSelectText();
});

// 重置筛选
elements.resetFilters.addEventListener('click', () => {
  selectedTags = [];
  updateTagOptionDisplay();
  updateTagSelectText();
  closeDropdown();
  
  // 重置日期相关状态
  currentDateMode = null;
  selectedStartDate = null;
  selectedEndDate = null;
  elements.startDateInput.value = '';
  elements.endDateInput.value = '';
  elements.startDate.value = '';
  elements.endDate.value = '';
  
  // 重置快捷日期选择下拉框
  elements.quickDateSelect.value = '';
  
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
  
  // 获取导出格式选项
  const exportOptions = {
    includeTitle: document.getElementById('exportTitle').checked,
    includeTime: document.getElementById('exportTime').checked,
    includeTags: document.getElementById('exportTags').checked
  };
  
  const filterConditions = {
    tags: selectedTags,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    exportOptions: exportOptions
  };
  
  console.log('导出条件:', filterConditions);
  console.log('导出格式选项:', exportOptions);
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
    message += `，合计搜索了 ${totalNotes} 条笔记`;
  }
  
  return message;
}

// 监听来自background.js的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('收到消息:', request);
  
  if (request.action === "displayTags") {
    if (request.success) {
      displayTags(request.tags);
      // 移除标签获取成功的页面显示，只在控制台记录
      console.log(`成功获取 ${request.tags.length} 个标签`);
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
  
  // 初始化日期输入框
  initializeDateInputs();
  
  // 初始化日期
  initializeDates();
  
  // 自动获取标签
  autoFetchTags();
  
  // 禁用导出按钮（初始状态）
  elements.exportNotes.disabled = true;
  
  console.log('初始化完成');
  
  // 添加一个测试按钮来检查当前日期状态
  setTimeout(() => {
    console.log('=== 当前日期状态检查 ===');
    console.log('selectedStartDate:', selectedStartDate);
    console.log('selectedEndDate:', selectedEndDate);
    console.log('elements.startDate.value:', elements.startDate.value);
    console.log('elements.endDate.value:', elements.endDate.value);
    console.log('=== 检查完成 ===');
  }, 1000);
});