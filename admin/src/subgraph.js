// Talks directly to the public Goldsky subgraph endpoint -- no dependency on
// ../../backend (that API exists for the trading interface's own needs:
// IPFS uploads, moderation, decimals-aware formatting; none of that applies
// here). Read-only, same GraphQL the backend itself queries.
const SUBGRAPH_URL = "https://api.goldsky.com/api/public/project_cmhtxnzpqm81001w94ksmgira/subgraphs/duckfun-ink/current/gn";

async function query(query, variables) {
  const res = await fetch(SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join("; "));
  return json.data;
}

export async function fetchOverriddenTokens() {
  const data = await query(`{
    tokens(first: 200, where: { metaOverrideUri_not: null }) {
      id name symbol family metaUri metaOverrideUri
    }
  }`);
  return data.tokens;
}

// Pool doesn't store its own hook address -- Token does (fixed forever once
// a pool exists), so it's joined through here to know which DuckHookV4 to
// call approveCTO/rejectCTO against for a given application.
export async function fetchPendingCtoApplications() {
  const data = await query(`{
    ctoApplications(first: 100, where: { status: PENDING }, orderBy: appliedAt, orderDirection: desc) {
      id
      pool { id token { id name symbol hook } }
      applicant
      newCreator
      paid
      appliedAt
    }
  }`);
  return data.ctoApplications;
}

export async function fetchPositions() {
  const data = await query(`{
    positions(first: 500, orderBy: registeredAt, orderDirection: desc) {
      id
      token { symbol name }
      poolId
      totalBurned
      totalToPlatform
      registeredAt
    }
  }`);
  return data.positions;
}
