<script lang="ts">
  import ForceGraph from '$lib/components/ForceGraph.svelte';
  
  let nodeCount = 300; // Start with more nodes
  let sparsity = 0.01; // Controls how many connections are made
  
  function generateGraph(count: number, sparsityFactor: number) {
      const nodes = Array.from({ length: count }, (_, i) => ({
          id: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : ''),
          color: Math.floor(Math.random() * 10) + 1
      }));

      const links: { source: string; target: string; value: number }[] = [];
      // Maximum possible links per node scaled by sparsity
      const maxLinksPerNode = Math.max(1, Math.floor(count * sparsityFactor / 2));
      
      nodes.forEach(node => {
          const numLinks = Math.floor(Math.random() * maxLinksPerNode) + 1;
          const availableTargets = nodes.filter(n => n.id !== node.id);
          
          // Shuffle and take first n targets
          const targets = availableTargets
              .sort(() => Math.random() - 0.5)
              .slice(0, numLinks);
          
          targets.forEach(target => {
              links.push({
                  source: node.id,
                  target: target.id,
                  value: Math.floor(Math.random() * 3) + 1
              });
          });
      });

      return { nodes, links };
  }

  let graphData = generateGraph(nodeCount, sparsity);

  // Update graph when parameters change
  $: {
      graphData = generateGraph(nodeCount, sparsity);
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
  </div>

  <ForceGraph data={graphData} />
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

  /* Add this to make the ForceGraph fill remaining space */
  :global(.force-graph-container) {
      flex: 1;
      min-height: 0; /* Important for Firefox */
  }
</style>