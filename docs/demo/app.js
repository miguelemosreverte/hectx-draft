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

const stepSetup = () => {
  state.policies = true;
  state.compliance = true;
  log("Policies and compliance records created.");
  renderStatus();
};

const stepMintRequest = () => {
  if (!state.policies) {
    log("Cannot mint request: policies not initialized.");
    return;
  }
  state.mintRequested = true;
  log("Mint request submitted by Alice.");
  renderStatus();
};

const stepMintApprove = () => {
  if (!state.mintRequested) {
    log("Cannot approve mint: request missing.");
    return;
  }
  state.mintApproved = true;
  state.holdings.Alice = 1000;
  log("Mint approved. Alice receives 1000 HECTX.");
  renderStatus();
};

const stepTransfer = () => {
  if (!state.mintApproved) {
    log("Cannot transfer: holdings not minted.");
    return;
  }
  if (state.holdings.Alice < 100) {
    log("Transfer blocked: insufficient funds.");
    return;
  }
  state.holdings.Alice -= 100;
  state.holdings.Bob += 100;
  state.transferComplete = true;
  log("Transfer executed via TransferFactory_Transfer (sender + admin sign).");
  renderStatus();
};

document.getElementById("run-all").addEventListener("click", () => {
  stepSetup();
  stepMintRequest();
  stepMintApprove();
  stepTransfer();
});

document.getElementById("reset").addEventListener("click", reset);

document.querySelectorAll(".step").forEach((btn) => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    if (step === "setup") stepSetup();
    if (step === "mint-request") stepMintRequest();
    if (step === "mint-approve") stepMintApprove();
    if (step === "transfer") stepTransfer();
  });
});

reset();
