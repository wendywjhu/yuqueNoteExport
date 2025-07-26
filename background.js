function cleanHtml(rawHtml) {
  let text = rawHtml
    .replace(/<ul>/g, '\n')
    .replace(/<\/ul>/g, '')
    .replace(/<ol>/g, '\n')
    .replace(/<\/ol>/g, '')
    .replace(/<li>/g, '- ')
    .replace(/<\/li>/g, '\n')
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<\/p>/g, '')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]*>/g, '');

  // 移除零宽空格
  text = text.replace(/\u200B/g, '');
  
  // 统一换行符
  text = text.replace(/\r\n|\r/g, '\n');
  
  // 合并多个空行为一个空行
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  // 解码 HTML 实体
  text = decodeHtmlEntities(text);
  
  // 最后进行trim
  return text.trim();
}

// 辅助函数：解码 HTML 实体
function decodeHtmlEntities(text) {
  var textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  return textArea.value;
}

function fetchNotes(url) {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
      let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      fetch(url, {
        headers: {
          'Cookie': cookieString
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => resolve(data))
      .catch(error => reject(error));
    });
  });
}

function fetchFullNoteContent(noteId) {
  return new Promise((resolve, reject) => {
    const url = `https://www.yuque.com/api/modules/note/notes/NoteController/show?id=${noteId}&merge_dynamic_data=0`;

    chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
      let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      fetch(url, {
        headers: {
          'Cookie': cookieString
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => resolve(data))
      .catch(error => reject(error));
    });
  });
}

async function saveNotesToStorage(notes, filterParams = {}) {
  const { tags = [], startDate, endDate } = filterParams;
  
  let notesText = '';
  let savedCount = 0;
  let tagStats = {}; // 统计每个标签的笔记数量

  // 初始化选中标签的统计
  tags.forEach(tag => {
    tagStats[tag === '__NO_TAG__' ? '无标签' : tag] = 0;
  });

  // 筛选笔记
  let filteredNotes = notes.filter(note => {
    // 标签筛选
    let matchesTags = true;
    if (tags.length > 0) {
      // 检查是否包含无标签选项
      const hasNoTagFilter = tags.includes('__NO_TAG__');
      const hasRegularTags = tags.filter(tag => tag !== '__NO_TAG__');
      
      let matchesRegularTags = false;
      let matchesNoTag = false;
      
      // 检查普通标签匹配
      if (hasRegularTags.length > 0) {
        matchesRegularTags = note.tags && note.tags.some(tag => hasRegularTags.includes(tag.name));
      }
      
      // 检查无标签匹配
      if (hasNoTagFilter) {
        matchesNoTag = !note.tags || note.tags.length === 0;
      }
      
      // 只要匹配其中一种条件即可
      matchesTags = matchesRegularTags || matchesNoTag;
    }
    
    // 日期筛选
    let matchesDate = true;
    if (startDate || endDate) {
      const noteDate = new Date(note.content_updated_at || note.created_at);
      if (startDate) {
        const start = new Date(startDate);
        matchesDate = matchesDate && noteDate >= start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // 设置为当天结束时间
        matchesDate = matchesDate && noteDate <= end;
      }
    }
    
    return matchesTags && matchesDate;
  });

  // 按更新时间倒序排列（最新的在前）
  filteredNotes.sort((a, b) => new Date(b.content_updated_at || b.created_at) - new Date(a.content_updated_at || a.created_at));

  for (const [index, note] of filteredNotes.entries()) {
    let content;
    try {
      const fullNote = await fetchFullNoteContent(note.id);
      // 从完整笔记数据中提取内容
      content = fullNote.content.html || fullNote.content.body || fullNote.content.abstract || '';
    } catch (error) {
      console.error(`Error fetching full content for note ${note.id}:`, error);
      content = note.content?.abstract || '';
    }

    console.log(`原始内容 ${index + 1}:`);
    console.log(content);
    console.log('---原始内容结束---');

    let cleanContent = cleanHtml(content);

    console.log(`清理后内容 ${index + 1}:`);
    console.log(cleanContent);
    console.log('---清理后内容结束---');

    // 添加笔记元信息
    const noteDate = new Date(note.content_updated_at || note.created_at).toLocaleDateString('zh-CN');
    const noteTitle = note.title || '无标题';
    const noteTags = note.tags ? note.tags.map(t => t.name).join(', ') : '无标签';
    const noteUrl = note.book ? `https://www.yuque.com/${note.book.user.login}/${note.book.slug}/${note.slug}` : '';
    
    const noteHeader = `=== 笔记 ${savedCount + 1} ===
更新时间：${noteDate}
标签：${noteTags}${noteUrl ? '\n链接：' + noteUrl : ''}

`;
    
    cleanContent = noteHeader + cleanContent.trimEnd() + '\n\n';
    notesText += cleanContent;
    savedCount++;
    
    // 统计匹配的标签
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        if (tags.includes(tag.name)) {
          tagStats[tag.name]++;
        }
      });
    }
    
    // 统计无标签笔记
    if (tags.includes('__NO_TAG__') && (!note.tags || note.tags.length === 0)) {
      tagStats['无标签']++;
    }
  }

  chrome.storage.local.set({notes: notesText.trim()}, () => {
    console.log(`Notes saved to storage. Total notes: ${notes.length}, Filtered notes: ${filteredNotes.length}, Saved notes: ${savedCount}`);
    
    // 发送新的响应格式
    chrome.runtime.sendMessage({
      action: "notesSaved", 
      success: true,
      totalNotes: notes.length, 
      filteredNotes: filteredNotes.length,
      savedCount: savedCount,
      tags: tags,
      tagStats: tagStats,
      filterParams: filterParams
    });
  });
}

// 新增函数：收集所有标签
function collectAllTags(notes) {
  const tagSet = new Set();
  notes.forEach(note => {
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        if (tag.name) {
          tagSet.add(tag.name);
        }
      });
    }
  });
  return Array.from(tagSet).sort();
}

function main(filterParams = {}) {
  const baseUrl = "https://www.yuque.com/api/modules/note/notes/NoteController/index?filter_type=all&status=0&merge_dynamic_data=0&order=content_updated_at&with_pinned_notes=true";
  const limit = 50; // 保留批次大小优化：20 → 50
  const totalNeeded = 1000;
  let notesCollected = [];
  let startTime = Date.now();
  const timeoutDuration = 30000; // 30 seconds timeout

  function fetchBatch(offset) {
    if (Date.now() - startTime > timeoutDuration) {
      console.log('Timeout reached. Saving collected notes.');
      saveNotesToStorage(notesCollected, filterParams);
      return;
    }

    const url = `${baseUrl}&limit=${limit}&offset=${offset}`;
    console.log(`Fetching batch: offset=${offset}, limit=${limit}`);
    
    fetchNotes(url)
      .then(data => {
        console.log('API Response:', data); // 调试日志
        
        const notes = data.notes || [];
        console.log(`Fetched ${notes.length} notes. Total collected before: ${notesCollected.length}`);
        
        notesCollected = notesCollected.concat(notes);
        console.log(`Total collected after: ${notesCollected.length}`);

        if (notes.length < limit || notesCollected.length >= totalNeeded) {
          console.log('Finished fetching notes. Saving collected notes.');
          saveNotesToStorage(notesCollected, filterParams);
        } else {
          // 减少延迟：100ms → 50ms
          setTimeout(() => fetchBatch(offset + limit), 50);
        }
      })
      .catch(error => {
        console.error('Error fetching notes:', error);
        saveNotesToStorage(notesCollected, filterParams);
      });
  }

  fetchBatch(0);
}

// 新的直接获取标签函数
async function fetchTagsDirectly() {
  const tagUrl = "https://www.yuque.com/api/modules/note/tags/TagController/index";
  
  try {
    console.log('Fetching tags directly from API...');
    
    const response = await new Promise((resolve, reject) => {
      chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
        let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        
        fetch(tagUrl, {
          headers: {
            'Cookie': cookieString
          }
        })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then(data => resolve(data))
        .catch(error => reject(error));
      });
    });
    
    console.log('Tags API response:', response);
    
    // 提取标签名称
    const tags = response.data ? response.data.map(tag => tag.name).sort() : [];
    
    console.log(`Successfully fetched ${tags.length} tags:`, tags);
    
    chrome.runtime.sendMessage({
      action: "displayTags",
      tags: tags,
      success: true
    });
    
    return tags;
  } catch (error) {
    console.error('Error fetching tags directly:', error);
    
    // 如果直接API失败，回退到原有方法
    console.log('Falling back to note-based tag collection...');
    return await fetchTagsFromNotes();
  }
}

// 保留原有的从笔记中获取标签的方法作为备选
async function fetchTagsFromNotes() {
  const baseUrl = "https://www.yuque.com/api/modules/note/notes/NoteController/index?filter_type=all&status=0&merge_dynamic_data=0&order=content_updated_at&with_pinned_notes=true";
  const limit = 50; // 增加批次大小
  const totalNeeded = 200; 
  let notesCollected = [];
  let startTime = Date.now();
  const timeoutDuration = 10000; // 减少超时时间

  function fetchBatch(offset) {
    return new Promise((resolve, reject) => {
      if (Date.now() - startTime > timeoutDuration) {
        console.log('Timeout reached while fetching tags from notes.');
        resolve(notesCollected);
        return;
      }

      const url = `${baseUrl}&limit=${limit}&offset=${offset}`;
      fetchNotes(url)
        .then(data => {
          const notes = data.notes || [];
          notesCollected = notesCollected.concat(notes);
          
          console.log(`Fetched ${notes.length} notes for tags. Total collected: ${notesCollected.length}`);

          if (notes.length < limit || notesCollected.length >= totalNeeded) {
            console.log('Finished fetching notes for tags.');
            resolve(notesCollected);
          } else {
            setTimeout(async () => {
              try {
                await fetchBatch(offset + limit);
                resolve(notesCollected);
              } catch (error) {
                reject(error);
              }
            }, 50); // 减少延迟
          }
        })
        .catch(error => {
          console.error('Error fetching notes for tags:', error);
          resolve(notesCollected); 
        });
    });
  }

  try {
    await fetchBatch(0);
    const allTags = collectAllTags(notesCollected);
    chrome.runtime.sendMessage({
      action: "displayTags",
      tags: allTags,
      success: true
    });
    return allTags;
  } catch (error) {
    console.error('Error in fetchTagsFromNotes:', error);
    chrome.runtime.sendMessage({
      action: "displayTags",
      tags: [],
      success: false,
      error: error.message
    });
    return [];
  }
}

// 导出笔记功能
async function exportNotes(filterParams = {}) {
  try {
    // 从存储中获取笔记内容
    chrome.storage.local.get('notes', (result) => {
      if (result.notes) {
        // 生成文件名
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        
        // 构建文件名，包含筛选条件信息
        let filename = `语雀笔记导出_${timestamp}`;
        
        // 添加标签信息
        if (filterParams.tags && filterParams.tags.length > 0) {
          const tagNames = filterParams.tags.map(tag => tag === '__NO_TAG__' ? '无标签' : tag);
          filename += `_标签(${tagNames.join(',')})`;
        }
        
        // 添加时间范围信息
        if (filterParams.startDate || filterParams.endDate) {
          const dateRangeText = `${filterParams.startDate || '开始'}至${filterParams.endDate || '结束'}`;
          filename += `_日期(${dateRangeText})`;
        }
        
        filename += '.txt';
        
        // 创建Blob对象
        const blob = new Blob([result.notes], { type: 'text/plain;charset=utf-8' });
        
        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // 释放URL对象
        URL.revokeObjectURL(url);
        
        chrome.runtime.sendMessage({
          action: "exportCompleted",
          success: true,
          filename: filename
        });
      } else {
        chrome.runtime.sendMessage({
          action: "exportCompleted",
          success: false,
          error: "没有找到可导出的笔记内容"
        });
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    chrome.runtime.sendMessage({
      action: "exportCompleted",
      success: false,
      error: error.message
    });
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  
  if (request.action === "fetchNotes") {
    const filterParams = {
      tags: request.filterConditions?.tags || [],
      startDate: request.filterConditions?.startDate,
      endDate: request.filterConditions?.endDate
    };
    main(filterParams);
    sendResponse({success: true, message: "正在搜索笔记..."});
  } else if (request.action === "exportNotes") {
    const filterParams = {
      tags: request.filterConditions?.tags || [],
      startDate: request.filterConditions?.startDate,
      endDate: request.filterConditions?.endDate
    };
    exportNotes(filterParams);
    sendResponse({success: true, message: "正在导出笔记..."});
  } else if (request.action === "fetchTags") {
    // 使用新的直接API获取标签
    fetchTagsDirectly();
    sendResponse({success: true, message: "正在获取标签..."});
  } else if (request.action === "autoFetchTags") {
    // 新增：自动获取标签（页面加载时调用）
    fetchTagsDirectly();
    sendResponse({success: true, message: "自动获取标签中..."});
  }
  
  return true;
});