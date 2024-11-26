<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as d3 from 'd3';
  
    // Define types for our data
    interface Node {
      id: string;
      color: number;
      x?: number;
      y?: number;
      fx?: number | null;
      fy?: number | null;
      adjustedColor?: number;
    }
  
    interface Link {
      source: string | Node;  // Allow both string and Node
      target: string | Node;
      value: number;
    }
  
    interface GraphData {
      nodes: Node[];
      links: Link[];
    }
  
    export let data: GraphData;
    let svgElement: SVGSVGElement;
    let simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>>;
  
    // Chart dimensions
    $: width = 928;
    $: height = 680;

    function createGraph(data: GraphData) {
        // Clear existing graph
        d3.select(svgElement).selectAll("*").remove();

        // Create copies of data 
        const links = data.links.map(d => ({ ...d }));
        const nodes = data.nodes.map(d => ({ ...d }));

        // Create a map of node id to node
        const nodeById = new Map(nodes.map(node => [node.id, node]));

        // Build neighbors map
        const neighbors = new Map<string, Node[]>();
        nodes.forEach(node => neighbors.set(node.id, []));

        links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;

            neighbors.get(sourceId)!.push(nodeById.get(targetId)!);
            neighbors.get(targetId)!.push(nodeById.get(sourceId)!);
        });

        // Compute adjusted colors with neighbor influence
        nodes.forEach(node => {
            const neighborNodes = neighbors.get(node.id)!;
            if (neighborNodes.length === 0) {
                node.adjustedColor = node.color;
                return;
            }
            
            const neighborAvg = neighborNodes.reduce((sum, n) => sum + n.color, 0) / neighborNodes.length;
            // Ensure we're actually mixing the colors (50-50)
            node.adjustedColor = (node.color + neighborAvg) / 2;
            
            // Log to verify neighbor influence
            console.log(`Node ${node.id}: original=${node.color}, neighbors avg=${neighborAvg}, adjusted=${node.adjustedColor}`);
        });

        // Use a wider color spectrum
        const colorScale = d3.scaleSequential(d3.interpolateSpectral)
            .domain([0, d3.max(nodes, d => d.adjustedColor) || 1]);

        const svg = d3.select(svgElement)
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

        if (simulation) simulation.stop();
        
        simulation = d3.forceSimulation<Node>(nodes)
            .force("link", d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(links).id((d: Node) => d.id))
            .force("charge", d3.forceManyBody())
            .force("x", d3.forceX())
            .force("y", d3.forceY());
  
        const link = svg.append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll<SVGLineElement, d3.SimulationLinkDatum<Node>>("line")
            .data(links)
            .join("line")
            .attr("stroke-width", (d: Link) => Math.sqrt((d as Link).value));
  
        const node = svg.append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll<SVGCircleElement, Node>("circle")
            .data(nodes)
            .join("circle")
            .attr("r", 8) // Increased from 5
            .attr("fill", (d: Node) => colorScale(d.adjustedColor || 0));
  
        node.append("title")
            .text((d: Node) => d.id);
  
        function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
  
        function dragged(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
  
        function dragended(event: d3.D3DragEvent<SVGCircleElement, Node, Node>) {
            if (!event.active) simulation.alphaTarget(0);
            event.subject.fx = null;
            event.subject.fy = null;
        }
  
        node.call(d3.drag<SVGCircleElement, Node>()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended));
  
        simulation.on("tick", () => {
            link
                .attr("x1", (d: Link) => (d.source as Node).x ?? 0)
                .attr("y1", (d: Link) => (d.source as Node).y ?? 0)
                .attr("x2", (d: Link) => (d.target as Node).x ?? 0)
                .attr("y2", (d: Link) => (d.target as Node).y ?? 0);
  
            node
                .attr("cx", d => d.x ?? 0)
                .attr("cy", d => d.y ?? 0);
        });
    }

    onMount(() => {
        createGraph(data);
    });

    // React to data changes
    $: if (svgElement && data) {
        createGraph(data);
    }
  
    // Clean up simulation on component destroy
    onDestroy(() => {
      if (simulation) simulation.stop();
    });
  </script>
  
  <svg
    bind:this={svgElement}
    {width}
    {height}
    style="max-width: 100%; height: auto;"
  />