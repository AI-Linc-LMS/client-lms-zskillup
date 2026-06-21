import { listCompanies } from './api/catalog';

/**
 * Module-level cache of companyId → company name. Used by the PYQ tag to show
 * "Asked in TCS" from a question's company-tag IDs without each surface
 * re-fetching the company list.
 */
let cache: Promise<Map<string, string>> | null = null;

export function loadCompanyNameMap(): Promise<Map<string, string>> {
  if (!cache) {
    cache = listCompanies()
      .then((cs) => new Map(cs.map((c) => [c.id, c.name])))
      .catch(() => new Map<string, string>());
  }
  return cache;
}
