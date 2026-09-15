/**
 * Minimal, safe Markdown → HTML for the in-CRM preview only. Adapted from
 * gifftai_official_web's admin blog page. The canonical render (react-markdown +
 * remark-gfm + rehype-sanitize) lives on the public site — this is a lightweight
 * approximation so an editor can eyeball structure before publishing.
 *
 * `<` and `&` and `"` are escaped up front, so no author-supplied markup can reach the
 * DOM — only the fixed set of tags this function emits. (`>` is deliberately left
 * unescaped: harmless as text without a matching `<`, and needed to detect blockquotes.)
 *
 * Supports: `#`–`######` headings, `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``,
 * `[links](url)`, `>` blockquotes, `-`/`*` and `1.` lists, `---` rules, ``` fenced code,
 * and GFM pipe tables.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

function inline(t: string): string {
  return t
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/~~([^~]+)~~/g, "<del>$1</del>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+|\/[^\s)]*)\)/g,
      '<a href="$2" target="_blank" rel="noreferrer">$1</a>',
    );
}

const isTableRow = (l: string) => /^\s*\|.*\|\s*$/.test(l);
const isTableDivider = (l: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(l) && l.includes("-");

function renderTable(rows: string[]): string {
  const cells = (l: string) =>
    l
      .trim()
      .replace(/^\||\|$/g, "")
      .split("|")
      .map((c) => c.trim());
  const head = cells(rows[0]!);
  const body = rows.slice(2).map(cells);
  const thead = `<thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead>`;
  const tbody = `<tbody>${body
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody>`;
  return `<table>${thead}${tbody}</table>`;
}

export function renderMarkdownPreview(md: string): string {
  const lines = escapeHtml(md || "")
    .replace(/\r\n/g, "\n")
    .split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.trim().startsWith("```")) {
      flushPara();
      closeLists();
      out.push(inCode ? "</pre>" : "<pre>");
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(line);
      continue;
    }

    if (!line.trim()) {
      flushPara();
      closeLists();
      continue;
    }

    // GFM pipe table: a header row, a `---|---` divider, then body rows.
    if (isTableRow(line) && lines[i + 1] && isTableDivider(lines[i + 1]!)) {
      flushPara();
      closeLists();
      const block: string[] = [line, lines[i + 1]!];
      let j = i + 2;
      while (j < lines.length && isTableRow(lines[j]!)) block.push(lines[j++]!);
      out.push(renderTable(block));
      i = j - 1;
      continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara();
      closeLists();
      // Level as written, matching react-markdown on the public site (`#`→h1, `##`→h2…).
      // The post title is already the page h1, so use `##` / `###` in the body.
      const lvl = h[1]!.length;
      out.push(`<h${lvl}>${inline(h[2]!)}</h${lvl}>`);
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      flushPara();
      closeLists();
      out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (/^\s*([-*])\s+/.test(line)) {
      flushPara();
      if (!inUl) {
        closeLists();
        out.push("<ul>");
        inUl = true;
      }
      out.push(`<li>${inline(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      flushPara();
      if (!inOl) {
        closeLists();
        out.push("<ol>");
        inOl = true;
      }
      out.push(`<li>${inline(line.replace(/^\s*\d+\.\s+/, ""))}</li>`);
      continue;
    }
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      flushPara();
      closeLists();
      out.push("<hr />");
      continue;
    }
    para.push(line.trim());
  }
  flushPara();
  closeLists();
  if (inCode) out.push("</pre>");
  return out.join("\n");
}

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}
