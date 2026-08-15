<script lang="ts">
	let { organizeButtonCallback } = $props();
</script>

<button onclick={organizeButtonCallback}>Organize</button>

<style>
	button {
		width: 100%;
	}
</style>
