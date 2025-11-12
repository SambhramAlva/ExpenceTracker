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


const API_BASE = '/my_expenses_project/expenses_api';
const currentUser = localStorage.getItem('currentUser') || null;
if (!currentUser) console.warn('No currentUser in localStorage. Set localStorage.currentUser after login.');


// ---------- GENERIC DOUGHNUT CHART CREATOR ----------
// ---------- CHART MANAGER (replace old updateChart) ----------
const _charts = {}; // store instances by canvasId

function makeChart(canvasId, type, labels, data, labelName = '') {
  const canvas = document.getElementById(canvasId) || document.querySelector("canvas");
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // destroy existing chart on this canvas
  if (_charts[canvasId]) {
    try { _charts[canvasId].destroy(); } catch (e) { /* ignore */ }
    delete _charts[canvasId];
  }

  _charts[canvasId] = new Chart(ctx, {
    type,
    data: {
      labels,
      datasets: [{
        label: labelName,
        data,
        backgroundColor: type === 'bar' ? labels.map(()=> '#7b6cff') : ["#ff7b7b","#7b6cff"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: type !== 'bar' }
      },
      scales: type === 'bar' ? {
        x: { title: { display: true, text: 'Groups' } },
        y: { beginAtZero: true, title: { display: true, text: 'Amount ($)' } }
      } : {}
    }
  });
}

// helper convenience wrappers used below
function updateDoughnut(canvasId, owe, owed) {
  makeChart(canvasId, 'doughnut', ["You Owe","You're Owed"], [Number(owe)||0, Number(owed)||0]);
}
function updateBar(canvasId, data) {
  makeChart(canvasId, 'bar', data.map(d=>d.title), data.map(d=>Number(d.amount)||0), 'Group Expenses');
}



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
  // normalize amount
  const amt = Number(e.amount) || 0;

  // normalize people array (backend might send JSON string or array)
  let people = [];
  if (Array.isArray(e.people)) people = e.people;
  else if (typeof e.people === 'string' && e.people.trim()) {
    try { people = JSON.parse(e.people); } catch (err) { people = e.people.split?.(',').map(s=>s.trim()) || []; }
  }

  const count = people.length || 1;
  const share = amt / count;

  // treat currentUser email and literal "You" as the same person
  const payerIsYou = (e.payer === "You") || (e.payer === currentUser);
  const youInPeople = people.includes("You") || people.includes(currentUser);

  if (payerIsYou) {
    // you paid -> others owe you (exclude you/currentUser)
    const othersCount = people.filter(p => p !== "You" && p !== currentUser).length;
    owed += othersCount * share;
  } else if (youInPeople) {
    // someone else paid and you were included -> you owe that payer
    owe += share;
  }
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
   updateDoughnut('financeChart', owe, owed);

  }

// ---------- GROUPS PAGE (Bar Chart) ----------
// ---------- GROUPS PAGE (Bar Chart) ----------
if (document.getElementById("groupsChart")) {
  const list = document.querySelector(".transactions ul");
  const total = data.reduce((acc, cur) => acc + Number(cur.amount || 0), 0);

  // Render list
  if (list) {
    if (data.length === 0)
      list.innerHTML = `<li><span>No group expenses yet</span></li>`;
    else
      list.innerHTML = data.map(e =>
        `<li><span>💬 ${escapeHtml(e.title)}</span><span>$${Number(e.amount).toFixed(2)}</span></li>`
      ).join("");
  }

  // Update total
  const cardOrange = document.querySelector(".card.orange p");
  if (cardOrange) cardOrange.textContent = `$${total.toFixed(2)}`;

  // Draw bar chart for group expenses
  updateBar('groupsChart', data);

}

// ---------- FRIENDS PAGE (Individual Balances Visualization) ----------
if (document.getElementById("friendsChart")) {
  const listEl = document.getElementById("friendsList");
  const balances = {};

  // Calculate per-friend balances
  data.forEach(e => {
    // normalize
    const amt = Number(e.amount) || 0;
    let people = [];

    if (Array.isArray(e.people)) people = e.people;
    else if (typeof e.people === "string" && e.people.trim()) {
      try { people = JSON.parse(e.people); }
      catch { people = e.people.split(",").map(p => p.trim()); }
    }

    const share = amt / (people.length || 1);

    if (e.payer === "You" || e.payer === currentUser) {
      // You paid -> others owe you
      people.forEach(p => {
        if (p !== "You" && p !== currentUser)
          balances[p] = (balances[p] || 0) + share;
      });
    } else if (people.includes("You") || people.includes(currentUser)) {
      // Someone else paid -> you owe them
      balances[e.payer] = (balances[e.payer] || 0) - share;
    }
  });

  // Render the list
  if (listEl) listEl.innerHTML = "";
  let totalOwe = 0, totalOwed = 0;

  for (const [friend, amount] of Object.entries(balances)) {
    const li = document.createElement("li");
    if (amount > 0) {
      li.innerHTML = `🟢 ${friend} - Owes you $${amount.toFixed(2)}`;
      totalOwed += amount;
    } else if (amount < 0) {
      li.innerHTML = `🔴 ${friend} - You owe $${Math.abs(amount).toFixed(2)}`;
      totalOwe += Math.abs(amount);
    } else {
      li.innerHTML = `⚪ ${friend} - Settled`;
    }
    listEl.appendChild(li);
  }

  // Update totals
  const oweEl = document.getElementById("totalOwe");
  const owedEl = document.getElementById("totalOwed");
  if (oweEl) oweEl.textContent = `$${totalOwe.toFixed(2)}`;
  if (owedEl) owedEl.textContent = `$${totalOwed.toFixed(2)}`;

  // Prepare chart data for individual friends
  const friendNames = Object.keys(balances);
  const friendAmounts = Object.values(balances).map(a => Number(a.toFixed(2)));

  // Draw bar chart per friend
  makeChart(
    "friendsChart",
    "bar",
    friendNames,
    friendAmounts,
    "Friend Balances ($)"
  );
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

async function apiGetUser() {
  if (!currentUser) return null;
  try {
    const res = await fetch(`${API_BASE}/get_user.php?user=${encodeURIComponent(currentUser)}`);
    if (!res.ok) {
      console.warn('apiGetUser failed', res.status);
      return null;
    }
    return await res.json(); 
  } catch (err) {
    console.error('apiGetUser error', err);
    return null;
  }
}


async function renderUserGreeting() {
  const el = document.getElementById('userDisplay');
  if (!el) return;

  const user = await apiGetUser();
  if (user && user.full_name) {
    el.textContent = user.full_name; 
  } else if (user && user.email) {
    el.textContent = user.email;
  } else {
    el.textContent = 'Guest';
  }
}

renderUserGreeting();
render();
