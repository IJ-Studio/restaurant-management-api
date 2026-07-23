// Random Forest binario (CART por Gini + bagging + subespacio aleatorio de
// features por split), con soporte de peso por clase para compensar el
// desbalance (equivalente a class_weight='balanced' de scikit-learn). Sin
// librerías externas de ML — mismo criterio que kmeans.util.ts y ols.util.ts:
// con el volumen de datos de este proyecto (cientos de filas) no hace falta,
// y así queda explícito cómo se calcula cada número que se reporta.

export interface TreeNode {
  isLeaf: boolean;
  prob1: number; // fracción ponderada de clase 1 en este nodo/hoja
  featureIndex?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

export interface RandomForestModel {
  trees: TreeNode[];
  featureImportances: number[]; // alineado a featureNames, suma 1
}

interface FitParams {
  nTrees?: number;
  maxDepth?: number;
  minSamplesSplit?: number;
  minSamplesLeaf?: number;
  maxFeatures?: number; // default: sqrt(nFeatures) redondeado
  seed?: number;
}

interface Sample {
  x: number[];
  y: 0 | 1;
  w: number;
}

// PRNG determinista chico (mulberry32) para reproducibilidad del bootstrap
// y de la selección aleatoria de features por split.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedGini(w0: number, w1: number): number {
  const total = w0 + w1;
  if (total <= 0) return 0;
  const p0 = w0 / total;
  const p1 = w1 / total;
  return 1 - p0 * p0 - p1 * p1;
}

// Cap de candidatos a umbral por feature/nodo: con features continuas
// (ej. anticipación en días, casi un valor único por muestra) probar CADA
// valor único es O(n) candidatos, cada uno con un barrido O(n) de las
// muestras — un solo nodo raíz podía costar cientos de miles de
// operaciones. Se muestrean como mucho MAX_THRESHOLDS puntos (cuantiles
// aproximados de los valores ordenados), suficiente para encontrar un buen
// split sin ese costo cuadrático.
const MAX_THRESHOLDS = 16;

function candidateThresholds(sortedUniqueValues: number[]): number[] {
  const n = sortedUniqueValues.length;
  if (n < 2) return [];
  if (n - 1 <= MAX_THRESHOLDS) {
    const out: number[] = [];
    for (let i = 0; i < n - 1; i++) out.push((sortedUniqueValues[i] + sortedUniqueValues[i + 1]) / 2);
    return out;
  }

  const out: number[] = [];
  for (let q = 1; q <= MAX_THRESHOLDS; q++) {
    const i = Math.min(Math.max(Math.floor((q * n) / (MAX_THRESHOLDS + 1)), 0), n - 2);
    out.push((sortedUniqueValues[i] + sortedUniqueValues[i + 1]) / 2);
  }
  return Array.from(new Set(out)).sort((a, b) => a - b);
}

function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildTree(
  samples: Sample[],
  depth: number,
  params: Required<Omit<FitParams, 'seed'>>,
  rng: () => number,
  importances: number[],
): TreeNode {
  let w0 = 0;
  let w1 = 0;
  for (const s of samples) (s.y === 1 ? (w1 += s.w) : (w0 += s.w));
  const totalW = w0 + w1;
  const prob1 = totalW > 0 ? w1 / totalW : 0;

  const isPure = w0 === 0 || w1 === 0;
  if (depth >= params.maxDepth || samples.length < params.minSamplesSplit || isPure) {
    return { isLeaf: true, prob1 };
  }

  const nFeatures = samples[0].x.length;
  const featureOrder = shuffleInPlace(
    Array.from({ length: nFeatures }, (_, i) => i),
    rng,
  );
  const candidateFeatures = featureOrder.slice(0, params.maxFeatures);
  const parentGini = weightedGini(w0, w1);

  let best: {
    feature: number;
    threshold: number;
    gain: number;
    leftIdx: number[];
    rightIdx: number[];
  } | null = null;

  for (const f of candidateFeatures) {
    const values = Array.from(new Set(samples.map((s) => s.x[f]))).sort((a, b) => a - b);
    const thresholds = candidateThresholds(values);

    for (const threshold of thresholds) {
      const leftIdx: number[] = [];
      const rightIdx: number[] = [];
      let lw0 = 0;
      let lw1 = 0;
      let rw0 = 0;
      let rw1 = 0;

      samples.forEach((s, idx) => {
        if (s.x[f] <= threshold) {
          leftIdx.push(idx);
          s.y === 0 ? (lw0 += s.w) : (lw1 += s.w);
        } else {
          rightIdx.push(idx);
          s.y === 0 ? (rw0 += s.w) : (rw1 += s.w);
        }
      });

      if (leftIdx.length < params.minSamplesLeaf || rightIdx.length < params.minSamplesLeaf) {
        continue;
      }

      const leftW = lw0 + lw1;
      const rightW = rw0 + rw1;
      const childGini =
        (leftW / totalW) * weightedGini(lw0, lw1) + (rightW / totalW) * weightedGini(rw0, rw1);
      const gain = parentGini - childGini;

      if (!best || gain > best.gain) {
        best = { feature: f, threshold, gain, leftIdx, rightIdx };
      }
    }
  }

  if (!best || best.gain <= 1e-12) {
    return { isLeaf: true, prob1 };
  }

  // Importancia por disminución de impureza ponderada por muestras (MDI),
  // acumulada sobre todos los árboles y normalizada al final del fit.
  importances[best.feature] += totalW * best.gain;

  const leftSamples = best.leftIdx.map((i) => samples[i]);
  const rightSamples = best.rightIdx.map((i) => samples[i]);

  return {
    isLeaf: false,
    prob1,
    featureIndex: best.feature,
    threshold: best.threshold,
    left: buildTree(leftSamples, depth + 1, params, rng, importances),
    right: buildTree(rightSamples, depth + 1, params, rng, importances),
  };
}

export function fitRandomForest(
  X: number[][],
  y: (0 | 1)[],
  params: FitParams = {},
): RandomForestModel {
  const n = X.length;
  const nFeatures = X[0].length;
  const {
    nTrees = 150,
    maxDepth = 6,
    minSamplesSplit = 10,
    minSamplesLeaf = 5,
    maxFeatures = Math.max(1, Math.round(Math.sqrt(nFeatures))),
    seed = 77,
  } = params;

  const rng = mulberry32(seed);

  // class_weight='balanced': w_c = n / (n_clases * count_c)
  const count1 = y.reduce((s, v) => s + (v === 1 ? 1 : 0), 0);
  const count0 = n - count1;
  const weight1 = count1 > 0 ? n / (2 * count1) : 0;
  const weight0 = count0 > 0 ? n / (2 * count0) : 0;

  const allSamples: Sample[] = X.map((x, i) => ({
    x,
    y: y[i],
    w: y[i] === 1 ? weight1 : weight0,
  }));

  const fitParams = { nTrees, maxDepth, minSamplesSplit, minSamplesLeaf, maxFeatures };
  const importances = new Array(nFeatures).fill(0);
  const trees: TreeNode[] = [];

  for (let t = 0; t < nTrees; t++) {
    // Bootstrap: muestreo con reemplazo del tamaño del set de entrenamiento
    const bootstrap: Sample[] = new Array(n);
    for (let i = 0; i < n; i++) bootstrap[i] = allSamples[Math.floor(rng() * n)];
    trees.push(buildTree(bootstrap, 0, fitParams, rng, importances));
  }

  const totalImportance = importances.reduce((s, v) => s + v, 0) || 1;
  const featureImportances = importances.map((v) => v / totalImportance);

  return { trees, featureImportances };
}

function predictTree(node: TreeNode, x: number[]): number {
  let cur = node;
  while (!cur.isLeaf) {
    cur = x[cur.featureIndex!] <= cur.threshold! ? cur.left! : cur.right!;
  }
  return cur.prob1;
}

export function predictProba(model: RandomForestModel, x: number[]): number {
  const sum = model.trees.reduce((s, tree) => s + predictTree(tree, x), 0);
  return model.trees.length > 0 ? sum / model.trees.length : 0;
}
