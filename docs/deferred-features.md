# Deferred features

Features from the two upstream plugins that were intentionally excluded from Time Manager 0.1.0 (the MVP), grouped by source. Each entry is tagged with a milestone decision:

- **Keep – next milestone**: targeted for the next release
- **Later**: revisit after the next milestone ships
- **Skip**: not wanted; won't implement
- **Table it**: defer indefinitely until a concrete trigger (e.g. user reports sluggishness)

---

## Cross-cutting decisions

| Question | Decision |
|---|---|
| Settings UI | **Stay plain** — keep `PluginSettingTab`; no Svelte 4 dashboard |
| Editor scope | **All granularities** — editor should accept weekly/monthly/quarterly notes once granularities are well-tested |
| Periodic-notes cache | **Table it** — rescan on each query; add a cache only when someone reports sluggishness |

---

## From obsidian-periodic-notes

- **Quarterly and yearly periodic notes.** *(Keep – next milestone)* The current `Granularity` union is `day | week | month`. Restoring the wider union touches `src/periodic/types.ts`, `src/periodic/constants.ts`, settings UI, and command registration.
- **Calendar Sets.** *(Skip)* Upstream supports multiple independent sets of periodic-note configurations, with an active set and a switcher. Adds significant complexity with no current use case.
- **Svelte settings dashboard.** *(Skip)* Time Manager uses a plain `PluginSettingTab` and will stay that way. Revisit in Svelte 4 only if settings outgrow a flat list.
- **Periodic-notes cache.** *(Table it)* Upstream maintains an in-memory cache keyed by calendar set / granularity / date and listens to vault events to keep it warm. Time Manager rescans `vault.getMarkdownFiles()` on each query — fast enough until a user reports sluggishness.
- **Timeline complication.** *(Keep – next milestone)* Sidebar component showing adjacent periodic notes for the active file (e.g. "← May 24 | May 26 →" plus surrounding week note). New `ItemView` + Svelte component.
- **Quick-switcher integrations.** *(Keep – next milestone)* The "related files switcher" and "file options switcher" via `SuggestModal`. (Calendar-set switcher is dropped — Calendar Sets are skipped.)
- **NLDates integration.** *(Later)* Command that uses the Natural Language Dates plugin to open a periodic note by parsing a date expression. Add if users request it.
- **Auto-open on startup.** *(Keep – next milestone)* Extend existing editor-view startup behavior to also support opening a specific granularity note on layout-ready.
- **Migration from the legacy Daily Notes core plugin.** *(Keep – next milestone, high priority)* Detect an existing Daily Notes core configuration and port the format/folder/template into Time Manager settings on first load.
- **File menu integrations.** *(Keep – next milestone)* Add "Open related periodic note" and granularity-specific items to the file context menu for files that match a periodic-note pattern.
- **Locale override.** *(Later)* A setting to force a moment locale different from Obsidian's. Add before public release.

---

## From Obsidian-Daily-Notes-Editor

- **Folder selection mode.** *(Keep – next milestone)* "Show all notes inside folder X in the multi-note editor." Extends `SelectionMode` and `FileManager`.
- **Tag selection mode.** *(Keep – next milestone)* Same shape as folder mode but driven by a tag. Depends on folder mode.
- **Preset list.** *(Keep – next milestone)* Save folder/tag selections as named presets surfaced in the view's action menu and settings tab. Requires `AddPresetModal` and preset UI in the settings tab.
- **Custom date range.** *(Keep – next milestone)* Modal date-picker for start/end dates filtering the editor view. Requires `CustomRangeModal` and extending `TimeRange`.
- **Quarterly and "last quarter" time ranges in the editor view.** *(Keep – next milestone)* Add `quarter` and `last-quarter` to `TimeRange` once quarterly periodic notes are restored.
- **Arrow-up / arrow-down navigation between embedded editors.** *(Keep – next milestone)* CodeMirror extension (`createUpDownNavigationExtension`) that lets the cursor leave the top/bottom of one embedded note and land in the adjacent one.
- **Recent Files plugin integration.** *(Keep – next milestone)* Patch `recent-files-obsidian` so notes opened inside the editor view don't pollute the recent-files list.
- **"Open daily notes for this folder" file-menu item.** *(Keep – next milestone)* Right-click a folder to enter folder mode. Blocked on folder mode shipping.
- **Funding metadata / icon set.** *(Later)* Custom ribbon icon for the editor view. Easy to add anytime.
