const ctx = document.getElementById("financeChart");

new Chart(ctx, {
  type: "doughnut",
  data: {
    labels: ["Total Balance", "Total Income", "Total Expenses"],
    datasets: [
      {
        label: "Amount ($)",
        data: [91100, 98200, 7100],
        backgroundColor: ["#6c63ff", "#ff914d", "#ff4d4d"],
        borderWidth: 1,
      },
    ],
  },
  options: {
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  },
});