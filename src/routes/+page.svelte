<script lang="ts">
    import ForceGraph from '$lib/components/ForceGraph.svelte';
  
    const nodes = [
        { id: "A", color: 1 },
        { id: "B", color: 1 },
        { id: "C", color: 2 },
        { id: "D", color: 2 }
    ];

    interface Link {
      source: string | Node;  // accept both string ID or Node object
      target: string | Node;
      value: number;
    }

    const graphData = {
      nodes,
      links: [
        { source: "A", target: "B", value: 1 },
        { source: "B", target: "C", value: 2 },
        { source: "C", target: "D", value: 1 },
        { source: "D", target: "A", value: 3 }
      ]
    };
</script>
  
<ForceGraph data={graphData} />