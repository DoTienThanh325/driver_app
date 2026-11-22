import { useEffect, useState, useSyncExternalStore } from 'react';
import { tripService } from '@/services/trip.service';
import { tokenStorage } from '@/services/storage/token.storage';

export function useTripCounterparty(tripId, expectedRole, assignmentId) {
  const sessionRevision = useSyncExternalStore(tokenStorage.subscribe, tokenStorage.getRevision);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  const requestKey = JSON.stringify([tripId, expectedRole, assignmentId, sessionRevision, attempt]);

  useEffect(() => {
    if (!tripId) return;
    let active = true;
    tripService.getTripCounterparty(tripId)
      .then((profile) => {
        if (active && tokenStorage.getRevision() === sessionRevision) {
          setResult({ requestKey, profile: profile?.role === expectedRole ? profile : null });
        }
      })
      .catch(() => {
        if (active && tokenStorage.getRevision() === sessionRevision) {
          setResult({ requestKey, error: true });
        }
      });
    return () => { active = false; };
  }, [tripId, expectedRole, sessionRevision, requestKey]);

  const current = result?.requestKey === requestKey ? result : null;
  return {
    profile: current?.profile ?? null,
    error: Boolean(current?.error),
    loading: Boolean(tripId && !current),
    retry: () => setAttempt((previous) => previous + 1),
  };
}
