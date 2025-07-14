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
  const { selectedTags = [], startDate, endDate } = filterParams;
  
  let notesText = '';
  let savedCount = 0;
  let tagStats = {}; // 统计每个标签的笔记数量

  // 初始化选中标签的统计
  selectedTags.forEach(tag => {
    tagStats[tag] = 0;
  });

  // 筛选笔记
  let filteredNotes = notes.filter(note => {
    // 标签筛选
    let matchesTags = true;
    if (selectedTags.length > 0) {
      matchesTags = note.tags && note.tags.some(tag => selectedTags.includes(tag.name));
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
标题：${noteTitle}
更新时间：${noteDate}
标签：${noteTags}${noteUrl ? '\n链接：' + noteUrl : ''}

`;
    
    cleanContent = noteHeader + cleanContent.trimEnd() + '\n\n----------这里是分隔符----------\n\n';
    notesText += cleanContent;
    savedCount++;
    
    // 统计匹配的标签
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        if (selectedTags.includes(tag.name)) {
          tagStats[tag.name]++;
        }
      });
    }
  }

  chrome.storage.local.set({notes: notesText.trim()}, () => {
    console.log(`Notes saved to storage. Total notes: ${notes.length}, Filtered notes: ${filteredNotes.length}, Saved notes: ${savedCount}`);
    chrome.runtime.sendMessage({
      action: "notesSaved", 
      totalCount: notes.length, 
      filteredCount: filteredNotes.length,
      savedCount: savedCount,
      selectedTags: selectedTags,
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
  const limit = 20;
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
    fetchNotes(url)
      .then(data => {
        const notes = data.notes || [];
        notesCollected = notesCollected.concat(notes);
        
        console.log(`Fetched ${notes.length} notes. Total collected: ${notesCollected.length}`);

        if (notes.length < limit || notesCollected.length >= totalNeeded) {
          console.log('Finished fetching notes. Saving collected notes.');
          saveNotesToStorage(notesCollected, filterParams);
        } else {
          // Use setTimeout to prevent stack overflow
          setTimeout(() => fetchBatch(offset + limit), 100);
        }
      })
      .catch(error => {
        console.error('Error fetching notes:', error);
        saveNotesToStorage(notesCollected, filterParams);
      });
  }

  fetchBatch(0);
}

// 新增函数：仅获取标签，不保存笔记
async function fetchTagsOnly() {
  const baseUrl = "https://www.yuque.com/api/modules/note/notes/NoteController/index?filter_type=all&status=0&merge_dynamic_data=0&order=content_updated_at&with_pinned_notes=true";
  const limit = 20;
  const totalNeeded = 200; // 获取较少的笔记就足以收集大部分标签
  let notesCollected = [];
  let startTime = Date.now();
  const timeoutDuration = 15000; // 15 seconds timeout for tag fetching

  function fetchBatch(offset) {
    return new Promise((resolve, reject) => {
      if (Date.now() - startTime > timeoutDuration) {
        console.log('Timeout reached while fetching tags.');
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
            // Continue fetching
            setTimeout(async () => {
              try {
                await fetchBatch(offset + limit);
                resolve(notesCollected);
              } catch (error) {
                reject(error);
              }
            }, 100);
          }
        })
        .catch(error => {
          console.error('Error fetching notes for tags:', error);
          resolve(notesCollected); // Return what we have so far
        });
    });
  }

  try {
    await fetchBatch(0);
    const allTags = collectAllTags(notesCollected);
    chrome.runtime.sendMessage({
      action: "tagsCollected",
      tags: allTags
    });
    return allTags;
  } catch (error) {
    console.error('Error in fetchTagsOnly:', error);
    chrome.runtime.sendMessage({
      action: "tagsCollected",
      tags: [],
      error: error.message
    });
    return [];
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received in background:', request);
  if (request.action === "fetchNotes") {
    const filterParams = {
      selectedTags: request.selectedTags || [],
      startDate: request.startDate,
      endDate: request.endDate
    };
    main(filterParams);
    sendResponse({message: "正在搜索笔记..."});
  } else if (request.action === "fetchTags") {
    fetchTagsOnly();
    sendResponse({message: "正在获取标签..."});
  } else if (request.action === "notesSaved") {
    // 不需要在这里处理，直接由前端处理统计信息显示
    sendResponse({message: "笔记保存完成"});
  }
  return true;  // 保持消息通道开放
});