// Regresión lineal múltiple (mínimos cuadrados con ridge chico para
// estabilidad numérica) resuelta por eliminación de Gauss-Jordan sobre las
// ecuaciones normales (XᵀX + λI)β = Xᵀy. Con λ→0 es OLS puro; el ridge solo
// evita que la matriz sea singular por las variables dummy colineales
// (día de la semana). Sin librerías externas: con el volumen de datos de
// este proyecto (miles de filas, ~10 features) no hace falta.

function transposeTimesSelf(X: number[][]): number[][] {
  const n = X.length;
  const p = X[0].length;
  const result = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += X[k][i] * X[k][j];
      result[i][j] = sum;
    }
  }
  return result;
}

function transposeTimesVector(X: number[][], y: number[]): number[] {
  const n = X.length;
  const p = X[0].length;
  const result = new Array(p).fill(0);
  for (let i = 0; i < p; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += X[k][i] * y[k];
    result[i] = sum;
  }
  return result;
}

function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[pivotRow][col])) pivotRow = row;
    }
    [M[col], M[pivotRow]] = [M[pivotRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-12) continue; // columna degenerada: coeficiente queda en 0

    for (let k = col; k <= n; k++) M[col][k] /= pivot;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = M[row][col];
      for (let k = col; k <= n; k++) M[row][k] -= factor * M[col][k];
    }
  }

  return M.map((row) => row[n]);
}

/** coeficientes[0] es el intercepto; coeficientes[i+1] corresponde a features[i] */
export function fitLinearRegression(
  X: number[][],
  y: number[],
  ridge = 1e-3,
): number[] {
  const Xb = X.map((row) => [1, ...row]);
  const p = Xb[0].length;

  const XtX = transposeTimesSelf(Xb);
  for (let i = 1; i < p; i++) XtX[i][i] += ridge; // no regulariza el intercepto

  const Xty = transposeTimesVector(Xb, y);
  return solveLinearSystem(XtX, Xty);
}

export function predictLinearRegression(
  coefficients: number[],
  features: number[],
): number {
  let pred = coefficients[0];
  for (let i = 0; i < features.length; i++) pred += coefficients[i + 1] * features[i];
  return Math.max(0, pred); // no tiene sentido predecir unidades negativas
}

export function wape(yTrue: number[], yPred: number[]): number {
  const num = yTrue.reduce((s, y, i) => s + Math.abs(y - yPred[i]), 0);
  const den = yTrue.reduce((s, y) => s + y, 0) || 1e-9;
  return num / den;
}
