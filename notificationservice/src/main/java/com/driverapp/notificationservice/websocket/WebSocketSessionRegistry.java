package com.driverapp.notificationservice.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class WebSocketSessionRegistry {

    private static final int MAX_SESSIONS_PER_USER = 5;

    // userId -> Set of sessionIds
    private final ConcurrentHashMap<String, Set<String>> userSessions = new ConcurrentHashMap<>();
    // sessionId -> userId
    private final ConcurrentHashMap<String, String> sessionToUser = new ConcurrentHashMap<>();

    public void register(String userId, String sessionId) {
        if (userId == null || sessionId == null) {
            return;
        }

        userSessions.compute(userId, (uid, sessions) -> {
            Set<String> set = sessions != null ? sessions : ConcurrentHashMap.newKeySet();
            if (set.size() >= MAX_SESSIONS_PER_USER) {
                log.warn("[WS] User {} exceeded max active sessions ({}), adding new session {}",
                        uid, MAX_SESSIONS_PER_USER, sessionId);
            }
            set.add(sessionId);
            return set;
        });

        sessionToUser.put(sessionId, userId);
    }

    public void unregister(String sessionId) {
        if (sessionId == null) {
            return;
        }
        String userId = sessionToUser.remove(sessionId);
        if (userId != null) {
            unregister(userId, sessionId);
        }
    }

    public void unregister(String userId, String sessionId) {
        if (userId == null || sessionId == null) {
            return;
        }
        sessionToUser.remove(sessionId);
        userSessions.computeIfPresent(userId, (k, sessions) -> {
            sessions.remove(sessionId);
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public boolean isOnline(String userId) {
        if (userId == null) {
            return false;
        }
        Set<String> sessions = userSessions.get(userId);
        return sessions != null && !sessions.isEmpty();
    }

    public Set<String> getSessions(String userId) {
        if (userId == null) {
            return Collections.emptySet();
        }
        Set<String> sessions = userSessions.get(userId);
        return sessions != null ? Collections.unmodifiableSet(sessions) : Collections.emptySet();
    }

    public String getUserIdBySession(String sessionId) {
        return sessionToUser.get(sessionId);
    }

    public int onlineCount() {
        return userSessions.size();
    }

    public int totalSessionCount() {
        return sessionToUser.size();
    }
}
