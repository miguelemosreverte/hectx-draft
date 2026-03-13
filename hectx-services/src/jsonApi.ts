// Canton HTTP JSON Ledger API v2 client

export type ApiConfig = {
  baseUrl: string;
  token: string;
  userId: string;
  packageId: string;
};

const hdrs = (token: string) => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`,
});

export const allocateParty = async (cfg: ApiConfig, hint: string): Promise<string> => {
  // Check if party already exists
  const listRes = await fetch(`${cfg.baseUrl}/v2/parties`, { headers: hdrs(cfg.token) });
  if (listRes.ok) {
    const data = await listRes.json();
    const found = data.partyDetails?.find((p: any) => p.party?.startsWith(hint + "::"));
    if (found) return found.party;
  }
  const res = await fetch(`${cfg.baseUrl}/v2/parties`, {
    method: "POST",
    headers: hdrs(cfg.token),
    body: JSON.stringify({ partyIdHint: hint, localMetadata: {} }),
  });
  if (!res.ok) throw new Error(`allocateParty ${hint}: ${res.status} ${await res.text()}`);
  return (await res.json()).partyDetails.party;
};

export const grantActAs = async (cfg: ApiConfig, party: string): Promise<void> => {
  await fetch(`${cfg.baseUrl}/v2/users/${cfg.userId}/rights`, {
    method: "POST",
    headers: hdrs(cfg.token),
    body: JSON.stringify({
      userId: cfg.userId,
      rights: [{ kind: { CanActAs: { value: { party } } } }],
    }),
  });
  // Ignore errors — right may already be granted
};

export const create = async (
  cfg: ApiConfig,
  templateId: string,
  createArguments: unknown,
  actAs: string[],
): Promise<{ contractId: string; payload: any }> => {
  const res = await fetch(`${cfg.baseUrl}/v2/commands/submit-and-wait-for-transaction`, {
    method: "POST",
    headers: hdrs(cfg.token),
    body: JSON.stringify({
      commands: {
        commandId: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: cfg.userId,
        actAs,
        commands: [{ CreateCommand: { templateId, createArguments } }],
      },
      transactionFormat: {
        transactionShape: "TRANSACTION_SHAPE_ACS_DELTA",
        eventFormat: {
          filtersByParty: Object.fromEntries(actAs.map((p) => [p, {}])),
          verbose: true,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`create ${templateId}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const evt = data.transaction?.events?.find((e: any) => e.CreatedEvent)?.CreatedEvent;
  if (!evt) throw new Error(`create ${templateId}: no CreatedEvent`);
  return { contractId: evt.contractId, payload: evt.createArgument };
};

export const exercise = async (
  cfg: ApiConfig,
  templateId: string,
  contractId: string,
  choice: string,
  choiceArgument: unknown,
  actAs: string[],
): Promise<{ events: any[] }> => {
  const res = await fetch(`${cfg.baseUrl}/v2/commands/submit-and-wait-for-transaction`, {
    method: "POST",
    headers: hdrs(cfg.token),
    body: JSON.stringify({
      commands: {
        commandId: `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: cfg.userId,
        actAs,
        commands: [
          { ExerciseCommand: { templateId, contractId, choice, choiceArgument } },
        ],
      },
      transactionFormat: {
        transactionShape: "TRANSACTION_SHAPE_ACS_DELTA",
        eventFormat: {
          filtersByParty: Object.fromEntries(actAs.map((p) => [p, {}])),
          verbose: true,
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`exercise ${choice}: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return { events: data.transaction?.events ?? [] };
};

export const getLedgerEnd = async (cfg: ApiConfig): Promise<number> => {
  const res = await fetch(`${cfg.baseUrl}/v2/state/ledger-end`, { headers: hdrs(cfg.token) });
  if (!res.ok) throw new Error(`getLedgerEnd: ${res.status} ${await res.text()}`);
  return (await res.json()).offset;
};

export const queryACS = async (
  cfg: ApiConfig,
  templateId: string,
  party: string,
): Promise<any[]> => {
  const offset = await getLedgerEnd(cfg);
  const res = await fetch(`${cfg.baseUrl}/v2/state/active-contracts`, {
    method: "POST",
    headers: hdrs(cfg.token),
    body: JSON.stringify({
      filter: {
        filtersByParty: {
          [party]: { templateFilters: [{ templateId }] },
        },
      },
      verbose: true,
      activeAtOffset: offset,
    }),
  });
  if (!res.ok) throw new Error(`queryACS ${templateId}: ${res.status} ${await res.text()}`);
  const data: any[] = await res.json();
  // Response is array of { contractEntry: { JsActiveContract: { createdEvent: {...} } } }
  // Server-side template filter may not work — apply client-side filter
  return data
    .map((entry) => entry.contractEntry?.JsActiveContract?.createdEvent ?? entry)
    .filter((evt) => evt.templateId === templateId);
};
