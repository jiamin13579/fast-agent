package com.fast.agent.config;

public class NamespaceContext {

    private static final ThreadLocal<Long> currentNamespace = new ThreadLocal<>();
    private static final ThreadLocal<Long> currentUserId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> isAdmin = new ThreadLocal<>();

    public static void set(Long namespaceId, Long userId, Boolean admin) {
        currentNamespace.set(namespaceId);
        currentUserId.set(userId);
        isAdmin.set(admin);
    }

    public static Long getNamespaceId() {
        return currentNamespace.get();
    }

    public static Long getUserId() {
        return currentUserId.get();
    }

    public static Boolean getIsAdmin() {
        Boolean v = isAdmin.get();
        return v != null && v;
    }

    public static void clear() {
        currentNamespace.remove();
        currentUserId.remove();
        isAdmin.remove();
    }
}
