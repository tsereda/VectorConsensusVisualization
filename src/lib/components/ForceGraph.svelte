<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { writable } from 'svelte/store';
  import * as d3 from 'd3';

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
    source: string | Node;
    target: string | Node;
    value: number;
  }

  interface GraphData {
    nodes: Node[];
    links: Link[];
  }

  export let isRunning: boolean = false;
  export let data: GraphData;
  export let numExchanges = 3;
  export let mixRatio = 0.3;

  let svgElement: SVGSVGElement;
  let simulation: d3.Simulation<Node, d3.SimulationLinkDatum<Node>>;
  let container: HTMLDivElement;
  let width = 928;
  let height = 680;

  // Store for tracking informed state
  const informedStates = writable<Map<string, boolean>>(new Map());
  const dispatch = createEventDispatcher();
  let animationFrame: number;
  let neighbors: Map<string, Node[]>;

  // Hardcoded parameter to switch between protocols
  const protocol = 'push'; // Change to 'push', 'pull', or 'pushpull'

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

    const svg = d3.select(svgElement)
      .attr("viewBox", [-width / 2, -height / 2, width, height]);

    if (simulation) simulation.stop();

    simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(links).id((d: Node) => d.id))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("x", d3.forceX().strength(0.1))
      .force("y", d3.forceY().strength(0.1));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll<SVGLineElement, d3.SimulationLinkDatum<Node>>("line")
      .data(links)
      .join("line")
      .attr("stroke-width", (d: Link) => Math.sqrt(d.value));

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

    // Initialize informed states
    const currentStates = new Map();
    data.nodes.forEach(node => {
      currentStates.set(node.id, node.informed);
    });
    informedStates.set(currentStates);

    function animate() {
      if (isRunning) {
        if (protocol === 'push') {
          updateInformedStatesPush();
        } else if (protocol === 'pull') {
          updateInformedStatesPull();
        } else if (protocol === 'pushpull') {
          updateInformedStatesPushPull();
        }
      }
      animationFrame = requestAnimationFrame(animate);
    }

    animate();
  }

  function updateInformedStatesPull() {
    informedStates.update(currentStates => {
      const newStates = new Map();

      // Update informed states based on neighbors
      for (let i = 0; i < numExchanges; i++) {
        data.nodes.forEach(node => {
          const nodeInformed = currentStates.get(node.id) ?? node.informed;
          const neighborIds = neighbors.get(node.id)?.map(n => n.id) ?? [];

          if (neighborIds.length > 0) {
            // Randomly select a neighbor
            const randomNeighborId = neighborIds[Math.floor(Math.random() * neighborIds.length)];
            const neighborInformed = currentStates.get(randomNeighborId) ?? false;

            // Update informed state based on neighbor
            const newInformed = nodeInformed || (Math.random() < mixRatio && neighborInformed);
            newStates.set(node.id, newInformed);
          } else {
            newStates.set(node.id, nodeInformed);
          }
        });
      }

      // Dispatch event with updated informed states
      dispatch('informedStatesChange', { informedStates: new Map(newStates) });

      return newStates;
    });
  }

  function updateInformedStatesPush() {
    informedStates.update(currentStates => {
      const newStates = new Map(currentStates);

      // Update informed states based on neighbors
      for (let i = 0; i < numExchanges; i++) {
        data.nodes.forEach(node => {
          const nodeInformed = currentStates.get(node.id) ?? node.informed;
          if (nodeInformed) {
            const neighborIds = neighbors.get(node.id)?.map(n => n.id) ?? [];

            neighborIds.forEach(neighborId => {
              const neighborInformed = currentStates.get(neighborId) ?? false;
              if (!neighborInformed && Math.random() < mixRatio) {
                newStates.set(neighborId, true);
              }
            });
          }
        });
      }

      // Dispatch event with updated informed states
      dispatch('informedStatesChange', { informedStates: new Map(newStates) });

      return newStates;
    });
  }

  function updateInformedStatesPushPull() {
    informedStates.update(currentStates => {
      const newStates = new Map(currentStates);

      // Update informed states based on neighbors
      for (let i = 0; i < numExchanges; i++) {
        data.nodes.forEach(node => {
          const nodeInformed = currentStates.get(node.id) ?? node.informed;
          const neighborIds = neighbors.get(node.id)?.map(n => n.id) ?? [];

          if (neighborIds.length > 0) {
            // Randomly select a neighbor
            const randomNeighborId = neighborIds[Math.floor(Math.random() * neighborIds.length)];
            const neighborInformed = currentStates.get(randomNeighborId) ?? false;

            // Push: Inform the neighbor if this node is informed
            if (nodeInformed && Math.random() < mixRatio) {
              newStates.set(randomNeighborId, true);
            }

            // Pull: Update this node's informed state based on the neighbor
            if (!nodeInformed && Math.random() < mixRatio && neighborInformed) {
              newStates.set(node.id, true);
            }
          }
        });
      }

      // Dispatch event with updated informed states
      dispatch('informedStatesChange', { informedStates: new Map(newStates) });

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
      .attr("fill", function (d) {
        const node = d as Node;
        const informed = $informedStates.get(node.id) ?? node.informed;
        return informed ? "#ff4444" : "#4444ff";
      });

    // Dispatch event with updated informed states
    dispatch('informedStatesChange', { informedStates: new Map($informedStates) });
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