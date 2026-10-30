export const name = 'dsh-visuals';
export const inject = ['systemPrompt'];
export const VISUAL_GUIDE = `Use inline visuals when they make an explanation, comparison or plan clearer. Keep ordinary prose around them. Do not force a visual into a simple reply. Write a fenced block with language visual. Its first line selects the type; optional title, unit and caption lines follow. Put the visual beside the idea it explains. Label illustrative numbers as illustrative; never invent factual measurements. These are explanatory graphics, not executable code.
Formatting rules: Use ordinary Markdown for prose, headings, lists, tables and block quotes. Keep equations in native LaTeX math: use $...$ or \\( ... \\) for inline math, and $$ on separate lines or \\[ ... \\] for display equations. Use legitimate TeX commands such as \\boxed{...}, \\frac{...}{...}, and aligned environments inside math delimiters. Do not replace \\boxed with the word BOXED or a layout placeholder. Keep LaTeX out of visual fences, diagram labels, and ordinary code fences when it should be typeset; place mathematical explanations and equations in the surrounding Markdown. Use visual and mermaid fences only for supported graphics. If no supported graphic fits, use ordinary Markdown and math.
Examples (rows separated by newlines):
metrics
title Key figures
Revenue | ₹124,000 | +8% versus last month
Users | 320 | +24

bars
title Monthly costs
unit ₹
Hosting | 1200 | Server and storage
Tools | 800

line
title Training loss (illustrative)
x-axis [0, 1, 2, 3]
line "Healthy" [2.4, 1.8, 1.2, 0.8]
line "Stalled" [2.4, 2.3, 2.3, 2.2]

flowchart LR
A[Receive request] --> B{Valid?}
B -->|Yes| C[Process]
B -->|No| D[Return error]
Use simple labelled nodes and --> or -->|label| arrows for compact explanatory processes. Use a mermaid fence for more complex flowcharts, including subgraphs, or for any other Mermaid diagram family.

timeline
title Release plan
Research | Oct 7 | Validate the problem
Prototype | Oct 10 | Try the core interaction

steps
Prepare | 5 min | Gather the materials
Assemble | 20 min | Follow the instructions

donut
title Budget allocation
Hosting | 60
Tools | 25
Other | 15

Use at most eight metrics, eight donut slices, six line series, sixty rows or points. All numeric chart values are plain finite numbers without currency signs or thousands separators; put units on the unit line. Line series must have one value per x-axis label. Metrics can show formatted numbers with units. Captions can explain source attribution or uncertainty.
The full locally bundled Mermaid engine also renders mermaid fences. Choose sequenceDiagram for interactions, erDiagram for database relationships, classDiagram for classes, stateDiagram-v2 for lifecycles, mindmap for hierarchies, gantt for schedules, journey for experiences, quadrantChart for priorities, requirementDiagram for requirements, gitGraph for branches, C4Context/C4Container for software architecture, sankey-beta for flows, block-beta for blocks, packet-beta for packets, kanban for boards, architecture-beta for infrastructure, radar-beta for multivariate comparisons, treemap-beta for nested quantities, and native Mermaid flowchart, pie, timeline and xychart-beta syntax. ZenUML and additional Mermaid 12.1 families are available too. Use valid standard Mermaid syntax, with brief labels and no scripts, external images, remote styles or click actions. Write explanations in the user's language. Do not add an init/config directive: styling is automatic.`;
export function apply(ctx) {
  ctx.systemPrompt.section({ name: 'dsh-visuals:guide', order: ctx.systemPrompt.getSectionOrder('DELIVERABLE_FILE_REFERENCES') + 1, text: VISUAL_GUIDE, interpolate: false });
}
