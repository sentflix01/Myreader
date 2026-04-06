// dashboard.js - Only pie charts, memory safe
(function () {
  const chartInstances = {};

  function destroyChart(canvasId) {
    if (chartInstances[canvasId]) {
      chartInstances[canvasId].destroy();
      delete chartInstances[canvasId];
    } else {
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        const existing = Chart.getChart(canvas);
        if (existing) {
          existing.destroy();
        }
      }
    }
  }

  function createPieChart(canvasId, labels, values) {
    destroyChart(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    chartInstances[canvasId] = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            data: values,
            backgroundColor: [
              '#3b82f6',
              '#22c55e',
              '#f97316',
              '#a855f7',
              '#ef4444',
            ],
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
      },
    });
  }

  function initCharts() {
    const data = window.__dashboardData;
    if (!data) return;

    // Only create pie charts where needed
    if (!data.user) {
      // Public pie chart
      const tierLabels = [],
        tierValues = [];
      if (data.usersByTier) {
        if (data.usersByTier.free) {
          tierLabels.push('Free');
          tierValues.push(data.usersByTier.free);
        }
        if (data.usersByTier.premium) {
          tierLabels.push('Starter');
          tierValues.push(data.usersByTier.premium);
        }
        if (data.usersByTier.enterprise) {
          tierLabels.push('Enterprise');
          tierValues.push(data.usersByTier.enterprise);
        }
      }
      createPieChart('publicPieChart', tierLabels, tierValues);
    }

    if (data.user && data.user.role === 'Admin') {
      // Admin pie chart
      const tierLabels = [],
        tierValues = [];
      if (data.usersByTier) {
        if (data.usersByTier.free) {
          tierLabels.push('Free');
          tierValues.push(data.usersByTier.free);
        }
        if (data.usersByTier.premium) {
          tierLabels.push('Starter');
          tierValues.push(data.usersByTier.premium);
        }
        if (data.usersByTier.enterprise) {
          tierLabels.push('Enterprise');
          tierValues.push(data.usersByTier.enterprise);
        }
      }
      createPieChart('adminPieChart', tierLabels, tierValues);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCharts);
  } else {
    initCharts();
  }
})();
