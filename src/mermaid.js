import * as React from 'react';
const h = React.createElement;
let enginePromise, renderQueue = Promise.resolve(), sequence = 0;
async function engine() {
  if (!enginePromise) enginePromise = (async () => {
    const [{ default: mermaid }, { default: purify }, { default: zenuml }] = await Promise.all([import('mermaid'), import('dompurify'), import('@mermaid-js/mermaid-zenuml')]);
    await mermaid.registerExternalDiagrams([zenuml]);
    return { mermaid, purify };
  })();
  return enginePromise;
}
/** The app owns configuration. Diagram-authored init/config directives cannot override it. */
export function prepareMermaid(source) {
  return source.replace(/^\s*---\s*\n[\s\S]*?\n---\s*\n/, '').replace(/%%\{[\s\S]*?\}%%/g, '');
}
function hex(value, fallback) {
  const m = /rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/.exec(value);
  return m ? '#' + m.slice(1).map(n => Number(n).toString(16).padStart(2, '0')).join('') : /^#[a-f\d]{6}$/i.test(value) ? value : fallback;
}
export async function validateMermaid(source) {
  const task = renderQueue.then(async () => {
    const { mermaid } = await engine();
    await mermaid.parse(prepareMermaid(source), { suppressErrors: false });
  });
  renderQueue = task.catch(() => {});
  await task;
}
/** No scripts, HTML labels, remote images or diagram-authored network CSS. */
export function sanitizeSVG(purify, source) {
  const safe = purify.sanitize(source, { USE_PROFILES: { svg: true, svgFilters: true }, FORBID_TAGS: ['foreignObject', 'image', 'script', 'a'], FORBID_ATTR: ['onload', 'onclick', 'onerror'] });
  const doc = new DOMParser().parseFromString(safe, 'image/svg+xml');
  if (doc.querySelector('parsererror') || doc.documentElement.localName !== 'svg') throw new Error('The diagram did not produce valid SVG.');
  for (const el of doc.querySelectorAll('*')) {
    for (const attr of [...el.attributes]) {
      if (/^(?:href|xlink:href)$/i.test(attr.name) && !attr.value.startsWith('#')) el.removeAttribute(attr.name);
      if (/url\(\s*['"]?(?!#)/i.test(attr.value)) el.removeAttribute(attr.name);
    }
    if (el.localName === 'style') el.textContent = el.textContent.replace(/@import[^;]*;?/gi, '').replace(/url\(\s*(['"]?)(?!#)[^)]*\)/gi, 'none');
  }
  return doc.documentElement;
}
export function MermaidDiagram({ model, t, onReady }) {
  const root = React.useRef(null), [error, setError] = React.useState(''), [ready, setReady] = React.useState(false), [theme, setTheme] = React.useState(0);
  React.useEffect(() => {
    const observer = new MutationObserver(() => setTheme(v => v + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => {
    let disposed = false;
    setReady(false); setError(''); onReady?.(false);
    const host = root.current;
    const style = getComputedStyle(host.closest('.dv-figure'));
    const ink = hex(style.color, '#243044'), paper = hex(style.backgroundColor, '#ffffff');
    const dark = parseInt(paper.slice(1, 3), 16) < 128;
    const work = async () => {
      if (disposed) return;
      try {
        const { mermaid, purify } = await engine();
        if (disposed) return;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', suppressErrorRendering: true, maxTextSize: 65536, maxEdges: 240,
          htmlLabels: false, fontFamily: style.fontFamily, theme: 'base',
          secure: ['securityLevel', 'startOnLoad', 'maxTextSize', 'maxEdges', 'htmlLabels', 'themeCSS', 'dompurifyConfig'],
          flowchart: { htmlLabels: false, curve: 'basis', padding: 16, nodeSpacing: 30, rankSpacing: 50 },
          themeVariables: { darkMode: dark, background: paper, primaryColor: dark ? '#283a55' : '#edf3ff', primaryTextColor: ink, primaryBorderColor: '#6e94cd',
            secondaryColor: dark ? '#23423e' : '#e8f5f1', tertiaryColor: dark ? '#493d27' : '#fff5e0', lineColor: dark ? '#a2b0c5' : '#7b899d', textColor: ink,
            fontSize: '14px', edgeLabelBackground: paper, clusterBkg: dark ? '#242e3d' : '#f5f8fd', clusterBorder: dark ? '#435069' : '#d6e0f0',
            actorBkg: dark ? '#283a55' : '#edf3ff', actorTextColor: ink, actorBorder: '#6e94cd', signalColor: ink, signalTextColor: ink,
            noteBkgColor: dark ? '#493d27' : '#fff5e0', noteTextColor: ink, noteBorderColor: '#c68a22',
          },
        });
        const { svg } = await mermaid.render('dvmermaid' + (++sequence), prepareMermaid(model.source));
        if (disposed) return;
        const element = sanitizeSVG(purify, svg);
        element.setAttribute('role', 'img'); element.setAttribute('aria-label', model.title || 'Diagram');
        host.replaceChildren(document.importNode(element, true));
        setReady(true); onReady?.(true);
      } catch (cause) { if (!disposed) { host.replaceChildren(); setError(String(cause.message || cause).slice(0, 1600)); } }
    };
    renderQueue = renderQueue.then(work, work);
    return () => { disposed = true; };
  }, [model.source, theme, onReady]);
  return h('div', { className: 'dv-mermaid', 'aria-busy': !ready && !error }, h('div', { ref: root }),
    !ready && !error && h('p', { role: 'status' }, t('rendering')),
    error && h('div', { className: 'dv-mermaid-error', role: 'alert' }, h('p', null, t('diagramError')), h('pre', null, error), h('details', null, h('summary', null, t('source')), h('pre', null, model.source))));
}
