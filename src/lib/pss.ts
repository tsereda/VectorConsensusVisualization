// PSS implementation with typed interfaces
export interface PeerNode {
    id: string;
    informed: boolean;
    age: number;
}

export interface PartialView {
    peers: Map<string, PeerNode>;
    maxSize: number;
}

// Add helper for MST creation
interface Edge {
    source: string;
    target: string;
    weight: number;
}

export class PeerSamplingService {
    private view: PartialView;
    private readonly maxSize: number;
    
    constructor(id: string, informed: boolean, maxSize: number = 30) {
        this.maxSize = maxSize;
        this.view = {
            peers: new Map([[id, { id, informed, age: 0 }]]),
            maxSize
        };
    }

    public selectPeer(): PeerNode | null {
        if (this.view.peers.size <= 1) return null;
        const peers = Array.from(this.view.peers.values());
        return peers[Math.floor(Math.random() * peers.length)];
    }

    public exchangeViews(otherView: PartialView): void {
        // Age increment
        for (const peer of this.view.peers.values()) {
            peer.age += 1;
        }

        // Merge views
        const combinedPeers = new Map([...this.view.peers]);
        for (const [id, peer] of otherView.peers) {
            if (!combinedPeers.has(id)) {
                combinedPeers.set(id, {...peer});
            }
        }

        // Keep youngest peers
        const sortedPeers = Array.from(combinedPeers.values())
            .sort((a, b) => a.age - b.age)
            .slice(0, this.maxSize);

        this.view.peers = new Map(sortedPeers.map(p => [p.id, p]));
    }

    public updateInformed(informed: boolean): void {
        const selfNode = this.view.peers.get(Array.from(this.view.peers.keys())[0]);
        if (selfNode) {
            selfNode.informed = informed;
        }
    }

    public isInformed(): boolean {
        const selfNode = this.view.peers.get(Array.from(this.view.peers.keys())[0]);
        return selfNode?.informed ?? false;
    }

    public getView(): PeerNode[] {
        return Array.from(this.view.peers.values());
    }

    public static generateMST(nodes: string[]): Edge[] {
        const edges: Edge[] = [];
        const parent = new Map<string, string>();
        const rank = new Map<string, number>();

        // Initialize disjoint set
        function makeSet(v: string) {
            parent.set(v, v);
            rank.set(v, 0);
        }

        function find(v: string): string {
            if (parent.get(v) !== v) {
                parent.set(v, find(parent.get(v)!));
            }
            return parent.get(v)!;
        }

        function union(u: string, v: string) {
            const rootU = find(u);
            const rootV = find(v);
            if (rootU !== rootV) {
                if (rank.get(rootU)! < rank.get(rootV)!) {
                    parent.set(rootU, rootV);
                } else if (rank.get(rootU)! > rank.get(rootV)!) {
                    parent.set(rootV, rootU);
                } else {
                    parent.set(rootV, rootU);
                    rank.set(rootU, rank.get(rootU)! + 1);
                }
            }
        }

        // Initialize sets
        nodes.forEach(node => makeSet(node));

        // Generate random edges with weights
        const possibleEdges: Edge[] = [];
        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                possibleEdges.push({
                    source: nodes[i],
                    target: nodes[j],
                    weight: Math.random()
                });
            }
        }

        // Sort edges by weight
        possibleEdges.sort((a, b) => a.weight - b.weight);

        // Kruskal's algorithm
        for (const edge of possibleEdges) {
            if (find(edge.source) !== find(edge.target)) {
                edges.push(edge);
                union(edge.source, edge.target);
            }
            if (edges.length === nodes.length - 1) break;
        }

        return edges;
    }
}