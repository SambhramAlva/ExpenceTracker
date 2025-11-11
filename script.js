// --- Simple Splitwise-Style Expense Tracker ---

const expenseModal = document.getElementById("expenseModal");
const groupExpenseModal = document.getElementById("groupExpenseModal");
const resetBtn = document.getElementById("resetExpenses");

// --- Helpers ---
const getData = () => JSON.parse(localStorage.getItem("expenses") || "[]");
const saveData = (d) => localStorage.setItem("expenses", JSON.stringify(d));
const clearData = () => { localStorage.removeItem("expenses"); location.reload(); };

// --- Chart ---
let chart;
function updateChart(owe, owed) {
  const ctx = document.querySelector("canvas");
  if (!ctx) return;
  if (!chart) {
    chart = new Chart(ctx, {
      type: "doughnut",
      data: { labels: ["You Owe", "You’re Owed"], datasets: [{ data: [owe, owed], backgroundColor: ["#ff4d4d", "#6c63ff"] }] },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  } else {
    chart.data.datasets[0].data = [owe, owed];
    chart.update();
  }
}

// --- Add Expense ---
function addExpense(title, amount, payer, people) {
  if (!title || !amount || !payer || !people.length) return alert("Fill all fields!");
  const list = getData();
  list.unshift({ title, amount, payer, people });
  saveData(list);
  render();
}

// --- Render Everything ---
function render() {
  const data = getData();
  let owe = 0, owed = 0;
  data.forEach(e => {
    const share = e.amount / e.people.length;
    if (e.payer === "You") owed += (e.people.length - 1) * share;
    else if (e.people.includes("You")) owe += share;
  });

  // DASHBOARD
  if (document.getElementById("financeChart")) {
    document.querySelector(".cards .purple p").textContent = `$${owe.toFixed(2)}`;
    document.querySelector(".cards .orange p").textContent = `$${owed.toFixed(2)}`;
    const list = document.querySelector(".transactions ul");
    list.innerHTML = data.map(e => `<li><span>💸 ${e.title}</span><span>Paid by ${e.payer} - $${e.amount}</span></li>`).join("");
    updateChart(owe, owed);
  }

  // GROUPS
  if (document.getElementById("groupsChart")) {
    const list = document.querySelector(".transactions ul");
    let total = data.reduce((a, b) => a + b.amount, 0);
    list.innerHTML = data.map(e => `<li><span>💬 ${e.title}</span><span>$${e.amount}</span></li>`).join("");
    document.querySelector(".card.orange p").textContent = `$${total}`;
    updateChart(total / 2, total / 2);
  }

  // FRIENDS
  if (document.getElementById("friendsChart")) {
    const list = document.getElementById("friendsList");
    const balances = {};
    data.forEach(e => {
      const share = e.amount / e.people.length;
      e.people.forEach(p => {
        if (p === "You") return;
        if (e.payer === "You") balances[p] = (balances[p] || 0) + share;
        else if (p === "You") balances[e.payer] = (balances[e.payer] || 0) - share;
      });
    });
    list.innerHTML = "";
    let totalOwe = 0, totalOwed = 0;
    for (let [f, a] of Object.entries(balances)) {
      list.innerHTML += `<li><span>${a > 0 ? "🟢" : "🔴"} ${f}</span><span>${a > 0 ? "Owes you" : "You owe"} $${Math.abs(a).toFixed(2)}</span></li>`;
      a > 0 ? totalOwed += a : totalOwe += Math.abs(a);
    }
    document.getElementById("totalOwe").textContent = `$${totalOwe.toFixed(2)}`;
    document.getElementById("totalOwed").textContent = `$${totalOwed.toFixed(2)}`;
    updateChart(totalOwe, totalOwed);
  }
}

// --- Forms ---
document.addEventListener("submit", e => {
  e.preventDefault();
  if (e.target.id === "expenseForm")
    addExpense(
      expenseTitle.value,
      parseFloat(expenseAmount.value),
      paidBy.value,
      [...document.querySelectorAll("#splitBetween input:checked")].map(c => c.value)
    );
  if (e.target.id === "groupExpenseForm")
    addExpense(
      groupExpenseTitle.value,
      parseFloat(groupExpenseAmount.value),
      groupPaidBy.value,
      [...document.querySelectorAll("#groupSplitBetween input:checked")].map(c => c.value)
    );
  e.target.reset();
  expenseModal?.style && (expenseModal.style.display = "none");
  groupExpenseModal?.style && (groupExpenseModal.style.display = "none");
});

// --- Open Modals ---
document.addEventListener("click", e => {
  if (e.target.classList.contains("new-expense-btn"))
    window.location.pathname.includes("groups.html")
      ? groupExpenseModal.style.display = "flex"
      : expenseModal.style.display = "flex";
  if (e.target === expenseModal) expenseModal.style.display = "none";
  if (e.target === groupExpenseModal) groupExpenseModal.style.display = "none";
});

// --- Reset ---
resetBtn?.addEventListener("click", () => confirm("Reset all expenses?") && clearData());

// --- Start ---
render();
