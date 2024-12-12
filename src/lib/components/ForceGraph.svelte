<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import { writable } from 'svelte/store';

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
    export let numExchanges = 3;  // Add this
    export let mixRatio = 0.3;    // Add this
    let svgElement: SVGSVGElement;
    let simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>>;
    let container: HTMLDivElement;
    let width = 928;
    let height = 680;

    // Make color state reactive
    const colors = writable<Map<string, number>>(new Map());
    let animationFrame: number;
    let neighbors: Map<string, Node[]>;

    function createGraph(data: GraphData) {
        // Clear existing graph
        d3.select(svgElement).selectAll("*").remove();

        // Create copies of data 
        const links = data.links.map(d => ({ ...d }));
        const nodes = data.nodes.map(d => ({ ...d }));

        // Create a map of node id to node
        const nodeById = new Map(nodes.map(node => [node.id, node]));

        // Build neighbors map
        neighbors = new Map<string, Node[]>();
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

        // Initialize colors if not already set
        const currentColors = new Map();
        data.nodes.forEach(node => {
            currentColors.set(node.id, node.color);
        });
        colors.set(currentColors);

        // Replace interval with requestAnimationFrame
        let round = 0;

        function animate() {
            colors.update(currentColors => {
                const newColors = new Map();

                // For each node, calculate the new color based on neighbors
                data.nodes.forEach(node => {
                    const nodeColor = currentColors.get(node.id) ?? node.color;
                    const neighborIds = neighbors.get(node.id)?.map(neighbor => neighbor.id) ?? [];

                    let totalColor = nodeColor;
                    neighborIds.forEach(neighborId => {
                        const neighborColor = currentColors.get(neighborId) ?? node.color;
                        totalColor += neighborColor;
                    });

                    const newColor = totalColor / (neighborIds.length + 1);
                    newColors.set(node.id, newColor);
                });

                return newColors;
            });

            animationFrame = requestAnimationFrame(animate);
        }

        animate();
    }

    onMount(() => {
        createGraph(data);

        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                width = entry.contentRect.width;
                height = entry.contentRect.height;
                if (svgElement) {
                    createGraph(data);
                }
            }
        });

        if (container) {
            resizeObserver.observe(container);
        }

        return () => resizeObserver.disconnect();
    });

    // React to data changes
    $: if (svgElement && data) {
        createGraph(data);
    }
  
    // Clean up simulation on component destroy
    onDestroy(() => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        if (simulation) simulation.stop();
    });

    // Update node colors when store changes
    $: if (svgElement && $colors) {
        const colorValues = Array.from($colors.values());
        const minColor = Math.min(...colorValues);
        const maxColor = Math.max(...colorValues);

        const colorScale = d3.scaleSequential(d3.interpolateSpectral)
            .domain([minColor, maxColor]);

        d3.select(svgElement)
            .selectAll("circle")
            .attr("fill", function(d) {
                const node = d as Node;
                const color = $colors.get(node.id) ?? node.color;
                return colorScale(color);
            });
    }
  </script>
  
<div 
    class="force-graph-container" 
    bind:this={container}
>
    <svg
        bind:this={svgElement}
        {width}
        {height}
        style="width: 100%; height: 100%;"
    />
</div>

<style>
    .force-graph-container {
        width: 100%;
        height: 100%;
        position: relative;
    }

    svg {
        display: block;
    }
</style>