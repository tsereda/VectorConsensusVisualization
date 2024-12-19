<script lang="ts">
  import * as d3 from 'd3';
  import type { ScaleLinear } from 'd3-scale';
  import type { Selection } from 'd3-selection';
  import type { Line } from 'd3-shape';
  import { propagationMetric } from '$lib/stores';

  export let width: number;
  export let height: number;

  let svgElement: SVGSVGElement;
  let svg: Selection<SVGSVGElement, unknown, null, undefined>;
  let xScale: ScaleLinear<number, number>;
  let yScale: ScaleLinear<number, number>;
  let line: Line<number>;

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  $: {
    if (svgElement && $propagationMetric) {
      // Create scales
      xScale = d3.scaleLinear()
        .domain([0, $propagationMetric.length - 1])
        .range([0, innerWidth]);

      yScale = d3.scaleLinear()
        .domain([0, 100])  // Percentage scale
        .range([innerHeight, 0]);

      // Create line generator
      line = d3.line<number>()
        .x((_, i) => xScale(i))
        .y(d => yScale(d));

      // Update SVG
      svg = d3.select(svgElement);
      svg.selectAll("*").remove();  // Clear previous content

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Draw axes
      g.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale));

      g.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale));

      // Draw line
      g.append("path")
        .datum($propagationMetric)
        .attr("class", "line")
        .attr("d", line);

      // Add labels
      g.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom)
        .attr("text-anchor", "middle")
        .text("Time Steps");

      g.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left)
        .attr("x", -innerHeight / 2)
        .attr("dy", "1em")
        .attr("text-anchor", "middle")
        .text("Informed Nodes (%)");
    }
  }
</script>

<div class="graph-container">
  <svg 
    bind:this={svgElement}
    {width}
    {height}
  />
</div>

<style>
  .graph-container {
    width: 100%;
    height: 100%;
  }
  
  :global(.line) {
    fill: none;
    stroke: #2196F3;
    stroke-width: 2;
  }

  :global(.x-axis), :global(.y-axis) {
    font-size: 12px;
  }

  :global(.x-axis path), :global(.y-axis path) {
    stroke: #666;
  }

  :global(.x-axis line), :global(.y-axis line) {
    stroke: #999;
  }
</style>