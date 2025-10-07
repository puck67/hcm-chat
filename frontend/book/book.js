async function fetchJSON(url){
  const res = await fetch(url);
  if(!res.ok) throw new Error('HTTP '+res.status);
  return res.json();
}

function renderMarkdown(md){
  const escapeHtml = (s)=> s
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');

  const inline = (s)=> {
    // thứ tự: bold trước italic để tránh lồng sai
    return s
      .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
      .replace(/__([^_]+)__/g,'<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g,'<em>$1</em>')
      .replace(/_([^_]+)_/g,'<em>$1</em>');
  };

  const lines = md.split(/\r?\n/);
  const out = [];
  let inUl = false, inOl = false, inBq = false;
  let bqBuf = [];
  let para = [];

  const flushPara = ()=>{
    if(para.length){
      out.push('<p>'+para.join('<br/>')+'</p>');
      para = [];
    }
  };
  const closeLists = ()=>{
    if(inUl){ out.push('</ul>'); inUl=false; }
    if(inOl){ out.push('</ol>'); inOl=false; }
  };
  const flushBq = ()=>{
    if(inBq){
      out.push('<blockquote><p>'+bqBuf.join('<br/>')+'</p></blockquote>');
      inBq=false; bqBuf=[];
    }
  };

  for(let raw of lines){
    const line = raw; // giữ nguyên để đếm dấu
    const trimmed = line.trim();

    if(trimmed === ''){
      flushPara();
      flushBq();
      closeLists();
      continue;
    }

    // heading h1..h6, cho phép pattern "#### - Tiêu đề"
    const h = trimmed.match(/^(#{1,6})\s*-?\s*(.+)$/);
    if(h){
      flushPara(); flushBq(); closeLists();
      const level = h[1].length;
      const text = inline(escapeHtml(h[2]));
      out.push(`<h${level}>${text}</h${level}>`);
      continue;
    }

    // hr
    if(/^---+$/.test(trimmed)){
      flushPara(); flushBq(); closeLists();
      out.push('<hr/>');
      continue;
    }

    // blockquote
    const bqm = trimmed.match(/^>\s?(.*)$/);
    if(bqm){
      flushPara(); closeLists();
      inBq = true;
      bqBuf.push(inline(escapeHtml(bqm[1])));
      continue;
    } else if(inBq){
      flushBq();
    }

    // unordered list
    const ulm = trimmed.match(/^[*-]\s+(.+)$/);
    if(ulm){
      flushPara(); flushBq();
      if(!inUl){ out.push('<ul>'); inUl = true; }
      out.push('<li>'+inline(escapeHtml(ulm[1]))+'</li>');
      continue;
    } else if(inUl && !/^[*-]\s+/.test(trimmed)){
      // close when out of list
      closeLists();
    }

    // ordered list
    const olm = trimmed.match(/^\d+\.\s+(.+)$/);
    if(olm){
      flushPara(); flushBq();
      if(!inOl){ out.push('<ol>'); inOl = true; }
      out.push('<li>'+inline(escapeHtml(olm[1]))+'</li>');
      continue;
    } else if(inOl && !/^\d+\.\s+/.test(trimmed)){
      closeLists();
    }

    // paragraph line
    para.push(inline(escapeHtml(line)));
  }
  // flush cuối
  flushPara(); flushBq(); closeLists();
  return out.join('\n');
}

function parseHash(){
  const raw = location.hash.startsWith('#') ? location.hash.substring(1) : location.hash;
  if(!raw) return { slug: '', params: {} };
  const [slug, qs] = raw.split('?');
  const params = {};
  if(qs){
    qs.split('&').forEach(kv=>{
      const [k,v] = kv.split('=');
      if(k) params[decodeURIComponent(k)] = decodeURIComponent(v||'');
    });
  }
  return { slug, params };
}

function insertHighlightStyle(){
  if(document.getElementById('hl-style')) return;
  const style = document.createElement('style');
  style.id = 'hl-style';
  style.textContent = '.hl-mark{background:#fff3b0; padding:0 2px; border-radius:2px}';
  document.head.appendChild(style);
}

function highlightTextInNode(node, phrase){
  const text = node.nodeValue;
  const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
  if(idx === -1) return false;
  const before = document.createTextNode(text.slice(0, idx));
  const mark = document.createElement('mark');
  mark.className = 'hl-mark';
  mark.textContent = text.slice(idx, idx + phrase.length);
  const after = document.createTextNode(text.slice(idx + phrase.length));
  const parent = node.parentNode;
  parent.replaceChild(after, node);
  parent.insertBefore(mark, after);
  parent.insertBefore(before, mark);
  return true;
}

function highlightInElement(root, phrase){
  if(!phrase || !root) return false;
  insertHighlightStyle();
  let found = false;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n)=> n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
  });
  let current;
  while(current = walker.nextNode()){
    if(highlightTextInNode(current, phrase)){
      found = true;
      break; // chỉ highlight lần đầu
    }
  }
  if(found){
    const el = root.querySelector('.hl-mark');
    if(el) el.scrollIntoView({behavior:'smooth', block:'center'});
  }
  return found;
}

async function loadTOC(){
  const tocEl = document.getElementById('tocList');
  tocEl.innerHTML = '';
  const list = await fetchJSON((window.PYTHON_AI_API || 'https://hcm-chat-2.onrender.com') + '/book/list');
  list.forEach(item=>{
    const a = document.createElement('a');
    a.href = '#'+item.slug;
    a.textContent = item.title;
    a.className = 'toc-item';
    a.addEventListener('click', (e)=>{
      e.preventDefault();
      selectTOC(item.slug);
      loadPage(item.slug);
    });
    tocEl.appendChild(a);
  });
  return list;
}

function selectTOC(slug){
  const items = document.querySelectorAll('.toc-item');
  items.forEach(el=>{
    const href = el.getAttribute('href') || '';
    const hSlug = href.startsWith('#') ? href.substring(1) : href;
    if(hSlug === slug) el.classList.add('active'); else el.classList.remove('active');
  });
}

async function loadPage(slug, opts={}){
  const contentEl = document.getElementById('content');
  contentEl.innerHTML = '<div class="page-skeleton"><div class="line w60"></div><div class="line w90"></div><div class="line w85"></div><div class="line w75"></div><div class="line w95"></div><div class="line w70"></div></div>';
  const data = await fetchJSON((window.PYTHON_AI_API || 'https://hcm-chat-2.onrender.com') + '/book/content/' + slug);
  document.getElementById('pageTitle').textContent = '— '+data.title;
  const html = renderMarkdown(data.markdown);
  contentEl.innerHTML = '<div class="markdown">'+html+'</div>';
  selectTOC(slug);
  // highlight nếu có
  const hl = opts.highlight || parseHash().params.hl;
  console.log('🔍 Highlight debug:', {
    slug,
    rawHl: hl,
    urlParams: parseHash().params,
    fullHash: window.location.hash
  });
  if(hl){
    // thu gọn khoảng trắng của hl để tăng khả năng khớp
    const phrase = hl.replace(/[\n\r\t]+/g,' ').trim().slice(0, 500);
    console.log('🎯 Trying to highlight:', phrase);
    const success = highlightInElement(contentEl, phrase);
    console.log('✅ Highlight result:', success);
    if (!success) {
      // Thử highlight với parts của phrase
      const words = phrase.split(' ').filter(w => w.length > 3);
      console.log('🔄 Trying individual words:', words);
      for (const word of words.slice(0, 3)) {
        if (highlightInElement(contentEl, word)) {
          console.log('✅ Highlighted word:', word);
          break;
        }
      }
    }
  }
}

(async function init(){
  try{
    const toc = await loadTOC();
    // Lấy slug từ hash (#slug?hl=...)
    let {slug, params} = parseHash();
    if(!slug) slug = 'chuong1';
    if(!toc.find(x=>x.slug === slug)) slug = toc.length ? toc[0].slug : 'chuong1';
    await loadPage(slug, {highlight: params.hl});
    window.addEventListener('hashchange', async ()=>{
      const {slug: s2, params: p2} = parseHash();
      if(!s2) return;
      await loadPage(s2, {highlight: p2.hl});
    });
  }catch(err){
    console.error(err);
    document.getElementById('content').innerHTML = '<p>Lỗi tải nội dung. Hãy kiểm tra backend (cổng 8000).</p>';
  }
})();
