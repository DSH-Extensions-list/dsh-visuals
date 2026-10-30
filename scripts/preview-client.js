import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { VisualFigure } from '../src/view.js';
import { examples } from '../src/examples.js';
import { diagramExamples } from '../src/diagram-examples.js';
import css from '../src/style.css';
const h = React.createElement;
const style = document.createElement('style');
style.textContent = css + `body{margin:0;background:#f5f7fb;color:#243044;font-family:system-ui,sans-serif}main{max-width:860px;padding:48px 24px;margin:0 auto}.preview-toolbar{display:flex;align-items:center;gap:12px;margin-bottom:32px}.preview-toolbar h1{flex:1;font-size:29px;letter-spacing:-.9px;font-weight:600;margin:0}.preview-toolbar button{border:1px solid #c6cfdd;background:transparent;color:inherit;border-radius:6px;padding:8px 12px;cursor:pointer}body[data-theme=dark]{background:#171c25;color:#e6edf6;--dsw-alias-bg-layer-1:#202733;--dsw-alias-label-primary:#e6edf6;--dsw-alias-label-secondary:#a2afc2;--dsw-alias-border-l2:#354052;--dsw-alias-interactive-bg-hover:#2b3443}main>p{font-size:14px;color:#76849a;margin-bottom:35px}.dv-figure{margin-bottom:30px}@media(max-width:500px){main{padding:24px 12px}.preview-toolbar h1{font-size:23px}}`;
document.head.append(style);
function Preview() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => { document.body.dataset.theme = dark ? 'dark' : 'light'; }, [dark]);
  return h(React.Fragment, null, h('header', { className: 'preview-toolbar' }, h('h1', null, 'DSH Visuals'), h('button', { onClick: () => setDark(!dark) }, dark ? 'Light theme' : 'Dark theme')),
    h('p', null, 'An original visual language for explanations, comparisons and plans. All data in this gallery is illustrative.'),
    [...examples, ...diagramExamples].map(item => h(VisualFigure, { key: item.name, source: item.source, language: item.language })));
}
createRoot(document.getElementById('root')).render(h(Preview));
