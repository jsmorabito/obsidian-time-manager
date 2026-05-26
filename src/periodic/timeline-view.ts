/**
 * Timeline sidebar view.
 *
 * Shows the adjacent periodic notes for the currently active file.
 * If the active file is a periodic note, it displays prev/current/next links
 * for each enabled granularity that matches.
 */
import { ItemView, TFile, WorkspaceLeaf, moment } from "obsidian";
import type TimeManagerPlugin from "../main";
import { findInPeriodic, getPeriodicNote, openPeriodicNote } from "./api";
import { displayConfigs, granularities } from "./types";

export const TIME_MANAGER_TIMELINE_VIEW = "time-manager-timeline-view";

export class TimelineView extends ItemView {
	plugin: TimeManagerPlugin;
	private unsubscribeActiveFile: (() => void) | null = null;

	constructor(leaf: WorkspaceLeaf, plugin: TimeManagerPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType(): string {
		return TIME_MANAGER_TIMELINE_VIEW;
	}

	getDisplayText(): string {
		return "Timeline";
	}

	getIcon(): string {
		return "calendar-range";
	}

	async onOpen(): Promise<void> {
		this.render();

		// Re-render whenever the active file changes.
		const handler = () => this.render();
		this.registerEvent(this.app.workspace.on("active-leaf-change", handler));
		this.registerEvent(this.app.vault.on("rename", handler));
		this.registerEvent(this.app.vault.on("delete", handler));
	}

	async onClose(): Promise<void> {
		// Event listeners are deregistered automatically by registerEvent.
	}

	public refresh(): void {
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			contentEl.createEl("p", {
				text: "Open a periodic note to see the timeline.",
				cls: "tm-timeline-empty",
			});
			return;
		}

		let foundAny = false;

		for (const granularity of granularities) {
			const config = this.plugin.getConfig(granularity);
			if (!config.enabled) continue;

			const meta = findInPeriodic(this.plugin, activeFile.path);
			if (!meta || meta.granularity !== granularity) continue;

			foundAny = true;
			const { date } = meta;
			const cfg = displayConfigs[granularity];

			const section = contentEl.createDiv({ cls: "tm-timeline-section" });
			section.createEl("h4", {
				text: cfg.periodicity.charAt(0).toUpperCase() + cfg.periodicity.slice(1),
				cls: "tm-timeline-heading",
			});

			const nav = section.createDiv({ cls: "tm-timeline-nav" });

			const prevDate = date.clone().subtract(1, granularity);
			const prevFile = getPeriodicNote(this.plugin, granularity, prevDate);
			this.renderNavLink(nav, prevFile, prevDate.format("YYYY-MM-DD"), "←", () => {
				openPeriodicNote(this.plugin, granularity, prevDate).catch(console.error);
			});

			const currentEl = nav.createEl("span", {
				text: date.format("YYYY-MM-DD"),
				cls: "tm-timeline-current",
			});

			const nextDate = date.clone().add(1, granularity);
			const nextFile = getPeriodicNote(this.plugin, granularity, nextDate);
			this.renderNavLink(nav, nextFile, nextDate.format("YYYY-MM-DD"), "→", () => {
				openPeriodicNote(this.plugin, granularity, nextDate).catch(console.error);
			});
		}

		if (!foundAny) {
			contentEl.createEl("p", {
				text: "This file is not a periodic note.",
				cls: "tm-timeline-empty",
			});
		}
	}

	private renderNavLink(
		container: HTMLElement,
		file: TFile | null,
		label: string,
		arrow: string,
		onClick: () => void
	): void {
		const el = container.createEl("button", {
			cls: file ? "tm-timeline-link" : "tm-timeline-link tm-timeline-link--missing",
			title: label,
		});
		el.setText(arrow);
		el.addEventListener("click", onClick);
	}
}
