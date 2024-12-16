<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
    import { PeerSamplingService, type PeerNode } from '$lib/pss';
    
    let nodeCount = 300;
    let sparsity = 0.01;
    let numExchanges = 3;
    let mixRatio = 0.3;
    let informedRatio = 0.1; // New parameter
    let selectedNodeId: string | null = null;
    
    function generateGraph(count: number, sparsityFactor: number) {
        const pssNodes = new Map<string, PeerSamplingService>();
        // Select one random index for the informed node
        const informedIndex = Math.floor(Math.random() * count);
        
        // Create nodes with PSS
        const nodes = Array.from({ length: count }, (_, i) => {
            const id = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : '');
            // Only one node will be informed - either the randomly selected one or the manually selected one
            const informed = selectedNodeId === null ? 
                (i === informedIndex) : 
                (id === selectedNodeId);
            const pss = new PeerSamplingService(id, informed);
            pssNodes.set(id, pss);
            return { id, informed };
        });

        // Initialize connections using PSS
        const links: { source: string; target: string; value: number }[] = [];
        const maxLinksPerNode = Math.max(1, Math.floor(count * sparsityFactor / 2));
        
        nodes.forEach(node => {
            const pss = pssNodes.get(node.id)!;
            const numLinks = Math.floor(Math.random() * maxLinksPerNode) + 1;
            
            // Create random connections
            const availableTargets = nodes.filter(n => n.id !== node.id);
            const targets = availableTargets
                .sort(() => Math.random() - 0.5)
                .slice(0, numLinks);
            
            targets.forEach(target => {
                const targetPss = pssNodes.get(target.id)!;
                pss.exchangeViews({ 
                    peers: new Map([[target.id, { id: target.id, color: target.color, age: 0 }]]), 
                    maxSize: 30 
                });
                
                links.push({
                    source: node.id,
                    target: target.id,
                    value: 1
                });
            });
        });

        return { nodes, links, pssNodes };
    }

    let { nodes, links, pssNodes } = generateGraph(nodeCount, sparsity);
    let graphData = { nodes, links };

    // Update graph when parameters change
    $: {
        const newGraph = generateGraph(nodeCount, sparsity);
        nodes = newGraph.nodes;
        links = newGraph.links;
        pssNodes = newGraph.pssNodes;
        graphData = { nodes, links };
    }

    function handleNodeSelect(event: CustomEvent<string>) {
        selectedNodeId = event.detail;
        const newGraph = generateGraph(nodeCount, sparsity);
        nodes = newGraph.nodes;
        links = newGraph.links;
        pssNodes = newGraph.pssNodes;
        graphData = { nodes, links };
    }
</script>

<div class="container">
    <div class="controls">
        <div class="slider-container">
            <label for="nodeCount">Total Nodes: {nodeCount}</label>
            <input 
                type="range" 
                id="nodeCount" 
                bind:value={nodeCount} 
                min="2" 
                max="900" 
                step="1"
            />
        </div>
        <div class="slider-container">
            <label for="sparsity">Connection Density: {sparsity.toFixed(3)}</label>
            <input 
                type="range" 
                id="sparsity" 
                bind:value={sparsity} 
                min="0.001" 
                max=".05" 
                step="0.001"
            />
        </div>
        <div class="slider-container">
            <label for="numExchanges">Color Exchanges per Frame: {numExchanges}</label>
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
            <label for="mixRatio">Color Mix Speed: {mixRatio.toFixed(2)}</label>
            <input 
                type="range" 
                id="mixRatio" 
                bind:value={mixRatio} 
                min="0.01" 
                max="0.09" 
                step="0.01"
            />
        </div>
        <div class="selected-node">
            Selected Node: {selectedNodeId ?? 'None'}
        </div>
    </div>

    <ForceGraph 
        data={graphData} 
        {numExchanges}
        {mixRatio}
        {selectedNodeId}
        on:nodeSelect={handleNodeSelect}
    />
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        height: 100vh; /* Full viewport height */
        padding: 1rem;
        box-sizing: border-box;
    }

    .controls {
        flex: 0 0 auto; /* Don't grow or shrink */
        padding: 1rem;
        background: #f5f5f5;
        border-radius: 4px;
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .slider-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    input[type="range"] {
        width: 100%;
    }

    .selected-node {
        font-weight: bold;
        text-align: center;
        padding: 0.5rem;
        background: #fff;
        border-radius: 4px;
    }

    /* Add this to make the ForceGraph fill remaining space */
    :global(.force-graph-container) {
        flex: 1;
        min-height: 0; /* Important for Firefox */
    }
</style>