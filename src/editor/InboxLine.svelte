<script lang="ts">
	import { onMount } from "svelte";
	import type TimeManagerPlugin from "../main";
	import type { InboxInlineItem } from "./InboxService";
	// InboxInlineItem is a member of TaggedInboxItem (renamed from InboxItem to avoid collision with src/inbox/types.ts)

	export let plugin: TimeManagerPlugin;
	export let item: InboxInlineItem;
	/** Called after the item is successfully cleared so the parent can refresh. */
	export let onClear: () => void = () => { /* no-op */ };

	let lineText = "";
	let clearing = false;

	onMount(async () => {
		try {
			const content = await plugin.app.vault.cachedRead(item.file);
			const lines = content.split("\n");
			lineText = lines[item.line] ?? "";
		} catch {
			lineText = "";
		}
	});

	function openFile() {
		plugin.app.workspace.openLinkText(item.file.path, "", false, { active: true });
	}

	async function clearItem() {
		if (clearing) return;
		clearing = true;
		try {
			const { InboxService } = await import("./InboxService");
			const svc = new InboxService(plugin.app);
			await svc.clearInlineItem(item);
			onClear();
		} catch (e) {
			console.error("Obsidian Time Tools: failed to clear inbox item", e);
		} finally {
			clearing = false;
		}
	}

	/** Wrap the tag occurrence in a <mark> for highlighting. */
	function highlightTag(text: string, tag: string): string {
		if (!text) return "";
		const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		const re = new RegExp(`(${escaped})`, "gi");
		return text.replace(re, `<mark class="tm-inbox-tag-hl">$1</mark>`);
	}
</script>

<div class="tm-inbox-line">
	<div class="tm-inbox-line-meta">
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<span class="tm-inbox-line-filename" on:click={openFile} title={item.file.path}>
			{item.file.basename}
		</span>
		<span class="tm-inbox-line-loc">:{item.line + 1}</span>
	</div>
	<div class="tm-inbox-line-body">
		{#if lineText}
			<!-- eslint-disable-next-line svelte/no-at-html-tags -->
			<span class="tm-inbox-line-text">{@html highlightTag(lineText, item.tag)}</span>
		{:else}
			<span class="tm-inbox-line-text tm-inbox-line-text--loading">…</span>
		{/if}
		<div class="tm-inbox-line-actions">
			<button
				class="tm-inbox-btn tm-inbox-btn--jump"
				on:click={openFile}
				title="Open file"
				aria-label="Open file"
			>
				<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
					<path d="M7 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9"/>
					<path d="M13 3h-4m4 0v4m0-4L7 9"/>
				</svg>
			</button>
			<button
				class="tm-inbox-btn tm-inbox-btn--clear"
				on:click={clearItem}
				disabled={clearing}
				title="Remove #inbox tag"
				aria-label="Remove #inbox tag"
			>
				{#if clearing}
					<svg class="tm-inbox-spin" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round">
						<path d="M8 2a6 6 0 1 0 6 6"/>
					</svg>
				{:else}
					<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
						<path d="M4 4l8 8M12 4l-8 8"/>
					</svg>
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.tm-inbox-line {
		display: flex;
		flex-direction: column;
		gap: 3px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--background-modifier-border);
		background-color: var(--background-primary);
		transition: background-color 80ms ease;
	}

	.tm-inbox-line:hover {
		background-color: var(--background-primary-alt);
	}

	.tm-inbox-line-meta {
		display: flex;
		align-items: baseline;
		gap: 2px;
	}

	.tm-inbox-line-filename {
		font-size: var(--font-ui-smaller);
		font-weight: 600;
		color: var(--text-accent);
		cursor: pointer;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.tm-inbox-line-filename:hover {
		text-decoration: underline;
	}

	.tm-inbox-line-loc {
		font-size: var(--font-ui-smaller);
		color: var(--text-faint);
		flex-shrink: 0;
	}

	.tm-inbox-line-body {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tm-inbox-line-text {
		flex: 1;
		font-size: var(--font-ui-small);
		color: var(--text-normal);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.4;
		min-width: 0;
	}

	.tm-inbox-line-text--loading {
		color: var(--text-faint);
	}

	.tm-inbox-line-actions {
		display: flex;
		gap: 4px;
		flex-shrink: 0;
		opacity: 0;
		transition: opacity 80ms ease;
	}

	.tm-inbox-line:hover .tm-inbox-line-actions {
		opacity: 1;
	}

	.tm-inbox-btn {
		all: unset;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border-radius: var(--radius-s);
		cursor: pointer;
		color: var(--text-muted);
		transition: background-color 80ms ease, color 80ms ease;
	}

	.tm-inbox-btn:hover {
		background-color: var(--background-modifier-hover);
		color: var(--text-normal);
	}

	.tm-inbox-btn--clear:hover {
		color: var(--text-error);
	}

	.tm-inbox-btn:disabled {
		opacity: 0.5;
		cursor: default;
	}

	@keyframes tm-spin {
		to { transform: rotate(360deg); }
	}

	.tm-inbox-spin {
		animation: tm-spin 0.7s linear infinite;
	}

	:global(.tm-inbox-tag-hl) {
		background-color: var(--text-highlight-bg);
		color: var(--text-normal);
		border-radius: 2px;
		padding: 0 1px;
	}
</style>
