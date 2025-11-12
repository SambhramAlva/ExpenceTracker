// --- script.js (XAMPP / PHP API version) ---
// Expects project to be served from http://localhost/my_expenses_project/
// and API at http://localhost/expenses_api/

const expenseModal = document.getElementById("expenseModal");
const groupExpenseModal = document.getElementById("groupExpenseModal");
const resetBtn = document.getElementById("resetExpenses");

const expenseForm = document.getElementById("expenseForm");
const expenseTitle = document.getElementById("expenseTitle");
const expenseAmount = document.getElementById("expenseAmount");
const paidBy = document.getElementById("paidBy");
const splitBetween = document.getElementById("splitBetween");
const splitResult = document.getElementById("splitResult");

const groupExpenseForm = document.getElementById("groupExpenseForm");
const groupExpenseTitle = document.getElementById("groupExpenseTitle");
const groupExpenseAmount = document.getElementById("groupExpenseAmount");
const groupPaidBy = document.getElementById("groupPaidBy");
const groupSplitBetween = document.getElementById("groupSplitBetween");
const groupSplitResult = document.getElementById("groupSplitResult");

const addGroupBtn = document.getElementById("addGroupBtn");
const groupSelect = document.getElementById("groupSelect");
const newGroupInput = document.getElementById("newGroupInput");

let chart;

// API base (served by Apache/XAMPP)
const API_BASE = '/my_expenses_project/expenses_api';
const currentUser = localStorage.getItem('currentUser') || null;
if (!currentUser) console.warn('No currentUser in localStorage. Set localStorage.currentUser after login.');

// Chart helper (uses Chart.js if included)
function updateChart(owe, owed) {
  const canvas = document.querySelector("canvas");
  if (!canvas) return;
  if (!chart) {
    chart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels: ["You Owe", "You’re Owed"],
        datasets: [{ data: [owe, owed] }]
      },
      options: { plugins: { legend: { position: "bottom" } } }
    });
  } else {
    chart.data.datasets[0].data = [owe, owed];
    chart.update();
  }
}

// API helpers (PHP endpoints)
async function apiGetExpenses() {
  if (!currentUser) return [];
  const res = await fetch(`${API_BASE}/get_expenses.php?user=${encodeURIComponent(currentUser)}`);
  if (!res.ok) {
    console.error('apiGetExpenses failed:', await res.text());
    return [];
  }
  return res.json();
}

async function apiAddExpense(title, amount, payer, people) {
  if (!currentUser) throw new Error('No user logged in');
  const body = { user: currentUser, title, amount: Number(amount), payer, people };
  const res = await fetch(`${API_BASE}/add_expense.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const err = await res.json().catch(()=>null);
    throw new Error(err?.error || 'Failed to add expense');
  }
  return res.json();
}

async function apiClearExpenses() {
  if (!currentUser) throw new Error('No user logged in');
  const res = await fetch(`${API_BASE}/delete_expenses.php?user=${encodeURIComponent(currentUser)}`, { method: 'DELETE' });
  if (!res.ok) {
    console.error('apiClearExpenses failed:', await res.text());
    return false;
  }
  return true;
}

async function addExpense(title, amount, payer, people) {
  if (!title || !amount || !payer || !Array.isArray(people) || people.length === 0) {
    return alert("Fill all fields!");
  }
  try {
    await apiAddExpense(title, amount, payer, people);
    await render();
  } catch (err) {
    alert('Error adding expense: ' + err.message);
  }
}

async function render() {
  const data = await apiGetExpenses();

  let owe = 0, owed = 0;
  data.forEach(e => {
    const share = (Number(e.amount) || 0) / (e.people.length || 1);
    if (e.payer === "You") owed += (e.people.length - 1) * share;
    else if (e.people.includes("You")) owe += share;
  });

  if (document.getElementById("financeChart")) {
    const purpleP = document.querySelector(".cards .purple p");
    const orangeP = document.querySelector(".cards .orange p");
    if (purpleP) purpleP.textContent = `$${owe.toFixed(2)}`;
    if (orangeP) orangeP.textContent = `$${owed.toFixed(2)}`;

    const list = document.querySelector(".transactions ul");
    if (list) {
      if (data.length === 0) {
        list.innerHTML = `<li><span>No transactions yet</span></li>`;
      } else {
        list.innerHTML = data.map(e => `<li><span>💸 ${escapeHtml(e.title)}</span><span>Paid by ${escapeHtml(e.payer)} - $${Number(e.amount).toFixed(2)}</span></li>`).join("");
      }
    }
    updateChart(owe, owed);
  }

  if (document.getElementById("groupsChart")) {
    const list = document.querySelector(".transactions ul");
    const total = data.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);
    if (list) {
      if (data.length === 0) list.innerHTML = `<li><span>No group expenses yet</span></li>`;
      else list.innerHTML = data.map(e => `<li><span>💬 ${escapeHtml(e.title)}</span><span>$${Number(e.amount).toFixed(2)}</span></li>`).join("");
    }
    const cardOrange = document.querySelector(".card.orange p");
    if (cardOrange) cardOrange.textContent = `$${total.toFixed(2)}`;
    updateChart(total / 2, total / 2);
  }

  // FRIENDS
if (document.getElementById("friendsChart")) {
  const listEl = document.getElementById("friendsList");
  const balances = {}; // { friendName: amountPositiveIfTheyOweYou, negativeIfYouOweThem }

  data.forEach(e => {
    const share = e.amount / e.people.length;

    if (e.payer === "You") {
      // You paid → others owe you
      e.people.forEach(p => {
        if (p === "You") return;
        balances[p] = (balances[p] || 0) + share;
      });
    } else {
      // Someone else paid → if You were included, you owe them
      if (e.people.includes("You")) {
        balances[e.payer] = (balances[e.payer] || 0) - share;
      }
    }
  });

  // render the list dynamically
  listEl.innerHTML = "";
  let totalOwe = 0, totalOwed = 0;

  for (let [friend, amount] of Object.entries(balances)) {
    const marker = amount > 0 ? "🟢" : "🔴";
    const text = amount > 0 ? `Owes you $${Math.abs(amount).toFixed(2)}` : `You owe $${Math.abs(amount).toFixed(2)}`;
    listEl.innerHTML += `<li><span>${marker} ${friend}</span><span>${text}</span></li>`;
    if (amount > 0) totalOwed += amount;
    else totalOwe += Math.abs(amount);
  }

  document.getElementById("totalOwe").textContent = `$${totalOwe.toFixed(2)}`;
  document.getElementById("totalOwed").textContent = `$${totalOwed.toFixed(2)}`;

  updateChart(totalOwe, totalOwed);
}

}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/[&<>"']/g, function (m) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[m];
  });
}

function computeSplitPreview(container, resultEl) {
  if (!container || !resultEl) return;
  const checked = Array.from(container.querySelectorAll("input[type=checkbox]:checked")).map(el => el.value);
  if (checked.length === 0) {
    resultEl.textContent = "Select participants";
    return;
  }
  const amountInput = container.id === "splitBetween" ? expenseAmount : groupExpenseAmount;
  const amount = amountInput ? Number(amountInput.value || 0) : 0;
  const per = (amount && checked.length) ? (amount / checked.length).toFixed(2) : "—";
  resultEl.textContent = `${checked.join(", ")} — $${per} each`;
}

document.addEventListener("input", e => {
  if (e.target === expenseAmount || (e.target && e.target.closest && e.target.closest("#splitBetween"))) {
    computeSplitPreview(splitBetween, splitResult);
  }
  if (e.target === groupExpenseAmount || (e.target && e.target.closest && e.target.closest("#groupSplitBetween"))) {
    computeSplitPreview(groupSplitBetween, groupSplitResult);
  }
});
document.addEventListener("change", e => {
  if (e.target && e.target.closest && e.target.closest("#splitBetween")) computeSplitPreview(splitBetween, splitResult);
  if (e.target && e.target.closest && e.target.closest("#groupSplitBetween")) computeSplitPreview(groupSplitBetween, groupSplitResult);
});

document.addEventListener("submit", async e => {
  e.preventDefault();
  try {
    if (e.target && e.target.id === "expenseForm") {
      const people = Array.from(document.querySelectorAll("#splitBetween input:checked")).map(c => c.value);
      await addExpense(expenseTitle.value, parseFloat(expenseAmount.value), paidBy.value, people);
    }

    if (e.target && e.target.id === "groupExpenseForm") {
      const people = Array.from(document.querySelectorAll("#groupSplitBetween input:checked")).map(c => c.value);
      await addExpense(groupExpenseTitle.value, parseFloat(groupExpenseAmount.value), groupPaidBy.value, people);
    }

    if (e.target.reset) e.target.reset();
    if (expenseModal && expenseModal.style) expenseModal.style.display = "none";
    if (groupExpenseModal && groupExpenseModal.style) groupExpenseModal.style.display = "none";
  } catch (err) {
    alert('Error: ' + err.message);
  }
});

document.addEventListener("click", e => {
  if (e.target.classList && e.target.classList.contains("new-expense-btn")) {
    if (window.location.pathname.includes("groups.html") && groupExpenseModal) groupExpenseModal.style.display = "flex";
    else if (expenseModal) expenseModal.style.display = "flex";
  }

  if (e.target === expenseModal) expenseModal.style.display = "none";
  if (e.target === groupExpenseModal) groupExpenseModal.style.display = "none";
});

addGroupBtn?.addEventListener("click", () => {
  const name = (newGroupInput?.value || "").trim();
  if (!name) return alert("Enter a group name");
  const option = document.createElement("option");
  option.value = name;
  option.textContent = name;
  groupSelect?.appendChild(option);
  newGroupInput.value = "";
});

resetBtn?.addEventListener("click", async () => {
  if (!currentUser) return alert('No user logged in');
  if (!confirm("Reset all expenses for this user?")) return;
  const ok = await apiClearExpenses();
  if (ok) {
    alert("Expenses cleared.");
    await render();
  } else {
    alert("Failed to clear expenses.");
  }
});
// --- fetch user full name from API ---
async function apiGetUser() {
  if (!currentUser) return null;
  try {
    const res = await fetch(`${API_BASE}/get_user.php?user=${encodeURIComponent(currentUser)}`);
    if (!res.ok) {
      console.warn('apiGetUser failed', res.status);
      return null;
    }
    return await res.json(); // returns { email, full_name, display }
  } catch (err) {
    console.error('apiGetUser error', err);
    return null;
  }
}

// --- show user's name on index page ---
async function renderUserGreeting() {
  const el = document.getElementById('userDisplay');
  if (!el) return;

  const user = await apiGetUser();
  if (user && user.full_name) {
    el.textContent = user.full_name; // ✅ show full name from DB
  } else if (user && user.email) {
    el.textContent = user.email;
  } else {
    el.textContent = 'Guest';
  }
}

renderUserGreeting();
render();
