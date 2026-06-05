/**
 * renderDiscordMarkdown.tsx
 * Renders Discord-flavored Markdown as styled React elements.
 *
 * Supported elements:
 *   Block-level:
 *     # H1 / ## H2 / ### H3 / -# subtext
 *     > Blockquote (stacked)
 *     ```lang\ncode\n``` — fenced code blocks
 *     `inline code`
 *     - / * / + unordered lists
 *     1. / 2. ordered lists
 *     --- / *** / ___ horizontal rules
 *     [text](url) links
 *     blank lines → spacing
 *
 *   Inline (parsed within any text segment):
 *     **bold**  *italic*  __underline__  ~~strikethrough~~
 *     ||spoiler||  `code`  [text](url)
 */

import React from 'react';

/* ─────────────────────────────────────────────
   Inline renderer
────────────────────────────────────────────── */
function renderInline(str: string, keyPrefix: string): React.ReactNode[] {
  // Combined inline regex (order matters)
  const INLINE_RE = /(\|\|.*?\|\||\*\*.*?\*\*|__.*?__|~~.*?~~|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`|\[([^\]]+)\]\((https?:\/\/[^)]+)\))/g;

  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_RE.exec(str)) !== null) {
    if (match.index > last) {
      parts.push(str.slice(last, match.index));
    }

    const raw = match[0];
    const k = `${keyPrefix}-${match.index}`;

    if (raw.startsWith('**') && raw.endsWith('**')) {
      parts.push(<strong key={k} className="text-oro font-black">{renderInline(raw.slice(2, -2), k)}</strong>);
    } else if ((raw.startsWith('*') && raw.endsWith('*') && !raw.startsWith('**')) ||
               (raw.startsWith('_') && raw.endsWith('_') && !raw.startsWith('__'))) {
      parts.push(<em key={k} className="italic text-gris-texto/90">{renderInline(raw.slice(1, -1), k)}</em>);
    } else if (raw.startsWith('__') && raw.endsWith('__')) {
      parts.push(<span key={k} className="underline decoration-oro/60">{renderInline(raw.slice(2, -2), k)}</span>);
    } else if (raw.startsWith('~~') && raw.endsWith('~~')) {
      parts.push(<span key={k} className="line-through text-gris-texto/50">{renderInline(raw.slice(2, -2), k)}</span>);
    } else if (raw.startsWith('||') && raw.endsWith('||')) {
      parts.push(
        <span
          key={k}
          title="Spoiler — pasar el cursor para ver"
          className="bg-oro/10 text-transparent hover:text-gris-texto hover:bg-transparent transition-all cursor-pointer rounded select-none px-1 border border-oro/20"
        >
          {raw.slice(2, -2)}
        </span>
      );
    } else if (raw.startsWith('`') && raw.endsWith('`') && !raw.startsWith('```')) {
      parts.push(
        <code key={k} className="bg-black/60 text-oro/90 font-mono text-[0.85em] px-2 py-0.5 rounded border border-oro/10">
          {raw.slice(1, -1)}
        </code>
      );
    } else if (raw.startsWith('[')) {
      // [text](url)
      const linkText = match[2];
      const url = match[3];
      parts.push(
        <a
          key={k}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-oro underline decoration-oro/40 hover:decoration-oro transition-all"
        >
          {linkText}
        </a>
      );
    } else {
      parts.push(raw);
    }

    last = match.index + raw.length;
  }

  if (last < str.length) parts.push(str.slice(last));
  return parts;
}

/* ─────────────────────────────────────────────
   Block-level parser
────────────────────────────────────────────── */
export function renderDiscordMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // ── Fenced code block ```lang\n...\n```
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} className="relative my-4">
          {lang && (
            <span className="absolute top-0 right-0 px-3 py-1 text-caption font-black uppercase tracking-widest text-oro/40 bg-black/60 border-l border-b border-oro/10">
              {lang}
            </span>
          )}
          <pre className="bg-black/70 border border-oro/10 text-oro/80 font-mono text-sm p-5 overflow-x-auto whitespace-pre leading-relaxed" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
            <code>{codeLines.join('\n')}</code>
          </pre>
        </div>
      );
      i++; // skip closing ```
      continue;
    }

    // ── Horizontal rule --- / *** / ___
    if (/^(\*{3,}|-{3,}|_{3,})\s*$/.test(line)) {
      nodes.push(<hr key={i} className="border-none h-px bg-gradient-to-r from-transparent via-oro/30 to-transparent my-8" />);
      i++;
      continue;
    }

    // ── Headings  # ## ### -#
    if (line.startsWith('-# ')) {
      nodes.push(
        <p key={i} className="text-xs text-gris-texto/40 uppercase tracking-widest mt-2 mb-1">
          {renderInline(line.slice(3), `${i}`)}
        </p>
      );
      i++; continue;
    }
    if (line.startsWith('### ')) {
      nodes.push(
        <h3 key={i} className="text-xl sm:text-2xl font-bold text-oro/80 uppercase tracking-wider mb-3 mt-6">
          {renderInline(line.slice(4), `${i}`)}
        </h3>
      );
      i++; continue;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <h2 key={i} className="text-2xl sm:text-3xl font-black text-oro/90 uppercase tracking-widest mb-4 mt-8 border-b border-oro/10 pb-2">
          {renderInline(line.slice(3), `${i}`)}
        </h2>
      );
      i++; continue;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <h1 key={i} className="text-3xl sm:text-4xl font-ninja text-oro uppercase tracking-widest mb-6 mt-10 first:mt-0 border-b border-oro/20 pb-3">
          {renderInline(line.slice(2), `${i}`)}
        </h1>
      );
      i++; continue;
    }

    // ── Blockquote (multi-line stacked)
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={i} className="border-l-4 border-oro/50 pl-5 my-4 bg-oro/5 py-3 pr-4 italic text-gris-texto/80" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}>
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="mb-1 last:mb-0">{renderInline(ql, `${i}-q-${qi}`)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // ── Unordered list (- / * / +)
    if (/^(\s*[-*+] )/.test(line)) {
      const listItems: React.ReactNode[] = [];
      while (i < lines.length && /^(\s*[-*+] )/.test(lines[i])) {
        const itemText = lines[i].replace(/^\s*[-*+] /, '');
        listItems.push(
          <li key={i} className="flex items-start gap-3 mb-2">
            <span className="mt-2 w-1.5 h-1.5 bg-oro/60 rotate-45 flex-shrink-0" />
            <span>{renderInline(itemText, `${i}`)}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="my-3 space-y-1 pl-1">{listItems}</ul>);
      continue;
    }

    // ── Ordered list (1. 2. etc.)
    if (/^\d+\. /.test(line)) {
      const listItems: React.ReactNode[] = [];
      let num = 1;
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\. /, '');
        listItems.push(
          <li key={i} className="flex items-start gap-3 mb-2">
            <span className="flex-shrink-0 w-6 h-6 bg-oro/10 border border-oro/20 text-oro text-caption font-black flex items-center justify-center ninja-clip-sm">
              {num++}
            </span>
            <span>{renderInline(itemText, `${i}`)}</span>
          </li>
        );
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="my-3 space-y-1 pl-1">{listItems}</ol>);
      continue;
    }

    // ── Blank line → spacer
    if (!line.trim()) {
      nodes.push(<div key={i} className="h-3" />);
      i++;
      continue;
    }

    // ── Normal paragraph
    nodes.push(
      <p key={i} className="mb-3 last:mb-0 leading-relaxed">
        {renderInline(line, `${i}`)}
      </p>
    );
    i++;
  }

  return <>{nodes}</>;
}
