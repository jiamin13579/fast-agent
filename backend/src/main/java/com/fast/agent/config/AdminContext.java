package com.fast.agent.config;

public class AdminContext {
    private static final ThreadLocal<Long> currentAdminId = new ThreadLocal<>();
    private static final ThreadLocal<Boolean> isGlobalAdmin = new ThreadLocal<>();

    public static void set(Long adminId, Boolean globalAdmin) {
        currentAdminId.set(adminId);
        isGlobalAdmin.set(globalAdmin);
    }

    public static Long getAdminId() {
        return currentAdminId.get();
    }

    public static boolean isGlobalAdmin() {
        Boolean v = isGlobalAdmin.get();
        return v != null && v;
    }

    public static void clear() {
        currentAdminId.remove();
        isGlobalAdmin.remove();
    }
}
