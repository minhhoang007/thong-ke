import { getEnsembleData, runBacktest } from '$lib/db/queries/stats.js';

export function load() {
  const ensemble = getEnsembleData();
  const backtest = ensemble ? runBacktest(30) : null;
  return { ensemble, backtest };
}
