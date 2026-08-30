import "dotenv/config";

const SUBGRAPH_URL = process.env.SUBGRAPH_URL;
if (!SUBGRAPH_URL) {
  throw new Error("SUBGRAPH_URL is not set");
}

export class SubgraphError extends Error {
  constructor(message: string, public readonly errors: unknown) {
    super(message);
  }
}

// Thin GraphQL POST helper -- no client library needed for a handful of
// fixed queries. Throws SubgraphError on a GraphQL-level error response so
// route handlers can just await this and let their own try/catch respond
// with a 502, same as any other upstream-dependency failure.
export async function querySubgraph<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(SUBGRAPH_URL as string, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new SubgraphError(`subgraph request failed: ${res.status} ${res.statusText}`, null);
  }

  const body = (await res.json()) as { data?: T; errors?: unknown };
  if (body.errors) {
    throw new SubgraphError("subgraph returned errors", body.errors);
  }
  if (body.data === undefined) {
    throw new SubgraphError("subgraph returned no data", null);
  }
  return body.data;
}
