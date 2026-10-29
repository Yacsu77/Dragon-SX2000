/**
 * Amostras de RAM e CPU enquanto a suíte roda.
 *
 * Usa app.getAppMetrics(), o mesmo caminho do medidor de desempenho.
 * GPU percentual fica vazio de propósito: ver probe/machine.js.
 */

function sample(app) {
  let metrics = [];
  try {
    metrics = app.getAppMetrics();
  } catch {
    metrics = [];
  }

  let ramKB = 0;
  let cpuPercent = 0;
  metrics.forEach((item) => {
    ramKB += item.memory && item.memory.workingSetSize ? item.memory.workingSetSize : 0;
    cpuPercent += item.cpu && item.cpu.percentCPUUsage ? item.cpu.percentCPUUsage : 0;
  });

  return {
    at: new Date().toISOString(),
    ramMB: Math.round((ramKB / 1024) * 10) / 10,
    cpuPercent: Math.round(cpuPercent * 10) / 10,
    gpuPercent: null,
    processes: metrics.length,
  };
}

function start(app, intervalMs) {
  const samples = [];
  samples.push(sample(app));
  const timer = setInterval(() => {
    samples.push(sample(app));
  }, intervalMs);
  return {
    samples,
    stop() {
      clearInterval(timer);
      samples.push(sample(app));
    },
  };
}

module.exports = {
  start,
};
