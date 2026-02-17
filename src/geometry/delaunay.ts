export class SimpleDelaunay {
  public triangles: Uint32Array;
  public halfedges: Int32Array;
  public hull: Uint32Array;

  
  private coords: Float32Array;

  constructor(coords: Float32Array) {
    this.coords = coords;
    const n = coords.length / 2;

    
    
    const rawTriangles = this.bowyerWatson(n);

    this.triangles = new Uint32Array(rawTriangles);

    
    
    this.halfedges = new Int32Array(this.triangles.length).fill(-1);
    this.computeHalfEdges();

    
    this.hull = this.computeHull();
  }

  private bowyerWatson(n: number): number[] {
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (let i = 0; i < n; i++) {
      const x = this.coords[2 * i];
      const y = this.coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }

    const dx = maxX - minX;
    const dy = maxY - minY;
    const deltaMax = Math.max(dx, dy);
    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    
    
    const p1 = n;
    const p2 = n + 1;
    const p3 = n + 2;

    
    
    
    const superCoords = [
      midX - 20 * deltaMax, midY - deltaMax,  
      midX, midY + 20 * deltaMax,             
      midX + 20 * deltaMax, midY - deltaMax   
    ];

    let triangles: number[] = [p1, p2, p3];

    
    const getX = (i: number) =>
        i < n ? this.coords[2 * i] : superCoords[(i - n) * 2];
    const getY = (i: number) =>
        i < n ? this.coords[2 * i + 1] : superCoords[(i - n) * 2 + 1];

    
    for (let i = 0; i < n; i++) {
      const px = this.coords[2 * i];
      const py = this.coords[2 * i + 1];

      const badTriangles: number[] =
          [];  

      
      for (let t = 0; t < triangles.length; t += 3) {
        const a = triangles[t];
        const b = triangles[t + 1];
        const c = triangles[t + 2];

        if (this.inCircumcircle(
                px, py, getX(a), getY(a), getX(b), getY(b), getX(c), getY(c))) {
          badTriangles.push(t);
        }
      }

      
      const polygon: {a: number, b: number}[] = [];
      for (const tIdx of badTriangles) {
        const tri = [triangles[tIdx], triangles[tIdx + 1], triangles[tIdx + 2]];
        for (let j = 0; j < 3; j++) {
          const edgeA = tri[j];
          const edgeB = tri[(j + 1) % 3];

          
          let shared = false;
          for (const otherTIdx of badTriangles) {
            if (tIdx === otherTIdx) continue;
            const otherTri = [
              triangles[otherTIdx], triangles[otherTIdx + 1],
              triangles[otherTIdx + 2]
            ];
            
            if (otherTri.includes(edgeA) && otherTri.includes(edgeB)) {
              shared = true;
              break;
            }
          }
          if (!shared) {
            polygon.push({a: edgeA, b: edgeB});
          }
        }
      }

      
      
      const newTriangles: number[] = [];
      for (let t = 0; t < triangles.length; t += 3) {
        let isBad = false;
        for (const bad of badTriangles) {
          if (t === bad) {
            isBad = true;
            break;
          }
        }
        if (!isBad) {
          newTriangles.push(triangles[t], triangles[t + 1], triangles[t + 2]);
        }
      }
      triangles = newTriangles;

      
      for (const edge of polygon) {
        triangles.push(edge.a, edge.b, i);
      }
    }

    
    const finalTriangles: number[] = [];
    for (let t = 0; t < triangles.length; t += 3) {
      const a = triangles[t];
      const b = triangles[t + 1];
      const c = triangles[t + 2];
      if (a < n && b < n && c < n) {
        finalTriangles.push(a, b, c);
      }
    }

    return finalTriangles;
  }

  private inCircumcircle(
      px: number, py: number, ax: number, ay: number, bx: number, by: number,
      cx: number, cy: number): boolean {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    const ux =
        ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) +
         (cx * cx + cy * cy) * (ay - by)) /
        d;
    const uy =
        ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) +
         (cx * cx + cy * cy) * (bx - ax)) /
        d;
    const rSq = (ax - ux) * (ax - ux) + (ay - uy) * (ay - uy);
    const dSq = (px - ux) * (px - ux) + (py - uy) * (py - uy);
    return dSq < rSq;  
  }

  private computeHalfEdges() {
    
    const edgeMap = new Map<string, number>();

    for (let i = 0; i < this.triangles.length; i++) {
      const start = this.triangles[i];
      const end = this.triangles[i % 3 === 2 ? i - 2 : i + 1];

      
      const key = start < end ? `${start}_${end}` : `${end}_${start}`;

      if (edgeMap.has(key)) {
        const otherEdge = edgeMap.get(key)!;
        this.halfedges[i] = otherEdge;
        this.halfedges[otherEdge] = i;
      } else {
        edgeMap.set(key, i);
      }
    }
  }

  private computeHull(): Uint32Array {
    const hull: number[] = [];
    
    let startEdge = -1;
    for (let i = 0; i < this.halfedges.length; i++) {
      if (this.halfedges[i] === -1) {
        startEdge = i;
        break;
      }
    }

    if (startEdge === -1)
      return new Uint32Array(0);  

    
    let e = startEdge;
    do {
      hull.push(this.triangles[e]);
      
      
      
      

      
      
      const tip = this.triangles[e % 3 === 2 ? e - 2 : e + 1];

      
      
      let foundNext = false;
      for (let k = 0; k < this.halfedges.length; k++) {
        if (this.halfedges[k] === -1 && this.triangles[k] === tip) {
          e = k;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) break;  
    } while (e !== startEdge && hull.length < this.triangles.length);

    return new Uint32Array(hull);
  }
}