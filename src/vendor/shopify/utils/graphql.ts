// How the Storefront API queries are written. The request itself is sent by the upstream client
// (see ../client.ts).

export function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((acc, str, i) => acc + str + (values[i] ?? ""), "");
}

export interface QueryDefinition {
  fragments?: string[];
  query: string;
}

export function buildQuery(def: QueryDefinition): string {
  const fragments = def.fragments?.join("\n") ?? "";
  return fragments ? `${fragments}\n${def.query}` : def.query;
}

export interface GraphQLClient {
  query<T>(query: string | QueryDefinition, variables?: Record<string, unknown>): Promise<T>;
}
