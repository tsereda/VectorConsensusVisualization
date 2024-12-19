import { writable, derived } from 'svelte/store';
import type { GraphData, SimulationConfig } from './types';

export const config = writable<SimulationConfig>({
    nodeCount: 10,
    numExchanges: 3,
    mixRatio: 0.3,
    density: 0,
    protocol: 'push',
    isRunning: false,
    selectedNodeId: null
});

export const graphData = writable<GraphData>({ nodes: [], links: [] });
export const informedStates = writable<Map<string, boolean>>(new Map());
export const propagationMetric = writable<number[]>([]);

export const informedPercentage = derived(
    [graphData, informedStates], 
    ([$graphData, $informedStates]) => {
        const informedCount = $graphData.nodes.filter(node => 
            $informedStates.get(node.id) ?? node.informed
        ).length;
        return (informedCount / $graphData.nodes.length) * 100;
    }
);