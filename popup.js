// 存储可用标签和选中标签
let availableTags = [];
let selectedTags = [];

// DOM元素引用
const elements = {
  fetchTags: document.getElementById('fetchTags'),
  tagSelect: document.getElementById('tagSelect'),
  startDate: document.getElementById('startDate'),
  endDate: document.getElementById('endDate'),
  selectedTagsInfo: document.getElementById('selectedTagsInfo'),
  selectedTagsList: document.getElementById('selectedTagsList'),
  clearTags: document.getElementById('clearTags'),
  fetchNotes: document.getElementById('fetchNotes'),
  resetFilters: document.getElementById('resetFilters'),
  viewNotes: document.getElementById('viewNotes'),
  copyNotes: document.getElementById('copyNotes'),
  resultActions: document.querySelector('.result-actions'),
  status: document.getElementById('status'),
  log: document.getElementById('log'),
  notesContent: document.getElementById('notesContent')
};

// 获取标签按钮事件
elements.fetchTags.addEventListener('click', () => {
  console.log('点击获取标签按钮');
  elements.status.textContent = '正在获取标签...';
  
  chrome.runtime.sendMessage({action: "fetchTags"}, (response) => {
    console.log('获取标签响应:', response);
    elements.status.textContent = response ? response.message : '无响应';
  });
});

// 显示标签列表
function displayTags(tags) {
  availableTags = tags;
  
  // 清空现有选项，保留默认选项
  elements.tagSelect.innerHTML = '<option value="">选择标签...</option>';
  
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
      tagChip.textContent = tag;
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

// 重置所有筛选条件
elements.resetFilters.addEventListener('click', () => {
  selectedTags = [];
  elements.startDate.value = '';
  elements.endDate.value = '';
  elements.tagSelect.value = '';
  updateSelectedTagsDisplay();
  
  // 清空结果
  elements.notesContent.textContent = '';
  elements.resultActions.style.display = 'none';
  elements.copyNotes.style.display = 'none';
  elements.status.textContent = '已重置所有筛选条件';
  elements.log.textContent = '';
  
  // 重新设置默认日期
  initializeDates();
});

// 获取笔记
elements.fetchNotes.addEventListener('click', () => {
  const filterConditions = {
    tags: selectedTags,
    startDate: elements.startDate.value,
    endDate: elements.endDate.value
  };
  
  console.log('点击搜索按钮，筛选条件:', filterConditions);
  
  // 验证筛选条件
  if (selectedTags.length === 0 && !elements.startDate.value && !elements.endDate.value) {
    elements.status.textContent = '请至少设置一个筛选条件（标签或日期范围）';
    return;
  }
  
  chrome.runtime.sendMessage({
    action: "fetchNotes",
    selectedTags: selectedTags,
    startDate: elements.startDate.value,
    endDate: elements.endDate.value
  }, (response) => {
    console.log('收到响应:', response);
    elements.status.textContent = response ? response.message : '无响应';
  });
});

// 查看笔记
elements.viewNotes.addEventListener('click', () => {
  chrome.storage.local.get('notes', (result) => {
    if (result.notes) {
      elements.notesContent.textContent = result.notes;
      elements.copyNotes.style.display = 'block';
    } else {
      elements.notesContent.textContent = '未找到笔记';
      elements.copyNotes.style.display = 'none';
    }
  });
});

// 复制笔记
elements.copyNotes.addEventListener('click', () => {
  elements.log.textContent = '开始复制笔记...';

  let notesContent = elements.notesContent.textContent;
  let dataCount = notesContent.split('----------这里是分隔符----------').length - 1;
  
  navigator.clipboard.writeText(notesContent).then(() => {
    elements.log.textContent = `笔记已复制到剪贴板！共 ${dataCount} 条笔记。`;
  }).catch(err => {
    console.error('复制失败：', err);
    elements.log.textContent = '复制失败，请重试。';
  });
});

// 日期验证
elements.startDate.addEventListener('change', validateDates);
elements.endDate.addEventListener('change', validateDates);

function validateDates() {
  const startDate = elements.startDate.value;
  const endDate = elements.endDate.value;
  
  if (startDate && endDate && startDate > endDate) {
    elements.status.textContent = '开始日期不能晚于结束日期';
    elements.startDate.style.borderColor = '#dc3545';
    elements.endDate.style.borderColor = '#dc3545';
  } else {
    elements.startDate.style.borderColor = '#d1d5db';
    elements.endDate.style.borderColor = '#d1d5db';
    if (elements.status.textContent.includes('日期')) {
      elements.status.textContent = '';
    }
  }
}

// 初始化日期
function initializeDates() {
  // 设置默认日期范围（最近30天）
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
  
  elements.endDate.value = today.toISOString().split('T')[0];
  elements.startDate.value = thirtyDaysAgo.toISOString().split('T')[0];
}

// 格式化统计信息
function formatStatsMessage(request) {
  let statusText = `📊 搜索完成：总笔记 ${request.totalCount} 条，符合条件 ${request.savedCount} 条`;
  
  if (request.tagStats && Object.keys(request.tagStats).length > 0) {
    const tagStatsText = Object.entries(request.tagStats)
      .filter(([tag, count]) => count > 0)
      .map(([tag, count]) => `${tag}(${count})`)
      .join('、');
    
    if (tagStatsText) {
      statusText += `\n🏷️ 标签分布：${tagStatsText}`;
    }
  }
  
  // 添加日期范围信息
  if (request.filterParams) {
    const { startDate, endDate } = request.filterParams;
    if (startDate || endDate) {
      const dateInfo = startDate && endDate 
        ? `${startDate} 至 ${endDate}`
        : startDate 
        ? `${startDate} 之后`
        : `${endDate} 之前`;
      statusText += `\n📅 时间范围：${dateInfo}`;
    }
  }
  
  return statusText;
}

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('在弹出窗口中收到消息:', request);
  
  if (request.action === "notesSaved") {
    // 显示结果操作按钮
    elements.resultActions.style.display = 'flex';
    
    // 格式化并显示统计信息
    const statusText = formatStatsMessage(request);
    elements.status.textContent = statusText;
    
  } else if (request.action === "tagsCollected") {
    if (request.error) {
      elements.status.textContent = `❌ 获取标签失败: ${request.error}`;
    } else {
      elements.status.textContent = `✅ 成功获取 ${request.tags.length} 个标签，请选择需要的标签`;
      displayTags(request.tags);
    }
  }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  initializeDates();
  
  // 初始状态
  elements.selectedTagsInfo.style.display = 'none';
  elements.resultActions.style.display = 'none';
});