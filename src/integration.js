const SLOT = 'conversation.chat.node';
/** Own a reversible shadow registration; never dispose or mutate the native entry. */
export function installAssistantWrapper(ctx, makeWrapper) {
  ctx.effect(() => {
    let current, dispose, busy = false, closed = false;
    const reconcile = () => {
      if (busy || closed) return;
      busy = true;
      try {
        const candidates = ctx.slots.entries(SLOT).filter(e => e.options.key === 'assistant-step' && e.component !== current?.wrapper);
        const native = candidates.sort((a, b) => (a.options.priority || 0) - (b.options.priority || 0))[0];
        if (native === current?.native) return;
        dispose?.(); dispose = undefined; current = undefined;
        if (!native || native.children || native.store) return;
        const wrapper = makeWrapper(native.component);
        current = { native, wrapper };
        dispose = ctx.slots.register({ name: SLOT, key: 'assistant-step',
          priority: (native.options.priority || 0) - 1, locale: native.locale,
          ...(native.inject ? { inject: native.inject } : {}),
        }, wrapper);
      } catch (error) {
        current = undefined;
        console.warn('[dsh-visuals] Inline rendering unavailable; the native chat renderer remains active.', error);
      } finally { busy = false; }
    };
    const unsubscribe = ctx.slots.subscribe(SLOT, reconcile);
    reconcile();
    return () => { closed = true; unsubscribe(); dispose?.(); };
  });
}
