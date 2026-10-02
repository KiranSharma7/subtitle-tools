---
name: scannable-interface-design
description: "Design and review product interfaces for hard alignment, fast scanning, meaningful density, clear hierarchy, visual cues, and low container clutter."
---

# Scannable Interface Design

Use this skill when designing, reviewing, or implementing a product interface such as a dashboard, settings screen, form, list, table, file browser, or workflow. Optimize for how quickly a user can find the needed answer or action. Apply the guidance proportionally to the interface and the user's stated goals; do not force every pattern into every screen.

## Working method

1. **Identify the scan task.** State what the user is likely looking for, what deserves attention first, and which items repeat. Preserve the product's content and interaction requirements while improving their presentation.

2. **Lay down structural edges.** Look for a small number of strong anchors: left and right text columns, top and bottom baselines, section headers, or a deliberate inner edge. Align repeated labels, values, controls, avatars, and actions to those anchors. Use grid or flex layout with explicit columns and gaps when implementing. Avoid centering body content merely because it leaves equal margins, and avoid stretched controls that have no relationship to neighboring edges.

3. **Build predictable repetition.** Make each row, checklist item, table entry, or card expose the same useful edges so the next item can stack onto it. Keep variable content inside stable columns or slots. When grouping helps recognition, use categories, tags, due dates, or other meaningful separators rather than arbitrary whitespace.

4. **Tune information density.** Remove whitespace that only increases scrolling. Add space when it separates real groups or protects a primary action. Break up long, visually identical runs with meaningful variation such as avatars, status chips, icons, metadata, or section labels. Keep density high enough to support scanning while preserving readable type, touch targets, and clear grouping.

5. **Prefer recognizable visual cues.** When a familiar icon, color, badge, diagram, or small visual summary communicates faster than prose, use it. Keep labels for ambiguous or unfamiliar actions, and never make color the only way to perceive state. Provide accessible names and text alternatives where needed.

6. **Create relative hierarchy.** Reserve the strongest contrast and accent color for the active state, a change that needs attention, or the primary call to action. Keep default, inactive, and supporting states neutral or muted. Check the whole screen: if every chip, button, or label is loud, nothing has emphasis.

7. **Dissolve unnecessary containers.** Treat the page grid, alignment, spacing, and subtle dividers as structure. Remove card-in-card nesting, repeated rounded corners, and borders that do not clarify grouping. Keep a container when it gives a real boundary, interaction target, or semantic group; otherwise let the content sit directly in the grid.

## Review pass

Before presenting a design or code change, run a short scan test:

- Can a user find the main answer or action in a quick glance?
- Do repeated rows share the same left, right, and baseline anchors?
- Are groups distinguished by meaning rather than accidental gaps?
- Is the strongest visual treatment reserved for the state that needs it?
- Can icons, color, and badges be understood without guessing, and are they accessible?
- Does each border, radius, and wrapper clarify a relationship?
- Does the layout still work with long labels, missing avatars, empty states, and narrow widths?

When reporting recommendations, tie each change to scan speed, grouping, hierarchy, or interaction clarity. If implementing UI, make the structural decisions visible in the layout rather than compensating with decorative borders or extra explanatory copy.
