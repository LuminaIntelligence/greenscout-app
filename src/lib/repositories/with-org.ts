/**
 * `withOrg` is intent-documenting sugar at the call site. It currently
 * just forwards `organizationId` into `fn` — in MVP single-tenant mode
 * the value is always `"greenscout"`. Phase-3 will swap the body to
 * resolve the active `organizationId` from session / AsyncLocalStorage
 * without touching any callers.
 *
 * See DECISIONS.md → "Slice 2 schema design approved" → `organizationId`
 * enforcement, and DECISIONS.md → "T-014 silent decisions per §14
 * (consolidated)".
 *
 * Example call-site usage:
 *
 *   const users = await withOrg("greenscout", (organizationId) =>
 *     listUsers(organizationId, { take: 25 }),
 *   );
 */
export function withOrg<T>(organizationId: string, fn: (organizationId: string) => T): T {
  return fn(organizationId);
}
