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
}