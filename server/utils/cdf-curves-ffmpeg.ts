/**
 * FFmpeg `curves` filter from per-channel histogram CDF (analysis output).
 */
export function buildCurvesFilterFromCDF(cdf: {
  r: number[];
  g: number[];
  b: number[];
}): string {
  const buildChannelCurve = (cdfArr: number[]): string => {
    const points: string[] = [];
    for (let i = 0; i <= 255; i += 8) {
      const inVal = (Math.min(255, i) / 255).toFixed(4);
      const outVal = Math.max(0, Math.min(1, cdfArr[Math.min(255, i)])).toFixed(
        4
      );
      points.push(`${inVal}/${outVal}`);
    }
    points.push(`1/${Math.max(0, Math.min(1, cdfArr[255])).toFixed(4)}`);
    return points.join(" ");
  };

  const masterCdf = cdf.r.map((r, i) => (r + cdf.g[i] + cdf.b[i]) / 3);
  const masterCurve = buildChannelCurve(masterCdf);
  const rCurve = buildChannelCurve(cdf.r);
  const gCurve = buildChannelCurve(cdf.g);
  const bCurve = buildChannelCurve(cdf.b);

  return `curves=master='${masterCurve}':r='${rCurve}':g='${gCurve}':b='${bCurve}'`;
}
