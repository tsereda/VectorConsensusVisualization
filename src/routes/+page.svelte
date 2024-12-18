<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
    import { PeerSamplingService, type PeerNode } from '$lib/pss';
    import PropagationGraph from '$lib/components/PropagationGraph.svelte';
    import { writable, type Writable } from 'svelte/store';

    let nodeCount = 10;
    let numExchanges = 1;
    let mixRatio = 0.001;
    let density = 0; // Add density parameter
    let selectedNodeId: string | null = null;
    let isRunning = false;
    let propagationMetric: Writable<number[]> = writable([]);
    let startTime: number | null = null;
    let nodes: { id: string; informed: boolean }[] = [];
    let links: { source: string; target: string; value: number }[] = [];
    let pssNodes: Map<string, PeerSamplingService> = new Map();
    let graphData = { nodes, links };

    function generateGraph(count: number, density: number) {
        const pssNodes = new Map<string, PeerSamplingService>();
        const informedIndex = Math.floor(Math.random() * count);
        
        // Create nodes
        const nodes = Array.from({ length: count }, (_, i) => {
            const id = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : '');
            const informed = selectedNodeId === null ? 
                (i === informedIndex) : 
                (id === selectedNodeId);
            const pss = new PeerSamplingService(id, informed);
            pssNodes.set(id, pss);
            return { id, informed };
        });

        // Generate MST edges
        const mstEdges = PeerSamplingService.generateMST(nodes.map(n => n.id));
        
        // Create links from MST
        const links = mstEdges.map(edge => ({
            source: edge.source,
            target: edge.target,
            value: 1
        }));

        // Generate random links until we reach a certain density
        const maxLinks = Math.floor(count * (count - 1) * density / 2);
        const randomLinks = new Set<string>();

        while (randomLinks.size < maxLinks) {
            const source = nodes[Math.floor(Math.random() * count)].id;
            const target = nodes[Math.floor(Math.random() * count)].id;
            if (source !== target) {
                randomLinks.add([source, target].sort().join('-'));
            }
        }

        randomLinks.forEach(link => {
            const [source, target] = link.split('-');
            links.push({ source, target, value: 1 });
        });

        // Initialize PSS views based on MST
        mstEdges.forEach(edge => {
            const sourcePss = pssNodes.get(edge.source)!;
            const targetPss = pssNodes.get(edge.target)!;
            
            sourcePss.exchangeViews({
                peers: new Map([[edge.target, { id: edge.target, informed: targetPss.isInformed(), age: 0 }]]),
                maxSize: 30
            });
            
            targetPss.exchangeViews({
                peers: new Map([[edge.source, { id: edge.source, informed: sourcePss.isInformed(), age: 0 }]]),
                maxSize: 30
            });
        });

        return { nodes, links, pssNodes };
    }

    function initializeGraph() {
        const newGraph = generateGraph(nodeCount, density);
        nodes = newGraph.nodes;
        links = newGraph.links;
        pssNodes = newGraph.pssNodes;
        graphData = { nodes, links };
    }

    initializeGraph();

    function handleNodeSelect(event: CustomEvent<string>) {
        selectedNodeId = event.detail;
        initializeGraph();
    }

    function startSimulation() {
        isRunning = true;
        startTime = Date.now();
        propagationMetric.set([]);
        runSimulation();
    }

    function runSimulation() {
        if (!isRunning) return;

        // Update the graph and calculate the propagation metric
        const informedCount = nodes.filter(node => node.informed).length;
        const propagationPercentage = (informedCount / nodes.length) * 100;
        propagationMetric.update(metrics => [...metrics, propagationPercentage]);

        // Continue the simulation
        setTimeout(runSimulation, 1000); // Run every second
    }

    function stopSimulation() {
        isRunning = false;
    }

    function handleInformedStatesChange(event: CustomEvent<{informedStates: Map<string, boolean>}>) {
        const { informedStates } = event.detail;
        nodes.forEach(node => {
            node.informed = informedStates.get(node.id) ?? node.informed;
        });
    }

    // Update propagation metric
    function updatePropagationMetric() {
        propagationMetric.update(metric => {
            const informedCount = nodes.filter(node => node.informed).length;
            metric.push(informedCount / nodes.length);
            return metric;
        });
    }
</script>

<div class="container">
    <div class="controls">
        <div class="slider-container">
            <label for="nodeCount">Number of Nodes: {nodeCount}</label>
            <input 
                type="range" 
                id="nodeCount" 
                bind:value={nodeCount} 
                min="10" 
                max="500" 
                step="10"
                on:change={initializeGraph}
            />
        </div>
        <div class="slider-container">
            <label for="numExchanges">Exchanges per Frame: {numExchanges}</label>
            <input 
                type="range" 
                id="numExchanges" 
                bind:value={numExchanges} 
                min="1" 
                max="10" 
                step="1"
                on:change={initializeGraph}
            />
        </div>
        <div class="slider-container">
            <label for="mixRatio">Exchange Rate: {mixRatio.toFixed(3)}</label>
            <input 
                type="range" 
                id="mixRatio" 
                bind:value={mixRatio} 
                min="0.001" 
                max=".1" 
                step="0.001"
                on:change={initializeGraph}
            />
        </div>
        <div class="slider-container">
            <label for="density">Density: {density.toFixed(2)}</label>
            <input 
                type="range" 
                id="density" 
                bind:value={density} 
                min="0." 
                max="1" 
                step="0.01"
                on:change={initializeGraph}
            />
        </div>
        <button on:click={startSimulation} disabled={isRunning}>Start</button>
        <button on:click={stopSimulation} disabled={!isRunning}>Stop</button>
    </div>

    <div class="graph-container">
        <ForceGraph 
            data={graphData}
            {numExchanges}
            {mixRatio}
            {isRunning}
            on:nodeSelect={handleNodeSelect}
            on:informedStatesChange={handleInformedStatesChange}
        />
    </div>

    <div class="metrics">
        <h3>Propagation Metric</h3>
        <div class="metrics-content">
            <div class="graph-section">
                <PropagationGraph 
                    data={$propagationMetric}
                    width={400}
                    height={150} 
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
    .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: 1rem;
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
        height: 150px;
        max-height: 150px; /* Set a fixed maximum height */
        overflow-y: auto;  /* Enable vertical scrolling */
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