<script lang="ts">
	let {
		organizeButtonCallback,
		questionButtonCallback,
		value = $bindable(''),
	} = $props();
</script>

<div id="container">
	<button onclick={organizeButtonCallback}>Organize</button>

	<label>
		Enter your question:
		<textarea
			bind:value
			placeholder="Question here..."
			rows={4}
			onkeydown={(e) => {
				if (e.key === 'Enter' && !e.shiftKey) {
					e.preventDefault();
					questionButtonCallback();
				}
			}}
		></textarea>
		<button onclick={questionButtonCallback}>Submit</button>
	</label>
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
