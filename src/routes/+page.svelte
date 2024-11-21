<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
  
    const graphData = {
      nodes: [
        { id: "A", group: 1 },
        { id: "B", group: 1 },
        { id: "C", group: 2 },
        { id: "D", group: 2 }
      ],
      links: [
        { source: "A", target: "B", value: 1 },
        { source: "B", target: "C", value: 2 },
        { source: "C", target: "D", value: 1 },
        { source: "D", target: "A", value: 3 }
      ]
    };
  </script>
  
  <ForceGraph data={graphData} />