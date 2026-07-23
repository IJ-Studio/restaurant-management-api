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

export interface Point {
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

// ── PCA (2 componentes, vía iteración de potencias) ─────────────────────────
// Los 4 features (frecuencia, ticket, % en mesa, recencia) ya vienen
// estandarizados a media 0 en `points`, así que la matriz de covarianza es
// simplemente (Zᵀ·Z)/n. Se obtienen los 2 autovectores dominantes por
// iteración de potencias + deflación (sin librerías externas de álgebra
// lineal), y se proyecta cada cliente sobre ese plano: es el plano 2D que
// mejor conserva las distancias reales entre clientes usadas por K-Means,
// a diferencia de graficar 2 features de negocio cualesquiera (que pueden
// verse mezclados aunque los clústeres estén bien separados en 4D).

function matVecMul(matrix: number[][], v: number[]): number[] {
  return matrix.map((row) => row.reduce((s, a, i) => s + a * v[i], 0));
}

function normalizeVec(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function powerIteration(
  matrix: number[][],
  iterations = 200,
): { vector: number[]; value: number } {
  const dim = matrix.length;
  let v = normalizeVec(Array.from({ length: dim }, (_, i) => (i === 0 ? 1 : 0.1)));

  for (let i = 0; i < iterations; i++) {
    v = normalizeVec(matVecMul(matrix, v));
  }

  const Av = matVecMul(matrix, v);
  const value = v.reduce((s, x, i) => s + x * Av[i], 0); // cociente de Rayleigh
  return { vector: v, value };
}

export function pca2D(points: Point[]): { x: number; y: number }[] {
  const n = points.length;
  const dim = points[0]?.z.length ?? 0;
  if (n === 0 || dim === 0) return [];

  const cov: number[][] = Array.from({ length: dim }, () => new Array(dim).fill(0));
  for (const p of points) {
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov[i][j] += p.z[i] * p.z[j];
      }
    }
  }
  for (let i = 0; i < dim; i++) {
    for (let j = 0; j < dim; j++) cov[i][j] /= n;
  }

  const { vector: v1, value: lambda1 } = powerIteration(cov);
  const deflated = cov.map((row, i) => row.map((val, j) => val - lambda1 * v1[i] * v1[j]));
  const { vector: v2 } = powerIteration(deflated);

  return points.map((p) => ({
    x: p.z.reduce((s, val, i) => s + val * v1[i], 0),
    y: p.z.reduce((s, val, i) => s + val * v2[i], 0),
  }));
}
