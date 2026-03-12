const state = {
  admin: "Hecto",
  alice: "Alice",
  bob: "Bob",
  instrumentId: "HECTX",
  policies: false,
  compliance: false,
  mintRequested: false,
  mintApproved: false,
  holdings: {
    Alice: 0,
    Bob: 0,
  },
  transferComplete: false,
  requestedAt: "1970-01-01T00:00:00Z",
};

const logEl = document.getElementById("log");
const complianceList = document.getElementById("compliance-list");
const mintingList = document.getElementById("minting-list");
const transferList = document.getElementById("transfer-list");
const holdingsEl = document.getElementById("holdings");

const log = (line) => {
  const time = new Date().toLocaleTimeString();
  logEl.textContent += `[${time}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
};

const api = async (path, opts = {}) => {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const msg = data.error ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
};

const setList = (el, rows) => {
  el.innerHTML = "";
  rows.forEach((row) => {
    const li = document.createElement("li");
    li.innerHTML = row;
    el.appendChild(li);
  });
};

const renderHoldings = () => {
  holdingsEl.innerHTML = "";
  ["Alice", "Bob"].forEach((owner) => {
    const div = document.createElement("div");
    div.className = "holding";
    div.innerHTML = `
      <div><strong>${owner}</strong></div>
      <div>${state.holdings[owner]} HECTX</div>
    `;
    holdingsEl.appendChild(div);
  });
};

const renderStatus = () => {
  setList(complianceList, [
    `EligibilityPolicy <span class="badge ${state.policies ? "success" : "warning"}">${state.policies ? "Active" : "Pending"}</span>`,
    `Participants (Alice, Bob) <span class="badge ${state.compliance ? "success" : "warning"}">${state.compliance ? "Eligible" : "Pending"}</span>`,
    `WalletApproval <span class="badge ${state.compliance ? "success" : "warning"}">${state.compliance ? "Active" : "Pending"}</span>`,
  ]);

  setList(mintingList, [
    `Mint request <span class="badge ${state.mintRequested ? "success" : "warning"}">${state.mintRequested ? "Submitted" : "Pending"}</span>`,
    `Approval <span class="badge ${state.mintApproved ? "success" : "warning"}">${state.mintApproved ? "Approved" : "Pending"}</span>`,
    `Supply update <span class="badge ${state.mintApproved ? "success" : "warning"}">${state.mintApproved ? "Complete" : "Pending"}</span>`,
  ]);

  setList(transferList, [
    `Interface: TransferFactory_Transfer`,
    `requestedAt = ${state.requestedAt}`,
    `Transfer 100 → Bob <span class="badge ${state.transferComplete ? "success" : "warning"}">${state.transferComplete ? "Completed" : "Pending"}</span>`,
  ]);

  renderHoldings();
};

const refreshFromLedger = async () => {
  const status = await api("/api/status");
  if (!status.ready) return;
  if (status.balances) {
    state.holdings.Alice = status.balances.alice ?? 0;
    state.holdings.Bob = status.balances.bob ?? 0;
  }
  renderStatus();
};

const reset = () => {
  state.policies = false;
  state.compliance = false;
  state.mintRequested = false;
  state.mintApproved = false;
  state.holdings.Alice = 0;
  state.holdings.Bob = 0;
  state.transferComplete = false;
  logEl.textContent = "";
  log("Scenario reset.");
  renderStatus();
};

const stepSetup = async () => {
  const res = await api("/api/setup", { method: "POST" });
  state.policies = true;
  state.compliance = true;
  log(`Policies and compliance records created. Registry=${res.registryCid}`);
  await refreshFromLedger();
};

const stepMintRequest = async () => {
  if (!state.policies) {
    log("Cannot mint request: policies not initialized.");
    return;
  }
  const res = await api("/api/mint", { method: "POST" });
  state.mintRequested = true;
  state.mintApproved = true;
  log(`Mint approved. Request=${res.requestCid}`);
  await refreshFromLedger();
};

const stepMintApprove = async () => {
  log("Mint approval happens in the same API call as mint request.");
};

const stepTransfer = async () => {
  if (!state.mintApproved) {
    log("Cannot transfer: holdings not minted.");
    return;
  }
  await api("/api/transfer", { method: "POST" });
  state.transferComplete = true;
  log("Transfer executed via TransferFactory_Transfer (sender + admin sign).");
  await refreshFromLedger();
};

document.getElementById("run-all").addEventListener("click", async () => {
  try {
    await stepSetup();
    await stepMintRequest();
    await stepTransfer();
  } catch (err) {
    log(`Error: ${err.message}`);
  }
});

document.getElementById("reset").addEventListener("click", reset);

document.querySelectorAll(".step").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const step = btn.dataset.step;
    try {
      if (step === "setup") await stepSetup();
      if (step === "mint-request") await stepMintRequest();
      if (step === "mint-approve") await stepMintApprove();
      if (step === "transfer") await stepTransfer();
    } catch (err) {
      log(`Error: ${err.message}`);
    }
  });
});

reset();
