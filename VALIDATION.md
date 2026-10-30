# Validation — 7 October 2026

## Verified

- `npm test`: 15 passing tests. Coverage includes signed/zero numeric ranges, bounded inputs, source routing, closed streaming fences, literal hostile labels, cross-segment link definitions, native content preservation, slot late registration/disposal, diagram sanitization, SVG serialization and actual prebuilt factory activation/disposal.
- `npm run build`: standalone Harness module-loader factory generated successfully. React is supplied by the host; other browser dependencies are bundled. The archive includes third-party license texts in `lib/licenses` and linked bundle notices.
- `npm run test:composition`: real installed Harness YAML Loader activated/disposed the system-prompt guide in an isolated fixture. Real Cordis ownership and SlotCore correctly shadowed and restored the native assistant slot. This check uses built Cordis directly because the source checkout currently contains unrelated Cordis test stubs; no live application files were changed.
- Browser gallery: all seven custom designs and 21 Mermaid examples produced SVG, with zero errors and zero pending renderers. Sequence, ER, state, class, mind map, Gantt, journey, quadrant, requirements, Git, grouped flow, C4, Sankey, XY, blocks, packet, Kanban, architecture, radar, treemap and ZenUML were exercised.
- Preview source editing applied a changed title/value; Reset restored the original. Invalid numeric source showed an error and preserved the original graphic. The expanded data table showed exact source values.
- Light and dark designs visually inspected. Mermaid's natural dimensions were preserved after correcting an over-scaling issue. At a 390px viewport, the document stayed within its viewport and metrics stacked vertically; dense charts retain local horizontal scrolling.
- SVG serializer checked for valid XML, original viewBox, concrete dimensions, resolved background, typography, labels and removal of keyboard-only attributes.
- Dependency audit: zero known vulnerabilities. Mermaid's transitive KaTeX is pinned to patched 0.18.2. DOMPurify is pinned to 3.4.16. Reproduce with the lockfile.
- Installation helper dry-run against the installed desktop refused a busy host, as intended.

Screenshots from the browser are saved in `artifacts/gallery-light.png`, `gallery-dark.png`, `gallery-diagrams.png` and `gallery-narrow.png` in the development checkout. The preview uses the same graphics components as the plugin; screenshots are not evidence of live Harness installation.

## Not yet verified

The plugin has not been added to the live Desktop profile or tested in a real model-generated conversation. Harness was running agents throughout verification. Its source CLI also currently fails module resolution against unrelated Cordis stubs in that checkout; installation should use a working installation-owned CLI after that work is complete.

The in-app browser did not report a download event from either SVG export attempt. Serialization is tested, and the browser click did not show an export error, but native Desktop download delivery and clipboard delivery still need a live host check. Source copy reported success in the preview; the browser connector's separate clipboard reader did not return its contents.

No Harness source files, running agent state or live profile metadata were changed. No GitHub repository or marketplace listing was published.
