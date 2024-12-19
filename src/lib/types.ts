// Graph Types
export interface Node {
    id: string;
    informed: boolean;
    x?: number;
    y?: number;
    fx?: number | null;
    fy?: number | null;
}

export interface Link {
    source: string | Node;
    target: string | Node;
    value: number;
}

export interface GraphData {
    nodes: Node[];
    links: Link[];
}

// Simulation Types
export interface SimulationConfig {
    nodeCount: number;
    numExchanges: number;
    mixRatio: number;
    density: number;
    protocol: 'push' | 'pull' | 'pushpull';
    isRunning: boolean;
}

export interface Edge {
    source: string;
    target: string;
    weight: number;
}