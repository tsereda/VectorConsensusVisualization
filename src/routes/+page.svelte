<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
    
    let nodeCount = 4; // Initial nodes
    
    function generateGraph(count: number) {
        const nodes = Array.from({ length: count }, (_, i) => ({
            id: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : ''),
            color: Math.floor(Math.random() * 10) + 1
        }));

        const links = [];
        // Each node connects to 1-3 other random nodes
        nodes.forEach(node => {
            const numLinks = Math.floor(Math.random() * 3) + 1;
            for (let i = 0; i < numLinks; i++) {
                const target = nodes[Math.floor(Math.random() * nodes.length)];
                if (target.id !== node.id) {
                    links.push({
                        source: node.id,
                        target: target.id,
                        value: Math.floor(Math.random() * 3) + 1
                    });
                }
            }
        });

        return { nodes, links };
    }

    let graphData = generateGraph(nodeCount);

    // Update graph when slider changes
    $: {
        graphData = generateGraph(nodeCount);
    }

    let nodeInput = '';
    let colorInput = 1;

    function addNode() {
        if (!nodeInput.trim()) return;
        if (!graphData.nodes.find(n => n.id === nodeInput)) {
            const newNodes = [...graphData.nodes, { id: nodeInput, color: colorInput }];
            const newLinks = [...graphData.links];
            generateRandomLinks(nodeInput, newLinks);
            graphData = {
                nodes: newNodes,
                links: newLinks
            };
        }
        nodeInput = '';
    }

    function generateRandomLinks(newNodeId: string, links: any[]) {
        const numLinks = Math.floor(Math.random() * 3) + 1;
        const existingNodes = graphData.nodes.filter(n => n.id !== newNodeId);
        
        for (let i = 0; i < numLinks; i++) {
            const targetNode = existingNodes[Math.floor(Math.random() * existingNodes.length)];
            if (targetNode) {
                links.push({
                    source: newNodeId,
                    target: targetNode.id,
                    value: Math.floor(Math.random() * 3) + 1
                });
            }
        }
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
                max="50" 
                step="1"
            />
        </div>
        <form on:submit|preventDefault={addNode}>
            <input
                type="text"
                bind:value={nodeInput}
                placeholder="Enter node ID"
                pattern="[A-Za-z0-9]+"
                title="Alphanumeric characters only"
            />
            <input
                type="number"
                bind:value={colorInput}
                min="1"
                max="10"
                title="Color group (1-10)"
            />
            <button type="submit">Add Node</button>
        </form>
    </div>

    <ForceGraph data={graphData} />
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .controls {
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

    form {
        display: flex;
        gap: 0.5rem;
    }

    input {
        padding: 0.5rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }

    button {
        padding: 0.5rem 1rem;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }

    button:hover {
        background: #45a049;
    }

    input[type="range"] {
        width: 100%;
    }
</style>