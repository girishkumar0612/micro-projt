// Minimal, safe markdown → HTML renderer for assistant messages.
// Supports: headings, bold, italic, inline code, bullet lists, numbered lists,
// blockquotes, tables, and paragraphs. No raw HTML is passed through.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  // bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>');
  // inline code
  out = out.replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded-md bg-surface-100 dark:bg-surface-800 text-brand-700 dark:text-brand-300 font-mono text-[0.85em]">$1</code>');
  return out;
}

export function renderMarkdown(md: unknown): string {
  // Never trust the backend: coerce to a string so malformed JSON can't crash the UI.
  if (typeof md !== 'string') {
    if (md === null || md === undefined) return '';
    try {
      return escapeHtml(String(md));
    } catch {
      return '';
    }
  }
  const lines = md.split('\n');
  const html: string[] = [];
  let i = 0;
  let inList: 'ul' | 'ol' | null = null;
  let tableBuffer: string[][] | null = null;

  const flushList = () => {
    if (inList) {
      html.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  const flushTable = () => {
    if (!tableBuffer) return;
    const [header, ...rows] = tableBuffer;
    html.push('<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">');
    html.push('<thead><tr>');
    for (const h of header) {
      html.push(`<th class="text-left font-semibold px-3 py-2 border-b border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200">${inline(h)}</th>`);
    }
    html.push('</tr></thead><tbody>');
    for (const row of rows) {
      html.push('<tr>');
      for (const cell of row) {
        html.push(`<td class="px-3 py-2 border-b border-surface-100 dark:border-surface-800 text-surface-600 dark:text-surface-300">${inline(cell)}</td>`);
      }
      html.push('</tr>');
    }
    html.push('</tbody></table></div>');
    tableBuffer = null;
  };

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const cells = line.split('|').slice(1, -1).map((c) => c.trim());
      // separator row?
      if (i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1].trim())) {
        tableBuffer = [cells];
        i += 2;
        while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
          tableBuffer.push(lines[i].split('|').slice(1, -1).map((c) => c.trim()));
          i++;
        }
        flushList();
        flushTable();
        continue;
      }
    }

    // Headings
    if (/^#{1,3}\s/.test(line)) {
      flushList();
      const level = line.match(/^(#{1,3})/)?.[1].length ?? 2;
      const text = line.replace(/^#{1,3}\s/, '');
      const cls =
        level === 1
          ? 'text-lg font-bold mt-4 mb-2 text-surface-900 dark:text-surface-50'
          : level === 2
            ? 'text-base font-semibold mt-3 mb-1.5 text-surface-900 dark:text-surface-50'
            : 'text-sm font-semibold mt-2 mb-1 text-surface-800 dark:text-surface-100';
      html.push(`<h${level} class="${cls}">${inline(text)}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith('> ')) {
      flushList();
      const text = line.replace(/^\s*>\s?/, '');
      html.push(`<blockquote class="border-l-2 border-brand-400 pl-3 my-2 text-surface-600 dark:text-surface-400 italic">${inline(text)}</blockquote>`);
      i++;
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(line)) {
      if (inList !== 'ul') {
        flushList();
        html.push('<ul class="list-disc pl-5 my-2 space-y-1 text-surface-700 dark:text-surface-300">');
        inList = 'ul';
      }
      const text = line.replace(/^\s*[-*]\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
      i++;
      continue;
    }

    // Numbered list
    if (/^\s*\d+\.\s+/.test(line)) {
      if (inList !== 'ol') {
        flushList();
        html.push('<ol class="list-decimal pl-5 my-2 space-y-1 text-surface-700 dark:text-surface-300">');
        inList = 'ol';
      }
      const text = line.replace(/^\s*\d+\.\s+/, '');
      html.push(`<li>${inline(text)}</li>`);
      i++;
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      flushList();
      i++;
      continue;
    }

    // Paragraph
    flushList();
    html.push(`<p class="my-1.5 leading-relaxed text-surface-700 dark:text-surface-300">${inline(line)}</p>`);
    i++;
  }

  flushList();
  flushTable();
  return html.join('\n');
}
