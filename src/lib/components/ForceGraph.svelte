<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import * as d3 from 'd3';
    import { writable } from 'svelte/store';
    import type { PeerNode } from '$lib/pss';

    // Define types for our data
    interface Node {
      id: string;
      informed: boolean;
      x?: number;
      y?: number;
      fx?: number | null;
      fy?: number | null;
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

    // Store for tracking informed state
    const informedStates = writable<Map<string, boolean>>(new Map());
    let animationFrame: number;
    let neighbors: Map<string, Node[]>;

    // Add density metrics tracking
    export let networkDensity = 0;
    export let avgDegree = 0;

    function calculateDensityMetrics(nodes: Node[], links: Link[]) {
        // Network density = actual edges / possible edges
        // For undirected graph: possible edges = n(n-1)/2
        const n = nodes.length;
        const possibleEdges = (n * (n - 1)) / 2;
        networkDensity = links.length / possibleEdges;
        
        // Average degree = 2 * edges / nodes
        avgDegree = (2 * links.length) / n;
        
        return { networkDensity, avgDegree };
    }

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

        calculateDensityMetrics(nodes, links);

        links.forEach(link => {
            const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
            const targetId = typeof link.target === 'string' ? link.target : link.target.id;

            neighbors.get(sourceId)!.push(nodeById.get(targetId)!);
            neighbors.get(targetId)!.push(nodeById.get(sourceId)!);
        });

        const svg = d3.select(svgElement)
            .attr("viewBox", [-width / 2, -height / 2, width, height]);

        if (simulation) simulation.stop();
        
        simulation = d3.forceSimulation<Node>(nodes)
            .force("link", d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(links)
                .id((d: Node) => d.id)
                .distance(150)     // Increase distance between nodes
                .strength(0.3))   // Stronger links for more stability
            .force("charge", d3.forceManyBody()
                .strength(-100)   // Stronger repulsion to prevent clustering
                .distanceMax(300)) // Limit repulsion range
            .force("center", d3.forceCenter()) // Add centering force
            .force("x", d3.forceX().strength(0.02))  // Very weak X positioning
            .force("y", d3.forceY().strength(0.02))  // Very weak Y positioning
            .velocityDecay(0.9)   // Add friction to movements
            .alphaDecay(0.01)     // Slower cooling
            .alphaTarget(0);      // Let simulation settle completely
  
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
            .attr("r", 8)
            .attr("fill", d => d.informed ? "#ff4444" : "#4444ff");
  
        node.append("title")
            .text((d: Node) => d.id);
  
        function dragstarted(event: d3.D3DragEvent<SVGCircleElement, Node>) {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            event.subject.fx = event.subject.x;
            event.subject.fy = event.subject.y;
        }
  
        function dragged(event: d3.D3DragEvent<SVGCircleElement, Node>) {
            event.subject.fx = event.x;
            event.subject.fy = event.y;
        }
  
        function dragended(event: d3.D3DragEvent<SVGCircleElement, Node>) {
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

        // Initialize informed states
        const currentStates = new Map();
        data.nodes.forEach(node => {
            currentStates.set(node.id, node.informed);
        });
        informedStates.set(currentStates);

        function animate() {
            updateInformedStates();
            animationFrame = requestAnimationFrame(animate);
        }

        animate();
    }

    function updateInformedStates() {
        informedStates.update(currentStates => {
            const newStates = new Map(currentStates);
            
            // For each node, attempt view exchanges
            data.nodes.forEach(node => {
                // Get neighbors from links
                const nodeNeighbors = data.links
                    .filter(link => 
                        (link.source as Node).id === node.id || 
                        (link.target as Node).id === node.id)
                    .map(link => 
                        (link.source as Node).id === node.id ? 
                            (link.target as Node) : 
                            (link.source as Node)
                    );

                // Randomly select neighbor for exchange
                if (nodeNeighbors.length > 0 && Math.random() < mixRatio) {
                    const neighbor = nodeNeighbors[Math.floor(Math.random() * nodeNeighbors.length)];
                    
                    // Exchange informed states
                    const nodeInformed = currentStates.get(node.id) ?? node.informed;
                    const neighborInformed = currentStates.get(neighbor.id) ?? neighbor.informed;
                    
                    if (nodeInformed || neighborInformed) {
                        newStates.set(node.id, true);
                        newStates.set(neighbor.id, true);
                    }
                }
            });
            
            return newStates;
        });
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
        // Update nodes and links while preserving simulation
        if (simulation) {
            // Preserve existing positions
            const oldNodes = new Map(simulation.nodes().map(d => [d.id, d]));
            data.nodes.forEach(node => {
                const oldNode = oldNodes.get(node.id);
                if (oldNode) {
                    node.x = oldNode.x;
                    node.y = oldNode.y;
                }
            });
            // Update simulation
            simulation.nodes(data.nodes);
            const linkForce = simulation.force("link") as d3.ForceLink<Node, d3.SimulationLinkDatum<Node>>;
            if (linkForce) linkForce.links(data.links);

            // Update visual elements
            const svg = d3.select(svgElement);
            
            // Update links
            svg.selectAll("line")
                .data(data.links)
                .join("line")
                .attr("stroke", "#999")
                .attr("stroke-opacity", 0.6)
                .attr("stroke-width", (d: Link) => Math.sqrt((d as Link).value));

            // Update nodes
            svg.selectAll("circle")
                .data(data.nodes)
                .join("circle")
                .attr("r", 8)
                .attr("fill", d => d.informed ? "#ff4444" : "#4444ff")
                .call(d3.drag<SVGCircleElement, Node>()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended));

            // Restart simulation
            simulation.alpha(0.1).restart();
        } else {
            // Initial creation
            createGraph(data);
        }
    }
  
    // Clean up simulation on component destroy
    onDestroy(() => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        if (simulation) simulation.stop();
    });

    // Update node colors when informed states change
    $: if (svgElement && $informedStates) {
        d3.select(svgElement)
            .selectAll("circle")
            .attr("fill", function(d) {
                const node = d as Node;
                const informed = $informedStates.get(node.id) ?? node.informed;
                return informed ? "#ff4444" : "#4444ff";
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