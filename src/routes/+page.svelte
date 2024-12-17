<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
    import { PeerSamplingService, type PeerNode } from '$lib/pss';
    
    let nodeCount = 100;
    let numExchanges = 1;
    let mixRatio = 0.001;
    let density = 0.1; // Add density parameter
    let selectedNodeId: string | null = null;
    
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

    let { nodes, links, pssNodes } = generateGraph(nodeCount, density);
    let graphData = { nodes, links };

    // Update graph when parameters change
    $: {
        const newGraph = generateGraph(nodeCount, density);
        nodes = newGraph.nodes;
        links = newGraph.links;
        pssNodes = newGraph.pssNodes;
        graphData = { nodes, links };
    }

    function handleNodeSelect(event: CustomEvent<string>) {
        selectedNodeId = event.detail;
        const newGraph = generateGraph(nodeCount, density);
        nodes = newGraph.nodes;
        links = newGraph.links;
        pssNodes = newGraph.pssNodes;
        graphData = { nodes, links };
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
            />
        </div>
        <div class="slider-container">
            <label for="density">Density: {density.toFixed(2)}</label>
            <input 
                type="range" 
                id="density" 
                bind:value={density} 
                min="0.01" 
                max="1" 
                step="0.01"
            />
        </div>
    </div>

    <div class="graph-container">
        <ForceGraph 
            data={graphData}
            {numExchanges}
            {mixRatio}
            {selectedNodeId}
            on:nodeSelect={handleNodeSelect}
        />
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

    .selected-node {
        display: flex;
        align-items: center;
        padding: 0.5rem 1rem;
        background: #fff;
        border-radius: 4px;
        font-weight: bold;
    }

    .graph-container {
        flex: 1;
        background: #fff;
        border-radius: 4px;
        overflow: hidden;
    }

    input[type="range"] {
        width: 100%;
    }
</style>