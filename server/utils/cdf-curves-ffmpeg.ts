/**
 * FFmpeg `curves` filter from per-channel histogram CDF (analysis output).
 */
export function buildCurvesFilterFromCDF(cdf: {
  r: number[];
  g: number[];
  b: number[];
}): string {
  /**
   * To transfer a look, we want to map a standard linear input to the reference's
   * tonal distribution. This means the i-th percentile of the target should
   * map to the i-th percentile of the reference.
   *
   * Mapping: Input (Percentile i/255) -> Value where RefCDF is i/255.
   * This is the Inverse CDF (Quantile function).
   */
  const buildInverseCurve = (cdfArr: number[]): string => {
    const points: string[] = [];
    // We sample 17 points for a smooth curve (0 to 1 in steps of 1/16)
    for (let i = 0; i <= 16; i++) {
      const percentile = i / 16;
      // Find the first index j where cdfArr[j] >= percentile
      let val = 0;
      for (let j = 0; j < 256; j++) {
        if (cdfArr[j] >= percentile) {
          val = j;
          break;
        }
      }
      const inVal = percentile.toFixed(4);
      const outVal = (val / 255).toFixed(4);
      points.push(`${inVal}/${outVal}`);
    }
    return points.join(" ");
  };

  const masterCdf = cdf.r.map((r, i) => (r + cdf.g[i] + cdf.b[i]) / 3);
  const masterCurve = buildInverseCurve(masterCdf);
  const rCurve = buildInverseCurve(cdf.r);
  const gCurve = buildInverseCurve(cdf.g);
  const bCurve = buildInverseCurve(cdf.b);

  return `curves=master='${masterCurve}':r='${rCurve}':g='${gCurve}':b='${bCurve}'`;
}
