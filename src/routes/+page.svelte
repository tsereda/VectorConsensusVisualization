<script lang="ts">
  import ForceGraph from '$lib/components/ForceGraph.svelte';
  import PropagationGraph from '$lib/components/PropagationGraph.svelte';
  import { config, graphData, propagationMetric } from '$lib/stores';
  import { generateInitialGraph } from '$lib/simulation';
  import { onMount } from 'svelte';

  onMount(() => {
    initializeGraph();
  });
  
  function initializeGraph() {
    propagationMetric.set([]); // Reset metrics
    const newGraph = generateInitialGraph($config.nodeCount, $config.density);
    graphData.set(newGraph);
}

function startSimulation() {
    propagationMetric.set([]); // Reset metrics when starting new simulation
    config.update(c => ({ ...c, isRunning: true }));
}

  function stopSimulation() {
    config.update(c => ({ ...c, isRunning: false }));
  }

  function handleInformedStatesChange(event: CustomEvent) {
    propagationMetric.update(metrics => {
        const percentage = event.detail.informedStates ? 
            Array.from(event.detail.informedStates.values()).filter(Boolean).length / 
            event.detail.informedStates.size * 100 : 0;
        
        // Stop simulation if 100% propagation is reached
        if (percentage >= 100) {
            stopSimulation();
        }
        
        return [...metrics, percentage];
    });
}
</script>

<div class="container">
    <div class="controls">
        <div class="slider-container">
            <label for="nodeCount">Number of Nodes: {$config.nodeCount}</label>
            <input 
                type="range" 
                id="nodeCount" 
                bind:value={$config.nodeCount} 
                min="10" 
                max="400" 
                step="10"
                on:change={initializeGraph}
            />
        </div>
        <div class="slider-container">
            <label for="mixRatio">Exchange Rate: {$config.mixRatio.toFixed(3)}</label>
            <input 
                type="range" 
                id="mixRatio" 
                bind:value={$config.mixRatio} 
                min="0.001" 
                max=".1" 
                step="0.001"
                on:change={initializeGraph}
            />
        </div>
        <div class="slider-container">
            <label for="density">Density: {$config.density.toFixed(2)}</label>
            <input 
                type="range" 
                id="density" 
                bind:value={$config.density} 
                min="0." 
                max="1" 
                step="0.01"
                on:change={initializeGraph}
            />
        </div>
        <button on:click={startSimulation} disabled={$config.isRunning}>Start</button>
        <button on:click={stopSimulation} disabled={!$config.isRunning}>Stop</button>
    </div>

    <div class="graph-container">
        <ForceGraph 
            data={$graphData}
            mixRatio={$config.mixRatio}
            on:informedStatesChange={handleInformedStatesChange}
        />
    </div>

    <div class="metrics">
        <div class="metrics-content">
            <div class="graph-section">
                <PropagationGraph 
                    width={500}
                    height={250} 
                />
            </div>
            <div class="log-section">
                <ul>
                    {#each $propagationMetric as metric, index}
                        <li>Time {index + 1}s: {metric.toFixed(2)}%</li>
                    {/each}
                </ul>
            </div>
        </div>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
        padding: 0;
        overflow: hidden;
        background: #f5f5f5;
    }

    :global(*) {
        box-sizing: border-box;
    }
    .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: .5rem;
        box-sizing: border-box;
        gap: 1rem;
    }

    .controls {
        flex: 0 0 auto;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 4px;
    }

    .slider-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 200px;
    }

    .graph-container {
        flex: 1;
        background: #fff;
        border-radius: 4px;
        overflow: hidden;
    }

    .metrics {
        flex: 0 0 auto;
        background: #f5f5f5;
        border-radius: 4px;
        padding: 1rem;
        height: 300px;
    }

    .metrics-content {
        display: flex;
        gap: 1rem;
        height: calc(100% - 2rem); /* Account for header */
    }

    .graph-section {
        flex: 1;
        min-width: 400px;
    }

    .log-section {
        flex: 0 0 200px;
        overflow-y: auto;
        padding-right: 1rem;
    }

    .log-section ul {
        margin: 0;
        padding-left: 1.5rem;
    }

    input[type="range"] {
        width: 100%;
    }
</style>