// Implementación propia de K-Means (con inicialización k-means++ y
// reinicios múltiples) y del índice de silueta. Sin librerías externas de
// ML: el volumen de datos de este proyecto (cientos de clientes) no lo
// amerita y así queda claro cómo se calcula cada número que se muestra.

export interface ClientFeatures {
  clienteId: string;
  frecuencia: number;
  ticketPromedio: number;
  proporcionMesa: number;
  recenciaDias: number;
}

interface Point {
  clienteId: string;
  z: number[];
}

const FEATURE_KEYS: (keyof ClientFeatures)[] = [
  'frecuencia',
  'ticketPromedio',
  'proporcionMesa',
  'recenciaDias',
];

function standardize(rows: ClientFeatures[]): Point[] {
  const n = rows.length;
  const means = FEATURE_KEYS.map(
    (k) => rows.reduce((s, r) => s + (r[k] as number), 0) / n,
  );
  const stds = FEATURE_KEYS.map((k, i) => {
    const variance =
      rows.reduce((s, r) => s + ((r[k] as number) - means[i]) ** 2, 0) / n;
    return Math.sqrt(variance) || 1; // evita dividir entre 0 si una feature es constante
  });

  return rows.map((r) => ({
    clienteId: r.clienteId,
    z: FEATURE_KEYS.map((k, i) => ((r[k] as number) - means[i]) / stds[i]),
  }));
}

function euclidean(a: number[], b: number[]): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

function kmeansPlusPlusInit(points: Point[], k: number): number[][] {
  const centroids: number[][] = [];
  centroids.push([...points[Math.floor(Math.random() * points.length)].z]);

  while (centroids.length < k) {
    const distances = points.map((p) =>
      Math.min(...centroids.map((c) => euclidean(p.z, c) ** 2)),
    );
    const sum = distances.reduce((s, d) => s + d, 0);
    let r = Math.random() * sum;
    let idx = 0;
    for (; idx < distances.length - 1; idx++) {
      r -= distances[idx];
      if (r <= 0) break;
    }
    centroids.push([...points[idx].z]);
  }

  return centroids;
}

function runKmeansOnce(
  points: Point[],
  k: number,
  maxIter = 100,
): { assignments: number[]; centroids: number[][]; inertia: number } {
  let centroids = kmeansPlusPlusInit(points, k);
  let assignments = new Array(points.length).fill(-1);

  for (let iter = 0; iter < maxIter; iter++) {
    const newAssignments = points.map((p) => {
      let best = 0;
      let bestDist = Infinity;
      centroids.forEach((c, ci) => {
        const d = euclidean(p.z, c);
        if (d < bestDist) {
          bestDist = d;
          best = ci;
        }
      });
      return best;
    });

    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;

    const dim = points[0].z.length;
    const sums = Array.from({ length: k }, () => new Array(dim).fill(0));
    const counts = new Array(k).fill(0);
    points.forEach((p, i) => {
      const c = assignments[i];
      counts[c]++;
      p.z.forEach((v, d) => (sums[c][d] += v));
    });
    centroids = sums.map((sum, c) =>
      counts[c] > 0 ? sum.map((v) => v / counts[c]) : centroids[c],
    );

    if (!changed) break;
  }

  const inertia = points.reduce(
    (s, p, i) => s + euclidean(p.z, centroids[assignments[i]]) ** 2,
    0,
  );
  return { assignments, centroids, inertia };
}

export function kmeans(rows: ClientFeatures[], k: number, restarts = 8) {
  const points = standardize(rows);

  let best: ReturnType<typeof runKmeansOnce> | null = null;
  for (let r = 0; r < restarts; r++) {
    const result = runKmeansOnce(points, k);
    if (!best || result.inertia < best.inertia) best = result;
  }

  return { points, assignments: best!.assignments, centroids: best!.centroids };
}

export function silhouetteScore(
  points: Point[],
  assignments: number[],
  k: number,
): number {
  const n = points.length;
  if (n <= k) return 0;

  const clusterIdx: number[][] = Array.from({ length: k }, () => []);
  assignments.forEach((c, i) => clusterIdx[c].push(i));

  let total = 0;
  let counted = 0;

  for (let i = 0; i < n; i++) {
    const ci = assignments[i];
    const sameCluster = clusterIdx[ci].filter((j) => j !== i);
    if (sameCluster.length === 0) continue; // clúster de 1 punto: silueta indefinida

    const a =
      sameCluster.reduce((s, j) => s + euclidean(points[i].z, points[j].z), 0) /
      sameCluster.length;

    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === ci || clusterIdx[c].length === 0) continue;
      const avgDist =
        clusterIdx[c].reduce((s, j) => s + euclidean(points[i].z, points[j].z), 0) /
        clusterIdx[c].length;
      if (avgDist < b) b = avgDist;
    }
    if (!Number.isFinite(b)) continue;

    total += (b - a) / Math.max(a, b);
    counted++;
  }

  return counted > 0 ? total / counted : 0;
}
