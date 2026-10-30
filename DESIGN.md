# DSH Visuals

An independently installable plugin that puts explanatory visuals at their authored positions in Harness answers. It wraps the existing assistant slot and delegates ordinary content to its captured renderer; it does not patch Harness or copy OpenGhost artwork, layout, styling or animations.

The initial visual vocabulary is metrics, bars, lines, flowcharts, timelines, donuts and steps. Descriptions use `visual` fences, with the full local Mermaid 12.1 engine and ZenUML available through mermaid fences. Source text remains in the session log. Edits are local previews, never rewrites of the conversation. Malformed custom visuals remain native code; invalid Mermaid displays a syntax error and its source.

The visual language is an annotation sheet: small left-aligned titles, generous space around data, muted axes, direct labels and restrained surfaces. Colours: blue #3976e8, teal #13998d, amber #c68a22, violet #8873ca, rose #c86883. Native host text and background tokens set the light/dark foundation. Series also have names, symbols or dash patterns so colour is not the only identifier. Charts expose a data table. Controls have keyboard focus and all graphics have accessible titles/descriptions. Reduced motion disables transitions.

Inline visuals have source/copy/SVG controls. A gallery in the installed plugin panel lets the user inspect the design without spending model tokens. A standalone preview uses the same components for browser verification.

Validation covers finite values and negative/zero ranges, hostile text, incomplete fences, unsupported blocks, slot late registration and disposal, source validation, export, light/dark and narrow viewports, and a real Loader composition. No remote fonts, scripts, media or runtime dependencies are fetched by the browser.

## Refinement — 2026-10-11

Simple charts use the panel's measured content width. Narrow bars put labels above their shared scale; timelines, steps and donut legends reflow vertically. Dense flow diagrams preserve their scrollable geometry. The surface follows native host colors, with a small title, quiet controls and a separated data disclosure.

A visible chart reveals once in 280 ms. Bar fills grow from the shared zero baseline over 420 ms, with short staggered delays. Streaming updates, focus and source disclosure do not replay the reveal. Opening source has a short opacity transition; loading Mermaid has a small spinner. All motion respects reduced-motion preferences, and active Web Animations are canceled on disposal. SVG exports retain final geometry even during a reveal.

Source controls expose expanded state, focus the editor and restore focus on Escape, Cancel and Apply. Mermaid export is disabled until sanitized SVG is ready. The model guide preserves native LaTeX, including \boxed{...}, and keeps equations in Markdown math delimiters outside visual fences. Existing saved conversations are not rewritten.
