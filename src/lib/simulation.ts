import type { Node, Edge, GraphData } from './types';

function find(x: string, parent: Map<string, string>): string {
    if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!, parent));
    }
    return parent.get(x)!;
}

function union(x: string, y: string, parent: Map<string, string>, rank: Map<string, number>) {
    const rootX = find(x, parent);
    const rootY = find(y, parent);
    
    if (rootX !== rootY) {
        const rankX = rank.get(rootX)!;
        const rankY = rank.get(rootY)!;
        
        if (rankX < rankY) {
            parent.set(rootX, rootY);
        } else if (rankX > rankY) {
            parent.set(rootY, rootX);
        } else {
            parent.set(rootY, rootX);
            rank.set(rootX, rankX + 1);
        }
    }
}

export function generateMST(nodes: string[]): Edge[] {
    const edges: Edge[] = [];
    const parent = new Map<string, string>();
    const rank = new Map<string, number>();
    
    // Initialize disjoint set data structure
    nodes.forEach(node => {
        parent.set(node, node);
        rank.set(node, 0);
    });

    // Generate random edges with weights
    const allPossibleEdges: Edge[] = [];
    for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
            allPossibleEdges.push({
                source: nodes[i],
                target: nodes[j],
                weight: Math.random()
            });
        }
    }

    // Sort edges by weight
    allPossibleEdges.sort((a, b) => a.weight - b.weight);

    // Kruskal's algorithm
    for (const edge of allPossibleEdges) {
        if (find(edge.source, parent) !== find(edge.target, parent)) {
            union(edge.source, edge.target, parent, rank);
            edges.push(edge);
        }
        if (edges.length === nodes.length - 1) break;
    }

    return edges;
}

export function updateInformedStates(
    nodes: Node[], 
    neighbors: Map<string, Node[]>,
    currentStates: Map<string, boolean>,
    protocol: 'push' | 'pull' | 'pushpull',
    mixRatio: number,
    numExchanges: number
): Map<string, boolean> {
    const newStates = new Map(currentStates);
    
    for (let i = 0; i < numExchanges; i++) {
        nodes.forEach(node => {
            const nodeNeighbors = neighbors.get(node.id) || [];
            if (nodeNeighbors.length === 0) return;

            // Select random neighbor
            const neighbor = nodeNeighbors[Math.floor(Math.random() * nodeNeighbors.length)];
            
            const nodeInformed = newStates.get(node.id) || false;
            const neighborInformed = newStates.get(neighbor.id) || false;

            if (Math.random() < mixRatio) {
                switch (protocol) {
                    case 'push':
                        if (nodeInformed) newStates.set(neighbor.id, true);
                        break;
                    case 'pull':
                        if (neighborInformed) newStates.set(node.id, true);
                        break;
                    case 'pushpull':
                        if (nodeInformed || neighborInformed) {
                            newStates.set(node.id, true);
                            newStates.set(neighbor.id, true);
                        }
                        break;
                }
            }
        });
    }
    
    return newStates;
}

export function generateInitialGraph(count: number, density: number): GraphData {
    const nodes = Array.from({ length: count }, (_, i) => ({
        id: String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i/26) : ''),
        informed: i === Math.floor(Math.random() * count)
    }));

    // Get minimum spanning tree edges
    const mstEdges = generateMST(nodes.map(n => n.id));
    let links = mstEdges.map(edge => ({
        source: edge.source,
        target: edge.target,
        value: 1
    }));

    // Add additional random edges based on density
    if (density > 0) {
        const maxAdditionalEdges = Math.floor((count * (count - 1) / 2 - links.length) * density);
        const additionalEdges = new Set();
        
        while (additionalEdges.size < maxAdditionalEdges) {
            const source = nodes[Math.floor(Math.random() * nodes.length)].id;
            const target = nodes[Math.floor(Math.random() * nodes.length)].id;
            
            if (source !== target) {
                const edgeKey = [source, target].sort().join('-');
                if (!additionalEdges.has(edgeKey) && 
                    !links.some(l => (l.source === source && l.target === target) || 
                                   (l.source === target && l.target === source))) {
                    additionalEdges.add(edgeKey);
                    links.push({ source, target, value: 1 });
                }
            }
        }
    }

    return { nodes, links };
}