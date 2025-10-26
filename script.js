// Simple client-only Shelfie that queries Google Books API for recommendations.
// No API key required for basic searches (Google Books has quotas; for heavy usage add an API key).
// This code also includes a tiny parser for inputs like:
// "books by j.k. rowling", "recommend mystery books", "give me books about AI"

const chatEl = document.getElementById('chat');
const form = document.getElementById('inputForm');
const input = document.getElementById('userInput');

function appendMessage(text, from='bot', html=false){
  const div = document.createElement('div');
  div.className = from === 'bot' ? 'message bot-message' : 'message user-message';
  if(html) div.innerHTML = text; else div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// When showing books, we will create a structured element
function appendBookResults(books){
  const container = document.createElement('div');
  container.className = 'book-list';
  if(!books || books.length === 0){
    const no = document.createElement('div');
    no.className = 'bot-message message';
    no.textContent = "I couldn't find books for that query. Try another author or genre.";
    chatEl.appendChild(no);
    chatEl.scrollTop = chatEl.scrollHeight;
    return;
  }
  books.forEach(item => {
    const meta = item.volumeInfo || {};
    const itemEl = document.createElement('div');
    itemEl.className = 'book-item';

    const img = document.createElement('img');
    img.className = 'book-thumb';
    img.src = (meta.imageLinks && meta.imageLinks.thumbnail) ? meta.imageLinks.thumbnail : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="68"><rect width="100%" height="100%" fill="%23022a3c"/></svg>';
    img.alt = meta.title || 'cover';

    const metaEl = document.createElement('div');
    metaEl.className = 'book-meta';

    const title = document.createElement('div');
    title.className = 'book-title';
    title.textContent = meta.title || 'Untitled';

    const auth = document.createElement('div');
    auth.className = 'book-auth';
    auth.textContent = (meta.authors && meta.authors.join(', ')) || 'Unknown author';

    const desc = document.createElement('div');
    desc.className = 'book-desc';
    desc.textContent = (meta.description && meta.description.substring(0,180) + (meta.description.length>180?'...':'')) || '';

    metaEl.appendChild(title);
    metaEl.appendChild(auth);
    if(desc.textContent) metaEl.appendChild(desc);

    itemEl.appendChild(img);
    itemEl.appendChild(metaEl);
    container.appendChild(itemEl);
  });

  const wrapper = document.createElement('div');
  wrapper.className = 'bot-message message';
  wrapper.appendChild(container);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

// Basic natural-language parsing for user prompt
function parseQuery(text){
  const lower = text.toLowerCase().trim();
  // detect "books by <author>"
  let authorMatch = lower.match(/books?\s+by\s+(.+)/) || lower.match(/by\s+(.+)/);
  if(authorMatch){
    const author = authorMatch[1].trim();
    return {type:'author', q: author};
  }
  // detect genre/recommend
  let genreMatch = lower.match(/(recommend|suggest).*(books|novels|reads|titles)|(best|top)\s+([a-z ]+)\s+(books|novels)/);
  if(genreMatch){
    // try to capture genre word
    const g = lower.match(/(mystery|romance|fantasy|science fiction|sci[- ]?fi|thriller|self[- ]?help|ai|machine learning|history|biography|romance|horror|fiction|non[- ]fiction|young adult|ya)/);
    if(g) return {type:'genre', q: g[0]};
  }
  // fallback: treat input as general search
  return {type:'search', q: text};
}

// Query Google Books API
async function searchBooks(query, maxResults = 6){
  const q = encodeURIComponent(query);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=${maxResults}`;
  try{
    const res = await fetch(url);
    if(!res.ok) return [];
    const data = await res.json();
    return data.items || [];
  }catch(e){
    console.error(e);
    return [];
  }
}

async function handleUserText(text){
  appendMessage(text, 'user');
  appendMessage('Searching for books...');

  const parsed = parseQuery(text);
  let results = [];

  if(parsed.type === 'author'){
    // search by author
    results = await searchBooks(`inauthor:${parsed.q}`);
  } else if(parsed.type === 'genre'){
    results = await searchBooks(parsed.q + '+books');
  } else {
    // generic search
    results = await searchBooks(parsed.q);
  }

  // clear the "Searching" message (simpler: append results after)
  // Instead of removing messages, just append results.
  appendBookResults(results);
  appendMessage("You're welcome! 📚 Would you like more recommendations or save these?", 'bot');
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  const t = input.value.trim();
  if(!t) return;
  input.value = '';
  await handleUserText(t);
});

// Optional: enter to send
input.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' && !e.shiftKey){
    e.preventDefault();
    form.requestSubmit();
  }
});
