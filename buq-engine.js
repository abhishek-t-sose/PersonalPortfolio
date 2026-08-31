/* ============================================================
   buq-engine.js
   Lightweight, dependency-free math behind the BUQ tool:
     - descriptive stats + Pearson correlation
     - RBF-kernel Gaussian Process Regression (from scratch)
     - Saltelli-style first-order Sobol sensitivity indices,
       computed by sampling the trained GP surrogate
   Everything here is client-side JS. No server, no uploads leave
   the browser tab.
   ============================================================ */

const BUQ = (() => {

  /* ---------- basic stats ---------- */

  function mean(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function std(arr, m = mean(arr)) {
    const v = arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1);
    return Math.sqrt(v);
  }

  function pearson(a, b) {
    const ma = mean(a), mb = mean(b);
    let num = 0, da = 0, db = 0;
    for (let i = 0; i < a.length; i++) {
      const xa = a[i] - ma, xb = b[i] - mb;
      num += xa * xb; da += xa * xa; db += xb * xb;
    }
    const denom = Math.sqrt(da * db);
    return denom === 0 ? 0 : num / denom;
  }

  // columns: array of {name, values:number[]}
  function correlationMatrix(columns) {
    const n = columns.length;
    const M = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        const r = i === j ? 1 : pearson(columns[i].values, columns[j].values);
        M[i][j] = r; M[j][i] = r;
      }
    }
    return M;
  }

  /* ---------- small linear algebra (Cholesky solve) ---------- */

  function cholesky(A) {
    const n = A.length;
    const L = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = A[i][j];
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (sum <= 0) sum = 1e-8; // guard against numerical non-PD
          L[i][j] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    return L;
  }

  function forwardSub(L, b) {
    const n = L.length, y = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let sum = b[i];
      for (let k = 0; k < i; k++) sum -= L[i][k] * y[k];
      y[i] = sum / L[i][i];
    }
    return y;
  }

  function backSub(L, y) {
    // solves L^T x = y
    const n = L.length, x = new Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let sum = y[i];
      for (let k = i + 1; k < n; k++) sum -= L[k][i] * x[k];
      x[i] = sum / L[i][i];
    }
    return x;
  }

  function choleskySolve(A, b) {
    const L = cholesky(A);
    return backSub(L, forwardSub(L, b));
  }

  /* ---------- Gaussian Process Regression (RBF kernel) ---------- */

  class GPR {
    /**
     * @param {number[][]} X  training inputs, standardized (n x d)
     * @param {number[]}   y  training targets, standardized (n)
     */
    constructor(X, y, { noise = 1e-3 } = {}) {
      this.X = X;
      this.yMean = mean(y);
      this.yStd = std(y) || 1;
      this.y = y.map(v => (v - this.yMean) / this.yStd);
      this.d = X[0].length;
      const base = GPR.medianHeuristic(X);
      // ARD-style per-dimension length scales: a plain isotropic RBF can't
      // distinguish which input actually drives the output (every dimension
      // contributes equally to kernel distance), which quietly breaks the
      // Sobol indices downstream. Instead, scale each dimension's length
      // scale inversely with how strongly it correlates with y, so the
      // kernel is sharp (sensitive) along informative axes and flat
      // (insensitive) along irrelevant ones. This is a heuristic, not a
      // marginal-likelihood optimization, but it's enough to separate
      // "matters" from "doesn't" for a quick-look tool.
      const relevance = [];
      for (let j = 0; j < this.d; j++) {
        const col = X.map(r => r[j]);
        relevance.push(Math.max(Math.abs(pearson(col, y)), 0.06));
      }
      const meanRel = mean(relevance);
      this.lengthScales = relevance.map(r => base * (meanRel / r));
      this.lengthScale = base; // kept for display purposes
      this.noise = noise;
      this._fit();
    }

    static sqDist(a, b) {
      let s = 0;
      for (let k = 0; k < a.length; k++) { const d = a[k] - b[k]; s += d * d; }
      return s;
    }

    weightedSqDist(a, b) {
      let s = 0;
      for (let k = 0; k < a.length; k++) {
        const d = (a[k] - b[k]) / this.lengthScales[k];
        s += d * d;
      }
      return s;
    }

    static medianHeuristic(X) {
      // median pairwise distance -> good default RBF length-scale
      const n = X.length;
      const dists = [];
      const cap = Math.min(n, 150); // subsample pairs for speed on large n
      for (let i = 0; i < cap; i++) {
        for (let j = i + 1; j < cap; j++) {
          dists.push(Math.sqrt(GPR.sqDist(X[i], X[j])));
        }
      }
      dists.sort((a, b) => a - b);
      const med = dists[Math.floor(dists.length / 2)] || 1;
      return med > 0 ? med : 1;
    }

    kernel(a, b) {
      return Math.exp(-this.weightedSqDist(a, b) / 2);
    }

    _fit() {
      const n = this.X.length;
      const K = Array.from({ length: n }, () => new Array(n).fill(0));
      for (let i = 0; i < n; i++) {
        for (let j = i; j < n; j++) {
          const k = this.kernel(this.X[i], this.X[j]) + (i === j ? this.noise : 0);
          K[i][j] = k; K[j][i] = k;
        }
      }
      this.alpha = choleskySolve(K, this.y);
      this.L = cholesky(K);
    }

    // mean prediction only (uncertainty band optional, computed on demand)
    predictMean(xStar) {
      let s = 0;
      for (let i = 0; i < this.X.length; i++) s += this.alpha[i] * this.kernel(this.X[i], xStar);
      return s * this.yStd + this.yMean;
    }

    predictWithVar(xStar) {
      const kStar = this.X.map(xi => this.kernel(xi, xStar));
      let meanS = 0;
      for (let i = 0; i < kStar.length; i++) meanS += this.alpha[i] * kStar[i];
      const v = forwardSub(this.L, kStar);
      let vTv = 0;
      for (let i = 0; i < v.length; i++) vTv += v[i] * v[i];
      const kss = this.kernel(xStar, xStar);
      const varS = Math.max(kss - vTv, 1e-9);
      return {
        mean: meanS * this.yStd + this.yMean,
        std: Math.sqrt(varS) * this.yStd
      };
    }
  }

  /* ---------- standardization helpers ---------- */

  function standardizeColumns(matrix) {
    // matrix: n x d array. returns {Z, means, stds}
    const n = matrix.length, d = matrix[0].length;
    const means = new Array(d).fill(0), stds = new Array(d).fill(1);
    for (let j = 0; j < d; j++) {
      const col = matrix.map(r => r[j]);
      means[j] = mean(col);
      stds[j] = std(col, means[j]) || 1;
    }
    const Z = matrix.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
    return { Z, means, stds };
  }

  /* ---------- Saltelli first-order Sobol indices via GP surrogate ---------- */

  function randUniform(min, max) { return min + Math.random() * (max - min); }

  /**
   * @param {GPR} gpr            trained GP (on standardized inputs)
   * @param {number[][]} ranges  [ [min,max], ... ] per input dim, in RAW units
   * @param {number[]} means, stds  standardization used to build gpr.X
   * @param {number} N            sample size (paper uses thousands; we use fewer since this
   *                               runs synchronously in the browser)
   */
  function sobolOnePass(gpr, ranges, means, stds, N) {
    const d = ranges.length;
    const standardize = (raw) => raw.map((v, j) => (v - means[j]) / stds[j]);

    const A = [], B = [];
    for (let i = 0; i < N; i++) {
      const a = ranges.map(([lo, hi]) => randUniform(lo, hi));
      const b = ranges.map(([lo, hi]) => randUniform(lo, hi));
      A.push(a); B.push(b);
    }

    const fA = A.map(row => gpr.predictMean(standardize(row)));
    const fB = B.map(row => gpr.predictMean(standardize(row)));
    const allF = fA.concat(fB);
    const fMean = mean(allF);
    const totalVar = std(allF, fMean) ** 2 || 1e-9;

    const S = new Array(d).fill(0);
    for (let i = 0; i < d; i++) {
      let acc = 0;
      for (let n = 0; n < N; n++) {
        const ABi = A[n].slice();
        ABi[i] = B[n][i];
        const fABi = gpr.predictMean(standardize(ABi));
        acc += fB[n] * (fABi - fA[n]);
      }
      S[i] = (acc / N) / totalVar; // not clipped yet - see caller
    }
    return S;
  }

  /**
   * A single Saltelli pass with a few hundred samples is noisy, especially
   * when most of a property's variance is explained by only one or two
   * parameters (everything else should read ~0, but Monte-Carlo noise on
   * a single pass can hand that noise a false-looking share). Averaging
   * several independent passes before clipping/normalizing cancels most
   * of that noise out.
   */
  function sobolFirstOrder(gpr, ranges, means, stds, N = 350, replicates = 5) {
    const d = ranges.length;
    const sums = new Array(d).fill(0);
    for (let r = 0; r < replicates; r++) {
      const S = sobolOnePass(gpr, ranges, means, stds, N);
      for (let i = 0; i < d; i++) sums[i] += S[i];
    }
    const avg = sums.map(s => Math.max(0, s / replicates));
    const total = avg.reduce((a, b) => a + b, 0) || 1;
    return avg.map(s => s / total);
  }

  return {
    mean, std, pearson, correlationMatrix,
    GPR, standardizeColumns, sobolFirstOrder
  };
})();
