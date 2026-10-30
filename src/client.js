import * as React from 'react';
import css from './style.css';
import { installAssistantWrapper } from './integration.js';
import { VisualFigure, makeAssistantWrapper, en, zh } from './view.js';
import { examples } from './examples.js';
import { diagramExamples } from './diagram-examples.js';
const h = React.createElement;
export const inject = ['slots', 'locale'];
export function apply(ctx) {
  ctx.effect(() => { const style = document.createElement('style'); style.dataset.plugin = '@local/dsh-visuals'; style.textContent = css; document.head.append(style); return () => style.remove(); });
  ctx.effect(() => ctx.locale.register('dsh-visuals', { en, zh }));
  const bound = ctx.locale.bind('dsh-visuals');
  const subscribe = callback => ctx.locale.subscribe(callback), snapshot = () => ctx.locale.getSnapshot().revision;
  function useTranslate() { React.useSyncExternalStore(subscribe, snapshot, snapshot); return bound; }
  installAssistantWrapper(ctx, Native => makeAssistantWrapper(Native, useTranslate));
  function Gallery() {
    const t = useTranslate(), [selected, setSelected] = React.useState(0);
    const gallery = [...examples, ...diagramExamples];
    return h('section', { className: 'dv-gallery' }, h('h2', null, t('gallery')), h('p', null, t('galleryIntro')),
      h('nav', { className: 'dv-gallery-nav', 'aria-label': t('gallery') }, gallery.map((item, i) => h('button', { key: item.name, onClick: () => setSelected(i), 'aria-pressed': selected === i }, item.name))),
      h(VisualFigure, { key: selected, source: gallery[selected].source, language: gallery[selected].language, t }));
  }
  ctx.slots.inject('plugins.bundle.config', () => ctx.slots.register({ name: 'plugins.bundle.config', key: '@local/dsh-visuals', locale: 'dsh-visuals' }, Gallery));
}
