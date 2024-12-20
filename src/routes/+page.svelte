<script lang="ts">
  import ForceGraph from '$lib/components/ForceGraph.svelte';
  import PropagationGraph from '$lib/components/PropagationGraph.svelte';
  import { config, graphData, propagationMetric, trials } from '$lib/stores';
  import { generateInitialGraph } from '$lib/simulation';
  import { onMount } from 'svelte';

  let logSection: HTMLDivElement;

  onMount(() => {
    initializeGraph();
  });

  function initializeGraph() {
    const newGraph = generateInitialGraph($config.nodeCount, $config.density);
    graphData.set(newGraph);
  }

function startSimulation() {
    if ($trials.length === 0) {
        startNewTrial();
    } else {
        config.update(c => ({ ...c, isRunning: true }));
    }
}

  function stopSimulation() {
    config.update(c => ({ ...c, isRunning: false }));
  }

  function handleInformedStatesChange(event: CustomEvent) {
    if ($trials.length === 0) return;

    const currentTrial = $trials[$trials.length - 1];
    const percentage = event.detail.informedStates ? 
        Array.from(event.detail.informedStates.values()).filter(Boolean).length / 
        event.detail.informedStates.size * 100 : 0;
    
    trials.update(t => {
        const updatedTrials = [...t];
        const lastTrial = updatedTrials[updatedTrials.length - 1];
        if (percentage <= 100) {
            updatedTrials[updatedTrials.length - 1] = {
                ...lastTrial,
                metrics: [...lastTrial.metrics, percentage]
            };
        }
        return updatedTrials;
    });

    // Stop simulation if 100% propagation is reached
    if (percentage >= 100) {
        stopSimulation();
    }
}

function startNewTrial() {
    const trialId = crypto.randomUUID().slice(0,8);
    trials.update(t => [...t, {
        id: trialId,
        metrics: [],
        config: {...$config}
    }]);
    initializeGraph();  // Reset graph for new trial
    startSimulation();
}

  $: if (logSection && $trials.length > 0) {
    const currentTrial = $trials[$trials.length - 1];
    if (currentTrial.metrics.length > 0) {
        logSection.scrollTop = logSection.scrollHeight;
    }
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
                min="1" 
                max="175" 
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
        <div class="slider-container">
            <label for="fanout">Fanout: {$config.numExchanges}</label>
            <input 
                type="range" 
                id="fanout" 
                bind:value={$config.numExchanges} 
                min="1" 
                max="10" 
                step="1"
            />
        </div>
        <div class="control-group">
            <label>Protocol:</label>
            <div class="radio-group">
                <label>
                    <input 
                        type="radio" 
                        name="protocol" 
                        value="push" 
                        bind:group={$config.protocol}
                    />
                    Push
                </label>
                <label>
                    <input 
                        type="radio" 
                        name="protocol" 
                        value="pull" 
                        bind:group={$config.protocol}
                    />
                    Pull
                </label>
                <label>
                    <input 
                        type="radio" 
                        name="protocol" 
                        value="pushpull" 
                        bind:group={$config.protocol}
                    />
                    Push-Pull
                </label>
            </div>
        </div>
        <!-- <button on:click={startSimulation} disabled={$config.isRunning}>Start</button>
        <button on:click={stopSimulation} disabled={!$config.isRunning}>Stop</button> -->
        <button on:click={startNewTrial}>Run Trial</button>
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
                    width={1400}
                    height={200} 
                />
            </div>
            <div class="log-section" bind:this={logSection}>
                <ul>
                    {#each $trials as trial, trialIndex}
                        <li class="trial-header">Trial {trialIndex + 1}</li>
                        {#each trial.metrics as metric, index}
                            <li>Epoch {index + 1}: {metric.toFixed(2)}%</li>
                        {/each}
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
        background: #2c3e50;
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
        background: #b7b7b7;
        border-radius: 4px;
    }

    .slider-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        min-width: 200px;
    }

    .control-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .radio-group {
        display: flex;
        gap: 1rem;
    }

    .radio-group label {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .graph-container {
        flex: 1;
        background: #b7b7b7;
        border-radius: 4px;
        overflow: hidden;
    }

    .metrics {
        flex: 0 0 auto;
        background: #b7b7b7;
        border-radius: 4px;
        padding: 1rem;
        height: 225px;
    }

    .metrics-content {
        display: flex;
        gap: 1rem;
        height: 100%; /* Account for header */
    }

    .graph-section {
        flex: 1;
        min-width: 400px;
    }

    .log-section {
        flex: 0 0 300px;
        overflow-y: auto;
        padding: 8px;
        background: b7b7b7;
        border-radius: 4px;
    }

    .log-section ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    .log-section li {
        padding: 2px 0;
        font-size: 0.9em;
    }

    input[type="range"] {
        width: 100%;
    }
</style>