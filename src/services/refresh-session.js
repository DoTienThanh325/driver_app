// @ts-check
/** Coalesce REST/socket refreshes and discard responses from an obsolete login. */
export function createSessionRefresher({ tokenStorage, request }) {
  let pending = null;
  let pendingRevision;
  return () => {
    const revision = tokenStorage.getRevision();
    if (pending && pendingRevision === revision) return pending;
    pendingRevision = revision;
    const current = (async () => {
      try {
        const refreshToken = await tokenStorage.getRefreshToken();
        if (!refreshToken || revision !== tokenStorage.getRevision()) return false;
        const response = await request(refreshToken);
        if (revision !== tokenStorage.getRevision()) return false;
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) await tokenStorage.clearTokens();
          return false;
        }
        const tokens = await response.json();
        if (revision !== tokenStorage.getRevision() || !tokens.accessToken) return false;
        await tokenStorage.saveTokens(tokens.accessToken, tokens.refreshToken || refreshToken);
        return true;
      } catch {
        return false;
      }
    })().finally(() => { if (pending === current) pending = null; });
    pending = current;
    return current;
  };
}
