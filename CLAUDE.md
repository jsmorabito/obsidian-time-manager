# Obsidian Time Tools — agent context

This is the working document for AI agents working on `obsidian-time-tools`. Read this before touching any file. General Obsidian plugin conventions live in `AGENTS.md`; this file covers what is specific to this codebase.

---

## What this plugin is

**obsidian-time-tools** merges two upstream MIT plugins into one cohesive package:

- [`liamcain/obsidian-periodic-notes`](https://github.com/liamcain/obsidian-periodic-notes) — daily / weekly / monthly / quarterly / yearly note management
- [`quorafind/Obsidian-Daily-Notes-Editor`](https://github.com/quorafind/Obsidian-Daily-Notes-Editor) — scrollable multi-note editor view

It is intended as a foundation for a broader time-management toolkit (tasks, events, agenda) — keep the architecture modular with that future in mind.

Credit both upstream authors in `README.md`. Both originals are MIT; a `NOTICE.md` is included.

---

## Architecture

```
src/
  main.ts                     # Plugin lifecycle only — keep it thin
  settings.ts                 # TimeManagerSettings shape + PluginSettingTab + AddPresetModal
  obsidian-augmentations.ts   # Obsidian type extensions

  periodic/
    types.ts                  # Granularity union, PeriodicConfig, DisplayConfig, displayConfigs
    constants.ts              # DEFAULT_FORMAT, HUMANIZE_FORMAT per granularity
    api.ts                    # PeriodicResolver interface, create/open/find helpers
    discovery.ts              # vault scan — matchPeriodicFile, findPeriodicNotes, getPeriodicNoteForDate
    commands.ts               # registerPeriodicCommands, ensureTodaysDailyNote
    icons.ts                  # registerPeriodicIcons
    migrate.ts                # maybeMigrateFromDailyNotesCore — one-shot import from core plugin
    switcher.ts               # registerQuickSwitchers — related-files + file-options SuggestModals
    timeline-view.ts          # TimelineView ItemView — sidebar showing adjacent periodic notes

  editor/
    types.ts                  # TimeRange, SelectionMode, TimeField, CustomRange
    file-manager.ts           # FileManager — resolves files for daily/folder/tag modes, filters by range
    view.ts                   # DailyNoteView ItemView — state, actions, menus
    DailyNoteEditorView.svelte # Svelte shell — toolbar, infinite scroll, mode switching
    DailyNote.svelte           # Single embedded note leaf
    leafView.ts               # spawnLeafView, DailyNoteEditor, isDailyNoteLeaf
    workspace-patches.ts      # monkey-around patches for activeLeaf, iterateLeaves, recent-files
    CustomRangeModal.ts       # Date-picker modal for custom time ranges
    up-down-navigation.ts     # CodeMirror extension for cross-note arrow-key navigation

  utils/
    id.ts
    paths.ts                  # getNoteCreationPath
    template.ts               # getTemplateContents, applyTemplateTransformations
    relative-date.ts
```

**Key design rule:** `src/main.ts` only handles plugin lifecycle (onload, onunload, register*, addCommand, addSettingTab). All feature logic lives in the modules above. Keep `main.ts` under ~200 lines.

---

## Settings shape (TimeManagerSettings)

```ts
{
  day / week / month / quarter / year: PeriodicConfig   // enabled, format, folder, templatePath
  createAndOpenEditorOnStartup: boolean
  openNoteOnStartup: Granularity | null                  // open a specific note on layout-ready
  hideFrontmatter: boolean
  hideBacklinks: boolean
  presets: Preset[]                                      // saved folder/tag/daily selections
  migratedFromDailyNotes: boolean                        // one-shot migration guard
}
```

When adding new settings: add the field to `TimeManagerSettings`, add a default in `DEFAULT_SETTINGS`, and add the merge line in `mergeSettings()` in `main.ts`. Do not forget `mergeSettings` — omitting it silently discards saved values on upgrade.

---

## Granularity

The `Granularity` type is `"day" | "week" | "month" | "quarter" | "year"`. The canonical array is `granularities` exported from `src/periodic/types.ts`. **Never hardcode** `["day", "week", "month"]` anywhere — always import and iterate `granularities` so quarterly/yearly are included automatically.

Default formats:
| Granularity | Format |
|---|---|
| day | `YYYY-MM-DD` |
| week | `gggg-[W]ww` |
| month | `YYYY-MM` |
| quarter | `YYYY-[Q]Q` |
| year | `YYYY` |

---

## Editor view — SelectionMode

The multi-note editor (`DailyNoteView` / `DailyNoteEditorView.svelte`) has three selection modes:

- `"daily"` — shows periodic notes for the active granularity, filtered by `TimeRange`
- `"folder"` — shows all markdown files inside a chosen folder path
- `"tag"` — shows all markdown files carrying a chosen tag

`FileManager` handles all three. `DailyNoteView.setSelectionMode(mode, pathOrTag)` is the public API — call it from `main.ts` or the settings tab, not by directly mutating `FileManager`.

---

## TimeRange

```ts
"all" | "week" | "month" | "quarter" | "year"
| "last-week" | "last-month" | "last-quarter" | "last-year"
| "custom"
```

`"custom"` requires a `CustomRange` (`{ start: string; end: string }` in `YYYY-MM-DD`). Pass it via `DailyNoteView.setCustomRange(cr)`.

---

## View types registered

| Constant | Type string | Class |
|---|---|---|
| `TIME_MANAGER_EDITOR_VIEW` | `"obsidian-time-tools-editor-view"` | `DailyNoteView` |
| `TIME_MANAGER_TIMELINE_VIEW` | `"obsidian-time-tools-timeline-view"` | `TimelineView` |

Both are registered in `main.ts` `onload()` and detached in `onunload()`.

---

## Commands registered

All commands use stable IDs — do not rename after release.

| ID | Description |
|---|---|
| `open-{periodicity}-note` | Open current period note (one per enabled granularity) |
| `open-next-{periodicity}-note` | Open next period note (checkCallback — active file must match) |
| `open-prev-{periodicity}-note` | Open previous period note (checkCallback) |
| `open-multi-note-editor` | Open the editor view |
| `open-timeline-sidebar` | Open the timeline sidebar |
| `open-related-files-switcher` | Fuzzy-switch between periodic notes of the same granularity |
| `open-file-options-switcher` | Action picker for the active periodic note |

---

## Deferred features

See `docs/deferred-features.md` for the full decision log. Items tagged **Later** or **Table it** are explicitly out of scope until conditions change. Do not implement them without checking with the project owner first.

Notable items explicitly **skipped**: Calendar Sets, Svelte 4 settings dashboard, NLDates integration.

---

## Patterns to follow

**Adding a new periodic granularity:** Add to the `Granularity` union in `types.ts`, add a format to `constants.ts`, add a `DisplayConfig` entry in `types.ts`, add a settings section via `renderPeriodSection` in `settings.ts`, add a merge line in `mergeSettings` in `main.ts`. Commands, discovery, and the editor toolbar pick up new granularities automatically from the `granularities` array.

**Adding a new editor time range:** Add the string to the `TimeRange` union in `editor/types.ts`, add a case in `FileManager.isDateInRange`, and add a menu item in `DailyNoteView.onOpen` in `view.ts`.

**Adding a new command:** Add it in the appropriate module (`commands.ts` for periodic, `switcher.ts` for switcher-style), not in `main.ts`. Wire the registration call from `main.ts` `onload()`.

**Svelte components:** Use Svelte 4. The project ships Svelte 4 via npm. Do not use Svelte 3 patterns (no `<script context="module">` reactivity model differences). Keep component props typed with `export let`.

**Monkey-patching:** Use `monkey-around` (already a dependency). All patches go in `workspace-patches.ts`, registered via `plugin.register(around(...))` so they unload cleanly.

---

## Build

```bash
npm install       # first time
npm run dev       # watch mode
npm run build     # production (runs tsc -noEmit then esbuild)
```

Build must pass `tsc -noEmit` with no errors before committing. The project uses `"strict": true`.

Output: `main.js` at plugin root (esbuild bundles everything). Do not commit `main.js`.

---

## Common mistakes to avoid

- Hardcoding `["day", "week", "month"]` — use the `granularities` array from `types.ts`
- Forgetting to add a new settings field to `mergeSettings()` in `main.ts`
- Registering a view or event listener outside of `onload` (or without `this.register*`)
- Calling `fileManager.updateOptions()` directly from Svelte — go through `DailyNoteView` methods
- Using `localStorage` — not supported in Obsidian; use `plugin.loadData()` / `saveData()`
