<script lang="ts">
  import * as d3 from 'd3';
  import type { ScaleLinear } from 'd3-scale';
  import type { Selection } from 'd3-selection';
  import type { Line } from 'd3-shape';
  import { propagationMetric, trials } from '$lib/stores';

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

  // Add color scale for different trials
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  $: {
    if (svgElement && $trials && $trials.length > 0) {
      // Create scales
      const maxLength = Math.max(...$trials.map(t => t.metrics.length));
      xScale = d3.scaleLinear()
        .domain([0, maxLength - 1])
        .range([0, innerWidth]);

      yScale = d3.scaleLinear()
        .domain([0, 100])  // Percentage scale
        .range([innerHeight, 0]);

      // Create line generator
      line = d3.line<number>()
        .x((_, i) => xScale(i))
        .y(d => yScale(d));

      // Clear previous content
      svg = d3.select(svgElement);
      svg.selectAll("*").remove();

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

      // Add legend
      const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${innerWidth - 120}, 10)`);

      // Draw lines for each trial
      $trials.forEach((trial, index) => {
        const trialColor = colorScale(trial.id);
        g.append("path")
          .datum(trial.metrics)
          .attr("class", "line")
          .attr("d", line)
          .attr("stroke", trialColor)
          .attr("fill", "none")
          .attr("stroke-width", 2);

        // Add legend entry
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${index * 20})`);

        legendRow.append("rect")
          .attr("width", 15)
          .attr("height", 15)
          .attr("fill", trialColor);

        legendRow.append("text")
          .attr("x", 20)
          .attr("y", 12)
          .text(`Trial ${index + 1}`);
      });

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

  :global(.legend text) {
    font-size: 12px;
  }
</style>