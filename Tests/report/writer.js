/**
 * Grava o relatório da suíte em JSON e em Markdown.
 *
 * O bloco gates fica vazio até existir controle de qualidade.
 */

const fs = require('fs');
const path = require('path');

function stamp(date) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function write(root, report) {
  const dir = path.join(root, 'Tests', 'reports');
  fs.mkdirSync(dir, { recursive: true });
  const base = `${stamp(new Date(report.collectedAt))}-${report.machine.arch}`;
  const jsonPath = path.join(dir, `${base}.json`);
  const mdPath = path.join(dir, `${base}.md`);
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(mdPath, markdown(report));
  return { jsonPath, mdPath };
}

function markdown(report) {
  const lines = [
    `# Suíte DSX`,
    ``,
    `- Data: ${report.collectedAt}`,
    `- Máquina: ${report.machine.model} · ${report.machine.platform} ${report.machine.release} · ${report.machine.arch}`,
    `- CPU: ${report.machine.cpu} (${report.machine.cpuCount})`,
    `- RAM total: ${report.machine.ramTotalMB} MB`,
    `- GPU: ${report.machine.gpu.name || 'não identificada'}`,
    `- Uso de GPU: ${report.machine.gpu.usagePercent == null ? report.machine.gpu.note : `${report.machine.gpu.usagePercent}%`}`,
    `- Arranque até a janela: ${report.boot.durationMs} ms`,
    `- Criação do usuário: ${report.user.createMs} ms${report.user.error ? ` (${report.user.error})` : ''}`,
    ``,
    `## Testes`,
    ``,
    `| Teste | Resultado | Duração |`,
    `|---|---|---|`,
  ];

  report.tests.forEach((test) => {
    lines.push(`| ${test.name} | ${test.ok ? 'ok' : 'falha'} | ${test.durationMs} ms |`);
  });

  report.tests.forEach((test) => {
    lines.push('', `### ${test.name}`, '');
    test.steps.forEach((step) => {
      const load = step.loadMs != null ? `, carga ${step.loadMs} ms` : '';
      const wait = step.delayBeforeMs ? `, espera ${step.delayBeforeMs} ms` : '';
      const recommend = step.recommendMs != null ? `, recomendação ${step.recommendMs} ms` : '';
      lines.push(`- ${step.ok ? 'ok' : 'falha'} ${step.name}: ${step.durationMs} ms${load}${recommend}${wait}`);
      if (step.note) lines.push(`  - ${step.note}`);
      if (step.frozenAt != null) lines.push(`  - congelou com ${step.frozenAt} webviews`);
      if (step.error) lines.push(`  - ${step.error}`);
    });
  });

  const last = report.samples[report.samples.length - 1];
  if (last) {
    lines.push('', '## Recursos no fim', '', `- RAM: ${last.ramMB} MB`, `- CPU: ${last.cpuPercent}%`, `- GPU: ${last.gpuPercent == null ? 'não medido' : `${last.gpuPercent}%`}`);
  }

  lines.push('', '## Controle de qualidade', '', 'Nenhum parâmetro de gate nesta versão.', '');
  return lines.join('\n');
}

module.exports = {
  write,
};
