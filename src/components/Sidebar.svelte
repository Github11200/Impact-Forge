<script lang="ts">
	import { Component, MarkdownRenderer } from 'obsidian';
	import { tick } from 'svelte';

	let {
		app,
		organizeButtonCallback,
		queryButtonCallback,
		printGraphNodes,
		printMemoryStores,
		value = $bindable(''),
	} = $props();

	let queryResult = $state('');
	let resultContainer: HTMLElement;
	let component = new Component();

	async function handleQuery() {
		queryResult = 'Processing...';

		const response = await queryButtonCallback(value);
		queryResult = response;

		await tick();

		if (resultContainer) {
			resultContainer.empty();
			component.load();
			MarkdownRenderer.render(
				app,
				queryResult,
				resultContainer,
				'',
				component,
			);
		}
	}

	function handleClear() {
		queryResult = '';
		resultContainer.empty();
	}

	function handleLinkClick(event: MouseEvent) {
		const target = event.target as HTMLElement;
		if (target.classList.contains('internal-link')) {
			event.preventDefault();
			const linkPath =
				target.getAttribute('data-href') || target.innerText;
			if (linkPath) {
				app.workspace.openLinkText(linkPath, '', false);
			}
		}
	}
</script>

<div id="container">
	<button onclick={organizeButtonCallback}>Organize</button>
	<button onclick={printGraphNodes}>Print Graph Nodes</button>
	<button onclick={printMemoryStores}>Print Memory Stores</button>

	<label>
		Enter your query:
		<textarea
			bind:value
			placeholder="Query here..."
			rows={4}
			onkeydown={(e) => {
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					handleQuery();
				}
			}}
		></textarea>
		<button
			onclick={() => {
				handleQuery();
			}}>Submit</button
		>
	</label>

	{#if queryResult !== ''}
		<div>
			<div
				bind:this={resultContainer}
				onclick={handleLinkClick}
				class="markdown-preview-view"
			></div>
			<button onclick={handleClear}>Clear</button>
		</div>
	{/if}
</div>

<style>
	button {
		width: 100%;
	}

	#container {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	textarea {
		margin-top: 6px;
		width: 100%;
	}
</style>
