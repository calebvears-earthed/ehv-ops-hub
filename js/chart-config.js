/* ═══════════════════════════════════════════════════
   EHV OPS HUB — Chart.js Shared Config
   ═══════════════════════════════════════════════════ */

const ChartConfig = (() => {
  const COLORS = {
    green: '#2D6A4F',
    greenLight: 'rgba(45,106,79,.15)',
    amber: '#F5A623',
    amberLight: 'rgba(245,166,35,.15)',
    danger: '#DC2626',
    muted: '#6B7280',
    border: '#E5E7EB',
    surface: '#F8F7F4'
  };

  const FONT = {
    family: "'DM Sans', sans-serif",
    mono: "'JetBrains Mono', monospace",
    display: "'Sora', sans-serif"
  };

  // Shared defaults for all charts
  function applyDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.font.family = FONT.family;
    Chart.defaults.font.size = 12;
    Chart.defaults.color = COLORS.muted;
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#1A1A1A';
    Chart.defaults.plugins.tooltip.titleFont = { family: FONT.display, weight: 600, size: 12 };
    Chart.defaults.plugins.tooltip.bodyFont = { family: FONT.mono, size: 12 };
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.displayColors = false;
    Chart.defaults.elements.line.tension = 0.3;
    Chart.defaults.elements.point.radius = 3;
    Chart.defaults.elements.point.hoverRadius = 5;
  }

  // Weight chart config generator
  function weightChart(canvasId, entries, targetWeight) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    const labels = entries.map(e => {
      const d = new Date(e.date);
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
    });
    const data = entries.map(e => e.weight);

    return new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Weight',
            data,
            borderColor: COLORS.green,
            backgroundColor: COLORS.greenLight,
            fill: true,
            pointBackgroundColor: COLORS.green,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            borderWidth: 2
          },
          targetWeight ? {
            label: 'Target',
            data: new Array(data.length).fill(targetWeight),
            borderColor: COLORS.amber,
            borderDash: [6, 4],
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          } : null
        ].filter(Boolean)
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: 'index' },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: FONT.mono, size: 10 }, maxRotation: 0 }
          },
          y: {
            grid: { color: COLORS.border, drawBorder: false },
            ticks: {
              font: { family: FONT.mono, size: 11 },
              callback: v => v + ' kg'
            }
          }
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.parsed.y} kg`
            }
          }
        }
      }
    });
  }

  // Training sessions per week bar chart
  function sessionsChart(canvasId, weekData) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return null;

    return new Chart(ctx, {
      type: 'bar',
      data: {
        labels: weekData.map(w => w.label),
        datasets: [{
          data: weekData.map(w => w.count),
          backgroundColor: weekData.map(w =>
            w.current ? COLORS.amber : COLORS.greenLight
          ),
          borderColor: weekData.map(w =>
            w.current ? COLORS.amber : COLORS.green
          ),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: FONT.mono, size: 10 } } },
          y: {
            grid: { color: COLORS.border, drawBorder: false },
            ticks: { stepSize: 1, font: { family: FONT.mono, size: 10 } },
            beginAtZero: true
          }
        }
      }
    });
  }

  return { COLORS, FONT, applyDefaults, weightChart, sessionsChart };
})();
