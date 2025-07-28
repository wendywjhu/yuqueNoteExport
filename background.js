function cleanHtml(rawHtml) {
  try {
    // 方案1：使用DOMParser API (Manifest V3 推荐方式)
    if (typeof DOMParser !== 'undefined') {
      console.log('使用DOMParser API处理HTML');
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawHtml, 'text/html');
      
      // 递归提取文本内容，保留格式
      function extractText(node) {
        let text = '';
        
        for (const child of node.childNodes) {
          if (child.nodeType === Node.TEXT_NODE) {
            text += child.textContent;
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            const tagName = child.tagName.toLowerCase();
            
            // 处理不同标签的格式，输出Markdown兼容格式
            switch (tagName) {
              case 'h1':
                text += '\n## ' + extractText(child) + '\n\n';
                break;
              case 'h2':
                text += '\n### ' + extractText(child) + '\n\n';
                break;
              case 'h3':
                text += '\n#### ' + extractText(child) + '\n\n';
                break;
              case 'h4':
              case 'h5':
              case 'h6':
                text += '\n##### ' + extractText(child) + '\n\n';
                break;
              case 'ul':
              case 'ol':
                text += '\n' + extractText(child) + '\n';
                break;
              case 'li':
                text += '- ' + extractText(child) + '\n';
                break;
              case 'p':
                text += '\n' + extractText(child) + '\n';
                break;
              case 'div':
                text += extractText(child);
                break;
              case 'br':
                text += '\n';
                break;
              case 'strong':
              case 'b':
                text += '**' + extractText(child) + '**';
                break;
              case 'em':
              case 'i':
                text += '*' + extractText(child) + '*';
                break;
              case 'code':
                text += '`' + extractText(child) + '`';
                break;
              case 'pre':
                text += '\n```\n' + extractText(child) + '\n```\n';
                break;
              case 'blockquote':
                const quotedText = extractText(child);
                text += '\n> ' + quotedText.replace(/\n/g, '\n> ') + '\n';
                break;
              default:
                text += extractText(child);
            }
          }
        }
        
        return text;
      }
      
      let text = extractText(doc.body || doc);
      
      // 清理格式
      text = text.replace(/\u200B/g, ''); // 移除零宽空格
      text = text.replace(/\r\n|\r/g, '\n'); // 统一换行符
      text = text.replace(/\n\s*\n/g, '\n\n'); // 合并多个空行
      
      return text.trim();
    }
  } catch (error) {
    console.log('DOMParser不可用，使用正则表达式方法:', error);
  }
  
  // 方案2：正则表达式方式 (兼容fallback) - 输出Markdown格式
  console.log('使用正则表达式处理HTML');
  let text = rawHtml
    // 处理标题标签
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n## $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n### $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n#### $1\n\n')
    .replace(/<h[456][^>]*>(.*?)<\/h[456]>/gi, '\n##### $1\n\n')
    // 处理格式化标签
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<pre[^>]*>(.*?)<\/pre>/gis, '\n```\n$1\n```\n')
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (match, content) => {
      return '\n> ' + content.replace(/\n/g, '\n> ') + '\n';
    })
    // 处理列表
    .replace(/<ul[^>]*>/g, '\n')
    .replace(/<\/ul>/g, '\n')
    .replace(/<ol[^>]*>/g, '\n')
    .replace(/<\/ol>/g, '\n')
    .replace(/<li[^>]*>/g, '- ')
    .replace(/<\/li>/g, '\n')
    // 处理段落和换行
    .replace(/<p[^>]*>/g, '\n')
    .replace(/<\/p>/g, '\n')
    .replace(/<br\s*\/?>/g, '\n')
    // 移除所有其他HTML标签
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

// 辅助函数：解码 HTML 实体（Manifest V3 兼容）
function decodeHtmlEntities(text) {
  try {
    // 方案1：使用DOMParser解码HTML实体 (Manifest V3推荐)
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${text}</div>`, 'text/html');
      return doc.querySelector('div').textContent || text;
    }
    
    // 方案2：尝试使用document (Manifest V2兼容)
    if (typeof document !== 'undefined') {
      var textArea = document.createElement('textarea');
      textArea.innerHTML = text;
      return textArea.value;
    }
  } catch (error) {
    console.log('DOM解码方法不可用，使用手动解码:', error);
  }
  
  // 方案3：手动解码常见HTML实体 (最终fallback)
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#39;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
    '&mdash;': '—',
    '&ndash;': '–',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&hellip;': '…',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };
  
  let decoded = text;
  
  // 处理命名实体
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), char);
  }
  
  // 处理数字实体 &#数字;
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    try {
      return String.fromCharCode(parseInt(dec, 10));
    } catch (e) {
      return match; // 如果转换失败，保留原文
    }
  });
  
  // 处理十六进制实体 &#x数字;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch (e) {
      return match; // 如果转换失败，保留原文
    }
  });
  
  return decoded;
}

function fetchNotes(url) {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
      let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
      
      console.log('请求笔记URL:', url);
      console.log('Cookie数量:', cookies.length);
      
      fetch(url, {
        headers: {
          'Cookie': cookieString,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Referer': 'https://www.yuque.com/',
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => {
        console.log('笔记API响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          return response.text().then(text => {
            console.log('笔记API错误响应内容:', text);
            throw new Error(`HTTP error! status: ${response.status}, response: ${text}`);
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('笔记API成功响应:', data);
        resolve(data);
      })
      .catch(error => {
        console.error('笔记API详细错误:', error);
        reject(error);
      });
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

// 优化后的主函数 - 支持大量笔记
function main(filterParams = {}) {
  // 简化API参数，避免422错误
  const baseUrl = "https://www.yuque.com/api/modules/note/notes/NoteController/index";
  const limit = 50; // 减少批次大小，避免服务器负载问题
  let notesCollected = [];
  let startTime = Date.now();
  const timeoutDuration = 60000; // 增加到60秒，支持大量笔记

  // 发送开始消息
  chrome.runtime.sendMessage({
    action: "searchProgress",
    stage: "fetching",
    message: "正在获取笔记列表..."
  });

  function fetchBatch(offset) {
    if (Date.now() - startTime > timeoutDuration) {
      console.log('超时时间已到，开始处理已收集的笔记。');
      saveNotesToStorage(notesCollected, filterParams);
      return;
    }

    // 构建安全的API参数
    const params = new URLSearchParams({
      filter_type: 'all',
      status: '0',
      order: 'content_updated_at',
      limit: limit.toString(),
      offset: offset.toString()
    });
    
    const url = `${baseUrl}?${params.toString()}`;
    console.log(`正在获取批次：偏移量=${offset}，限制=${limit}`);
    
    fetchNotes(url)
      .then(data => {
        const notes = data.notes || [];
        console.log(`已获取 ${notes.length} 条笔记。总计收集：${notesCollected.length + notes.length}`);
        
        notesCollected = notesCollected.concat(notes);
        
        // 发送进度更新
        chrome.runtime.sendMessage({
          action: "searchProgress",
          stage: "fetching",
          message: `已获取 ${notesCollected.length} 条笔记...`
        });

        // 继续获取条件：返回了完整的limit数量，说明可能还有更多
        if (notes.length === limit) {
          // 立即获取下一批，不延迟
          fetchBatch(offset + limit);
        } else {
          // 没有更多笔记了，开始处理
          console.log('已完成所有笔记获取，开始处理...');
          saveNotesToStorage(notesCollected, filterParams);
        }
      })
      .catch(error => {
        console.error('获取笔记时出错:', error);
        // 即使出错也处理已收集的笔记
        if (notesCollected.length > 0) {
          saveNotesToStorage(notesCollected, filterParams);
        } else {
          chrome.runtime.sendMessage({
            action: "notesSaved", 
            success: false,
            error: "获取笔记失败: " + error.message
          });
        }
      });
  }

  fetchBatch(0);
}

// 高性能并发获取完整内容
async function fetchFullNoteContentBatch(noteIds, concurrency = 5) {
  console.log(`开始批量获取 ${noteIds.length} 条笔记的详细内容，并发数: ${concurrency}`);
  const results = [];
  
  // 分批并发处理
  for (let i = 0; i < noteIds.length; i += concurrency) {
    const batch = noteIds.slice(i, i + concurrency);
    console.log(`处理批次 ${Math.floor(i/concurrency) + 1}，包含笔记ID:`, batch);
    
    const batchPromises = batch.map(noteId => 
      fetchFullNoteContent(noteId)
        .then(data => {
          console.log(`成功获取笔记 ${noteId} 的详细内容`);
          return { id: noteId, data, success: true };
        })
        .catch(error => {
          console.log(`获取笔记 ${noteId} 详细内容失败:`, error.message);
          return { id: noteId, error, success: false };
        })
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    console.log(`批次完成，当前总进度: ${results.length}/${noteIds.length}`);
    
    // 发送进度更新
    chrome.runtime.sendMessage({
      action: "searchProgress",
      stage: "content",
      message: `正在获取详细内容... ${results.length}/${noteIds.length}`
    });
    
    // 小延迟避免过载
    if (i + concurrency < noteIds.length) {
      console.log('等待100ms后继续下一批次...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  console.log(`所有批次处理完成，总结果数: ${results.length}`);
  return results;
}

// 优化后的保存函数 - 支持大量笔记 + 并发处理
async function saveNotesToStorage(notes, filterParams = {}) {
  const { tags = [], startDate, endDate } = filterParams;
  
  console.log(`开始处理 ${notes.length} 条笔记，筛选条件:`, filterParams);
  console.log('日期筛选条件详情:', {
    startDate: startDate,
    endDate: endDate,
    startDateType: typeof startDate,
    endDateType: typeof endDate
  });
  
  // 发送筛选阶段消息
  chrome.runtime.sendMessage({
    action: "searchProgress",
    stage: "filtering",
    message: `正在筛选 ${notes.length} 条笔记...`
  });
  
  let tagStats = {};
  tags.forEach(tag => {
    tagStats[tag === '__NO_TAG__' ? '无标签' : tag] = 0;
  });

  // 第一阶段：快速筛选笔记
  let filteredNotes = notes.filter(note => {
    // 标签筛选逻辑
    let matchesTags = true;
    if (tags.length > 0) {
      const hasNoTagFilter = tags.includes('__NO_TAG__');
      const hasRegularTags = tags.filter(tag => tag !== '__NO_TAG__');
      
      let matchesRegularTags = false;
      let matchesNoTag = false;
      
      if (hasRegularTags.length > 0) {
        matchesRegularTags = note.tags && note.tags.some(tag => hasRegularTags.includes(tag.name));
      }
      
      if (hasNoTagFilter) {
        matchesNoTag = !note.tags || note.tags.length === 0;
      }
      
      matchesTags = matchesRegularTags || matchesNoTag;
    }
    
    // 日期筛选逻辑
    let matchesDate = true;
    if (startDate || endDate) {
      console.log(`检查笔记 ${note.id} 的日期筛选:`, {
        startDate: startDate,
        endDate: endDate,
        noteContentUpdatedAt: note.content_updated_at,
        noteCreatedAt: note.created_at,
        notePublishedAt: note.published_at
      });
      
      // 尝试多个可能的日期字段
      const noteDate = new Date(note.content_updated_at || note.created_at || note.published_at);
      console.log(`笔记 ${note.id} 使用的日期:`, noteDate);
      
      if (startDate) {
        const start = new Date(startDate);
        const isAfterStart = noteDate >= start;
        console.log(`笔记 ${note.id} 开始日期检查: ${noteDate} >= ${start} = ${isAfterStart}`);
        matchesDate = matchesDate && isAfterStart;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const isBeforeEnd = noteDate <= end;
        console.log(`笔记 ${note.id} 结束日期检查: ${noteDate} <= ${end} = ${isBeforeEnd}`);
        matchesDate = matchesDate && isBeforeEnd;
      }
      
      console.log(`笔记 ${note.id} 日期筛选结果: ${matchesDate}`);
    }
    
    return matchesTags && matchesDate;
  });

  console.log(`筛选完成，符合条件的笔记: ${filteredNotes.length} 条`);
  if (startDate || endDate) {
    console.log('日期筛选统计:', {
      总笔记数: notes.length,
      筛选后笔记数: filteredNotes.length,
      筛选掉笔记数: notes.length - filteredNotes.length,
      开始日期: startDate,
      结束日期: endDate
    });
  }
  
  if (filteredNotes.length === 0) {
    chrome.runtime.sendMessage({
      action: "notesSaved", 
      success: true,
      totalNotes: notes.length, 
      filteredNotes: 0,
      savedCount: 0,
      tags: tags,
      tagStats: tagStats,
      filterParams: filterParams
    });
    return;
  }

  // 按更新时间倒序排列
  filteredNotes.sort((a, b) => new Date(b.content_updated_at || b.created_at) - new Date(a.content_updated_at || a.created_at));

  // 第二阶段：并发获取完整内容
  console.log(`开始获取 ${filteredNotes.length} 条笔记的详细内容...`);
  chrome.runtime.sendMessage({
    action: "searchProgress",
    stage: "content",
    message: `正在获取 ${filteredNotes.length} 条笔记的详细内容...`
  });

  const noteIds = filteredNotes.map(note => note.id);
  console.log('要获取详细内容的笔记ID:', noteIds);
  
  // 声明contentMap在try-catch外部，确保作用域正确
  let contentMap = new Map();
  
  try {
    const contentResults = await fetchFullNoteContentBatch(noteIds, 5); // 减少并发数
    console.log('获取详细内容结果:', contentResults);
    
    // 创建ID到内容的映射
    let successCount = 0;
    contentResults.forEach(result => {
      if (result.success) {
        contentMap.set(result.id, result.data);
        successCount++;
      } else {
        console.log(`笔记 ${result.id} 获取失败:`, result.error);
      }
    });
    
    console.log(`成功获取 ${successCount}/${noteIds.length} 条笔记的详细内容`);
  } catch (error) {
    console.error('获取详细内容时出错:', error);
    // 如果获取详细内容失败，contentMap保持为空Map，直接使用基础内容
    console.log('将使用基础内容，不获取详细内容');
  }

  // 第三阶段：生成最终内容
  console.log('=== 开始第三阶段：生成最终内容 ===');
  console.log('contentMap状态:', contentMap.size > 0 ? `包含${contentMap.size}条详细内容` : '为空，将使用基础内容');
  
  chrome.runtime.sendMessage({
    action: "searchProgress",
    stage: "generating",
    message: "正在生成导出内容..."
  });

  let notesText = '';
  let savedCount = 0;

  console.log(`准备处理 ${filteredNotes.length} 条笔记`);
  console.log('即将进入for循环...');
  
  for (const [index, note] of filteredNotes.entries()) {
    console.log(`处理第 ${index + 1}/${filteredNotes.length} 条笔记，ID: ${note.id}`);
    let content = '';
    
    // 获取完整内容
    const fullNoteData = contentMap.get(note.id);
    if (fullNoteData) {
      content = fullNoteData.content?.html || fullNoteData.content?.body || fullNoteData.content?.abstract || '';
    } else {
      // 回退到基本内容
      content = note.content?.abstract || note.abstract || '内容获取失败';
    }

    console.log(`笔记 ${note.id} 原始内容长度: ${content.length}`);
    
    let cleanContent;
    try {
      console.log(`开始清理笔记 ${note.id} 的HTML内容...`);
      cleanContent = cleanHtml(content);
      console.log(`笔记 ${note.id} HTML清理成功，清理后内容长度: ${cleanContent.length}`);
    } catch (error) {
      console.error(`处理笔记 ${note.id} 的HTML清理时出错:`, error);
      console.error('错误详情:', error.stack);
      cleanContent = content; // 如果清理失败，使用原始内容
      console.log(`笔记 ${note.id} 使用原始内容，长度: ${cleanContent.length}`);
    }

    // 获取导出选项
    const exportOptions = filterParams.exportOptions || {
      includeTitle: true,
      includeTime: true,
      includeTags: true
    };
    
    // 添加笔记元信息
    const noteDate = new Date(note.content_updated_at || note.created_at).toLocaleDateString('zh-CN');
    const noteTitle = note.title || '无标题';
    const noteTags = note.tags ? note.tags.map(t => t.name).join(', ') : '无标签';
    const noteUrl = note.book ? `https://www.yuque.com/${note.book.user.login}/${note.book.slug}/${note.slug}` : '';
    
    console.log(`笔记 ${note.id} 元信息: 标题=${noteTitle}, 日期=${noteDate}, 标签=${noteTags}`);
    console.log(`导出选项:`, exportOptions);
    
    // 根据用户选择生成笔记头部
    let noteHeader = '';
    
    // 标题（如果选择包含标题）
    if (exportOptions.includeTitle) {
      noteHeader += `# ${noteTitle}\n\n`;
    }
    
    // 元信息行
    const metaInfo = [];
    if (exportOptions.includeTime) {
      metaInfo.push(`**更新时间：** ${noteDate}`);
    }
    if (exportOptions.includeTags) {
      metaInfo.push(`**标签：** ${noteTags}`);
    }
    if (noteUrl) {
      metaInfo.push(`**链接：** ${noteUrl}`);
    }
    
    if (metaInfo.length > 0) {
      noteHeader += metaInfo.join('  \n') + '\n\n';
    }
    
    cleanContent = noteHeader + cleanContent.trimEnd() + '\n\n---\n\n';
    notesText += cleanContent;
    savedCount++;
    
    console.log(`已处理完成笔记 ${note.id}，当前进度: ${savedCount}/${filteredNotes.length}`);
    
    // 统计标签
    if (note.tags && Array.isArray(note.tags)) {
      note.tags.forEach(tag => {
        if (tags.includes(tag.name)) {
          tagStats[tag.name]++;
        }
      });
    }
    
    if (tags.includes('__NO_TAG__') && (!note.tags || note.tags.length === 0)) {
      tagStats['无标签']++;
    }
    
    // 每处理10条发送一次进度
    if (savedCount % 10 === 0) {
      chrome.runtime.sendMessage({
        action: "searchProgress",
        stage: "generating",
        message: `正在生成导出内容... ${savedCount}/${filteredNotes.length}`
      });
    }
  }

  console.log(`所有笔记处理完成！成功处理 ${savedCount} 条笔记`);
  console.log(`最终导出内容总长度: ${notesText.length} 字符`);
  console.log(`准备保存到存储...`);

  // 保存原始笔记数据、完整内容和筛选后的笔记ID
  chrome.storage.local.set({
    rawNotes: filteredNotes.map(note => ({
      ...note,
      cleanContent: cleanHtml(note.content?.abstract || note.abstract || '内容获取失败'),
      fullContent: contentMap.get(note.id)?.content?.html || contentMap.get(note.id)?.content?.body || null
    })),
    filteredNoteIds: filteredNotes.map(note => note.id)
  }, () => {
    console.log(`笔记已保存到存储。总笔记数：${notes.length}，筛选后笔记数：${filteredNotes.length}，已保存笔记数：${savedCount}`);
    
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

// 使用专门的标签API直接获取标签
async function fetchTagsDirectly() {
  const url = "https://www.yuque.com/api/modules/note/tags/TagController/index";
  
  console.log('开始获取标签列表...');
  
  chrome.cookies.getAll({domain: "www.yuque.com"}, (cookies) => {
    let cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
    
    fetch(url, {
      headers: {
        'Cookie': cookieString,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    })
    .then(response => {
      console.log('标签API响应状态:', response.status);
      
      if (!response.ok) {
        return response.text().then(text => {
          console.log('标签API错误响应:', text);
          throw new Error(`HTTP error! status: ${response.status}, message: ${text}`);
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('标签API成功响应:', data);
      
      // 从API响应中提取标签名称
      const tags = data.data ? data.data.map(tag => tag.name).sort() : [];
      
      console.log(`成功获取 ${tags.length} 个标签:`, tags);
      
      chrome.runtime.sendMessage({
        action: "displayTags",
        success: true,
        tags: tags
      });
    })
    .catch(error => {
      console.error('获取标签时出错:', error);
      chrome.runtime.sendMessage({
        action: "displayTags",
        success: false,
        error: error.message
      });
    });
  });
}

// 导出笔记功能 - 使用Chrome Downloads API (Manifest V3兼容)
async function exportNotes({ filterConditions } = {}) {
  try {
    console.log('开始导出笔记，筛选参数:', filterConditions);
    
    // 从存储中获取原始笔记数据
    chrome.storage.local.get(['rawNotes', 'filteredNoteIds'], (result) => {
      if (result.rawNotes && result.filteredNoteIds) {
        console.log('获取到原始笔记数据，准备根据导出选项重新格式化');
        console.log('导出选项:', filterConditions?.exportOptions);
        console.log('筛选后的笔记数量:', result.filteredNoteIds.length);
        
        // 获取需要导出的笔记
        const notesToExport = result.rawNotes.filter(note => 
          result.filteredNoteIds.includes(note.id)
        );
        
        // 重新生成导出内容
        let notesText = '';
        for (const note of notesToExport) {
          // 获取导出选项
          const exportOptions = filterConditions?.exportOptions || {
            includeTitle: true,
            includeTime: true,
            includeTags: true
          };
          console.log('当前笔记的导出选项:', exportOptions);
          console.log('导出选项来源:', filterConditions?.exportOptions ? '用户选择' : '默认值');
          
          // 添加笔记元信息
          const noteDate = new Date(note.content_updated_at || note.created_at).toLocaleDateString('zh-CN');
          const noteTitle = note.title || '无标题';
          const noteTags = note.tags ? note.tags.map(t => t.name).join(', ') : '无标签';
          const noteUrl = note.book ? `https://www.yuque.com/${note.book.user.login}/${note.book.slug}/${note.slug}` : '';
          
          // 根据用户选择生成笔记头部
          let noteHeader = '';
          
          // 标题（如果选择包含标题）
          if (exportOptions.includeTitle) {
            noteHeader += `# ${noteTitle}\n\n`;
          }
          
          // 元信息行
          const metaInfo = [];
          if (exportOptions.includeTime) {
            metaInfo.push(`**更新时间：** ${noteDate}`);
          }
          if (exportOptions.includeTags) {
            metaInfo.push(`**标签：** ${noteTags}`);
          }
          if (noteUrl) {
            metaInfo.push(`**链接：** ${noteUrl}`);
          }
          
          if (metaInfo.length > 0) {
            noteHeader += metaInfo.join('  \n') + '\n\n';
          }
          
          // 使用已经清理过的内容
          const cleanContent = note.cleanContent || note.fullContent || '内容获取失败';
          
          notesText += noteHeader + cleanContent.trimEnd() + '\n\n---\n\n';
        }
        
        console.log('笔记内容重新格式化完成，长度:', notesText.length);
        
        // 生成文件名
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
        
        // 构建文件名，包含筛选条件和格式信息
        let filename = `语雀笔记导出_${timestamp}`;
        
        // 添加标签信息
        if (filterConditions?.tags && filterConditions.tags.length > 0) {
          const tagNames = filterConditions.tags.map(tag => tag === '__NO_TAG__' ? '无标签' : tag);
          filename += `_标签(${tagNames.join(',')})`;
        }
        
        // 添加时间范围信息
        if (filterConditions?.startDate || filterConditions?.endDate) {
          const dateRangeText = `${filterConditions.startDate || '开始'}至${filterConditions.endDate || '结束'}`;
          filename += `_日期(${dateRangeText})`;
        }
        
        // 添加导出格式信息
        if (filterConditions?.exportOptions) {
          const formats = [];
          if (filterConditions.exportOptions.includeTitle) formats.push('标题');
          if (filterConditions.exportOptions.includeTime) formats.push('时间');
          if (filterConditions.exportOptions.includeTags) formats.push('标签');
          if (formats.length > 0 && formats.length < 3) {
            filename += `_格式(${formats.join('+')})`;
          }
        }
        
        filename += '.txt';
        
        console.log('准备下载文件:', filename);
        
        // 创建Blob并转换为Data URL
        const blob = new Blob([notesText.trim()], { type: 'text/plain;charset=utf-8' });
        const reader = new FileReader();
        
        reader.onload = function() {
          const dataUrl = reader.result;
          
          // 使用Chrome Downloads API下载文件
          chrome.downloads.download({
            url: dataUrl,
            filename: filename,
            saveAs: true  // 让用户选择保存位置
          }, (downloadId) => {
            if (chrome.runtime.lastError) {
              console.error('下载失败:', chrome.runtime.lastError);
              chrome.runtime.sendMessage({
                action: "exportCompleted",
                success: false,
                error: "下载失败: " + chrome.runtime.lastError.message
              });
            } else {
              console.log('下载开始，ID:', downloadId);
              chrome.runtime.sendMessage({
                action: "exportCompleted",
                success: true,
                filename: filename,
                downloadId: downloadId
              });
            }
          });
        };
        
        reader.onerror = function() {
          console.error('文件读取失败');
          chrome.runtime.sendMessage({
            action: "exportCompleted",
            success: false,
            error: "文件读取失败"
          });
        };
        
        // 读取Blob为Data URL
        reader.readAsDataURL(blob);
        
      } else {
        console.error('没有找到笔记内容');
        chrome.runtime.sendMessage({
          action: "exportCompleted",
          success: false,
          error: "没有找到可导出的笔记内容"
        });
      }
    });
  } catch (error) {
    console.error('导出错误:', error);
    chrome.runtime.sendMessage({
      action: "exportCompleted",
      success: false,
      error: error.message
    });
  }
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('后台收到消息:', request);
  
  if (request.action === "fetchNotes") {
    const filterParams = {
      tags: request.filterConditions?.tags || [],
      startDate: request.filterConditions?.startDate,
      endDate: request.filterConditions?.endDate
    };
    main(filterParams);
    sendResponse({success: true, message: "正在搜索笔记..."});
  } else if (request.action === "exportNotes") {
    console.log('收到导出请求，完整参数：', request);
    exportNotes(request);
    sendResponse({success: true, message: "正在导出笔记..."});
  } else if (request.action === "autoFetchTags") {
    // 使用新的标签API直接获取
    fetchTagsDirectly();
    sendResponse({success: true, message: "正在获取标签列表..."});
  }
  
  return true;
});