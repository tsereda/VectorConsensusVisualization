<script lang="ts">
  import * as d3 from 'd3';
  import type { ScaleLinear } from 'd3-scale';
  import type { Selection } from 'd3-selection';
  import type { Line } from 'd3-shape';

  export let width: number;
  export let height: number;
  export let data: number[] = [];

  let xScale: ScaleLinear<number, number>;
  let yScale: ScaleLinear<number, number>;
  let line: Line<number>;
  let svgElement: SVGSVGElement;
  let svg: Selection<SVGSVGElement, unknown, null, undefined>;

  const margin = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  $: {
    // Create scales
    xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([0, innerWidth]);

    yScale = d3.scaleLinear()
      .domain([0, d3.max(data) || 0])
      .range([innerHeight, 0]);

    // Create line generator
    line = d3.line<number>()
      .x((_, i) => xScale(i))
      .y(d => yScale(d));

    if (svgElement) {
      svg = d3.select(svgElement);
      
      // Update graph
      xScale.range([0, innerWidth]);
      yScale.range([innerHeight, 0]);

      // Update SVG container
      svg.attr('width', width)
         .attr('height', height);

      // Draw the line
      const path = svg.selectAll('path.line')
        .data([data]);

      path.enter()
        .append('path')
        .merge(path as any)
        .attr('class', 'line')
        .attr('d', line);

      svg.selectAll('.axis').remove();

      // Add axes
      svg.append('g')
         .attr('class', 'axis')
         .attr('transform', `translate(0,${innerHeight})`)
         .call(d3.axisBottom(xScale));

      svg.append('g')
         .attr('class', 'axis')
         .call(d3.axisLeft(yScale));
    }
  }
</script>

<div class="graph-container">
  <svg bind:this={svgElement}>
    <g transform={`translate(${margin.left},${margin.top})`}>
    </g>
  </svg>
</div>

<style>
  .graph-container {
    width: 100%;
    height: 100%;
  }
  
  :global(.line) {
    fill: none;
    stroke: #000;
    stroke-width: 1.5;
  }
</style>