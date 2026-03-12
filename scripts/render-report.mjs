import fs from "fs";
import path from "path";
import { marked } from "marked";

const [,, inputPath, outputPath] = process.argv;

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/render-report.mjs <input.md> <output.html>");
  process.exit(1);
}

const md = fs.readFileSync(inputPath, "utf8");

const slugify = (text) => text
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, "")
  .replace(/\s+/g, "-")
  .replace(/-+/g, "-");

const headings = [];
const renderer = {
  heading(text, level) {
    const slug = slugify(text);
    headings.push({ level, text, slug });
    return `<h${level} id=\"${slug}\">${text}</h${level}>`;
  }
};

marked.setOptions({
  gfm: true,
  breaks: false,
});
marked.use({ renderer });

const bodyHtml = marked.parse(md);

const tocItems = headings
  .filter(h => h.level === 2 || h.level === 3)
  .map(h => {
    const indent = h.level === 3 ? "pl-4" : "";
    return `<li class=\"${indent}\"><a href=\"#${h.slug}\">${h.text}</a></li>`;
  })
  .join("\n");

const tocHtml = `
  <div class=\"toc-card\">
    <div class=\"toc-title\">Contents</div>
    <ul class=\"toc-list\">${tocItems}</ul>
  </div>
`;

const pageTitle = headings.find(h => h.level === 1)?.text ?? "Report";

const html = `<!doctype html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>${pageTitle}</title>
    <script src=\"https://cdn.tailwindcss.com\"></script>
    <style>
      :root { color-scheme: light; }
      body {
        font-family: "Georgia", "Times New Roman", Times, serif;
        background: #f7f4ee;
        color: #111;
      }
      .wsj-page {
        min-height: 100vh;
        background: #f7f4ee;
      }
      .wsj-container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 2.5rem 1rem 4rem;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: 1.25rem;
        align-items: start;
      }
      @media (min-width: 1024px) {
        .wsj-container {
          grid-template-columns: 240px minmax(0, 1fr);
          align-items: start;
        }
      }
      .masthead {
        border-bottom: 1px solid #111;
        padding-bottom: 0.75rem;
        margin-bottom: 1.25rem;
      }
      .kicker {
        text-transform: uppercase;
        font-size: 0.8rem;
        letter-spacing: 0.16em;
        color: #444;
      }
      .lede {
        font-size: 1.05rem;
        color: #222;
        margin-top: 0.3rem;
      }
      h1, h2, h3, h4 {
        font-family: "Times New Roman", Times, serif;
        letter-spacing: 0.2px;
      }
      h1 { font-size: 2.6rem; line-height: 1.1; margin-bottom: 0.5rem; }
      h2 {
        font-size: 2.1rem;
        margin: 3.6rem 0 1.4rem;
        padding: 0.85rem 1rem;
        background: #f0ece4;
        border-left: 6px solid #111;
        border-top: 2px solid #111;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      h3 {
        font-size: 1.5rem;
        margin: 2.4rem 0 1.1rem;
        padding-left: 0.7rem;
        border-left: 4px solid #111;
        font-weight: 800;
      }
      p { line-height: 1.75; font-size: 0.95rem; margin: 0.8rem 0 1.2rem; }
      pre {
        background: #f1eee7;
        color: #111;
        padding: 0.85rem 1rem;
        border-radius: 6px;
        overflow-x: auto;
        border: 1px solid #e1ddd3;
      }
      code {
        font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.95rem;
      }
      ul { list-style: disc; margin-left: 1.5rem; line-height: 1.7; }
      ol { list-style: decimal; margin-left: 1.5rem; line-height: 1.7; }
      blockquote {
        border-left: 3px solid #111;
        padding: 0.6rem 0.9rem;
        color: #333;
        margin: 1.1rem 0;
        background: #f5f1e9;
      }
      a { color: #111; text-decoration: underline; }
      hr { border: none; border-top: 1px solid #111; margin: 2rem 0; }
      .toc-wrap {
        position: sticky;
        top: 0.75rem;
        height: calc(100vh - 1.5rem);
        align-self: start;
      }
      .toc-card {
        background: #fff;
        border: 1px solid #e1ddd3;
        border-radius: 6px;
        padding: 0.9rem 1rem;
        box-shadow: 0 1px 0 rgba(0,0,0,0.03);
        height: 100%;
        overflow-y: auto;
      }
      .toc-title {
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #333;
        margin-bottom: 0.5rem;
      }
      .toc-list { list-style: none; padding-left: 0; margin-left: 0; }
      .toc-list li { margin: 0.3rem 0; }
      .toc-list a { text-decoration: none; color: #333; }
      .toc-list a:hover { text-decoration: underline; }
      .content-card {
        background: #fff;
        border: 1px solid #e1ddd3;
        border-radius: 8px;
        padding: 2rem 2.25rem 2.5rem;
        box-shadow: 0 1px 0 rgba(0,0,0,0.03);
      }
      .content-card > h2 { scroll-margin-top: 1.5rem; }
      .content-card h2:first-of-type { margin-top: 2.6rem; }
      .content-card h2 + h3 { margin-top: 1.8rem; }
      .content-card h2 + p { margin-top: 1.2rem; }
      .content-card h2 + ul,
      .content-card h2 + ol { margin-top: 0.8rem; }
      .content-card h2 + * { margin-top: 1.1rem; }
      .content-card h2:not(:first-of-type) { margin-top: 4.2rem; }
      .content-card h3 + p { margin-top: 0.8rem; }
      .content-card h3 + ul,
      .content-card h3 + ol { margin-top: 0.6rem; }
      .content-card h3 + * { margin-top: 0.7rem; }
      .content-card h3:not(:first-of-type) { margin-top: 2.8rem; }
      .hero {
        display: grid;
        gap: 1rem;
        margin: 0.75rem 0 1.25rem;
      }
      @media (min-width: 900px) {
        .hero { grid-template-columns: 1.2fr 1fr; }
      }
      .hero-card {
        background: #f7f4ee;
        border: 1px solid #e1ddd3;
        border-radius: 8px;
        padding: 1rem 1.1rem;
      }
      .stat-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.6rem;
      }
      .stat {
        background: #fff;
        border: 1px solid #e1ddd3;
        border-radius: 6px;
        padding: 0.65rem 0.8rem;
      }
      .stat .label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
      .stat .value { font-size: 1rem; font-weight: 700; color: #111; margin-top: 0.2rem; }
      .callouts {
        display: grid;
        gap: 0.6rem;
        margin: 0.85rem 0 1rem;
      }
      @media (min-width: 900px) {
        .callouts { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      .callout {
        border: 1px solid #e1ddd3;
        border-radius: 6px;
        padding: 0.75rem 0.9rem;
        background: #fff;
      }
      .callout h4 { font-size: 1rem; margin-bottom: 0.35rem; }
      .color-grid {
        display: grid;
        gap: 0.75rem;
        margin: 1.2rem 0 1.2rem;
      }
      @media (min-width: 900px) {
        .color-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      }
      .color-block {
        border-radius: 8px;
        padding: 0.9rem 1rem;
        border: 1px solid #e1ddd3;
      }
      .color-block h4 { font-size: 0.95rem; margin-bottom: 0.35rem; }
      .cb-mint { background: #eaf2ff; }
      .cb-transfer { background: #f5efe0; }
      .cb-compliance { background: #eef7ee; }
      .table {
        width: 100%;
        border-collapse: collapse;
        margin: 0.5rem 0 1rem;
        font-size: 0.95rem;
      }
      .table th, .table td {
        border: 1px solid #e1ddd3;
        padding: 0.5rem 0.65rem;
        text-align: left;
      }
      .table th { background: #f7f4ee; font-weight: 700; }
      @media (max-width: 1023px) { .toc-card { position: static; } }
      @media (max-width: 640px) {
        h1 { font-size: 2.1rem; }
        h2 { font-size: 1.45rem; }
        h3 { font-size: 1.2rem; }
        .content-card { padding: 1.5rem; }
        .stat-grid { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body class=\"wsj-page\">
    <div class=\"wsj-container\">
      <aside class="toc-wrap">
        ${tocHtml}
      </aside>
      <main class=\"content-card\">
        ${bodyHtml}
      </main>
    </div>
  </body>
</html>`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, html, "utf8");

console.log(`Rendered ${inputPath} -> ${outputPath}`);
