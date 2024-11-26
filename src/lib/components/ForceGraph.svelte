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
  
    onMount(() => {
      // Create a copy of the data to avoid mutating the original
      const links = data.links.map(d => ({...d}));
      const nodes = data.nodes.map(d => ({...d}));
  
      // Color scale
      const color = d3.scaleOrdinal<number, string>(d3.schemeCategory10);
  
      // Create SVG
      const svg = d3.select(svgElement)
        .attr("viewBox", [-width / 2, -height / 2, width, height]);
  
      // Create the simulation
      simulation = d3.forceSimulation<Node>(nodes)
        .force("link", d3.forceLink<Node, d3.SimulationLinkDatum<Node>>(links).id((d: Node) => d.id))
        .force("charge", d3.forceManyBody())
        .force("x", d3.forceX())
        .force("y", d3.forceY());
  
      // Add links
      const link = svg.append("g")
        .attr("stroke", "#999")
        .attr("stroke-opacity", 0.6)
        .selectAll<SVGLineElement, d3.SimulationLinkDatum<Node>>("line")
        .data(links)
        .join("line")
        .attr("stroke-width", (d: Link) => Math.sqrt((d as Link).value));
  
      // Add nodes
      const node = svg.append("g")
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .selectAll<SVGCircleElement, Node>("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("fill", (d: Node) => color(d.color));
  
      // Add titles
      node.append("title")
        .text((d: Node) => d.id);
  
      // Drag behavior functions
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
  
      // Add drag behavior
      node.call(d3.drag<SVGCircleElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));
  
      // Update positions on simulation tick
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
    });
  
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