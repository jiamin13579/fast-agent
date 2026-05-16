package com.fast.agent.config;

import com.fast.agent.util.AdminJwtUtil;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AdminAuthFilter extends OncePerRequestFilter {

    @Autowired private AdminJwtUtil adminJwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String path = request.getRequestURI();
            if (!path.startsWith("/api/admin/")) {
                filterChain.doFilter(request, response);
                return;
            }

            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (adminJwtUtil.validateToken(token)) {
                    Claims claims = adminJwtUtil.parseToken(token);
                    Long adminId = Long.parseLong(claims.getSubject());
                    Boolean isGlobalAdmin = claims.get("isGlobalAdmin", Boolean.class);
                    if (isGlobalAdmin == null) isGlobalAdmin = false;

                    AdminContext.set(adminId, isGlobalAdmin);

                    String role = isGlobalAdmin ? "ADMIN" : "NAMESPACE_ADMIN";
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    String.valueOf(adminId),
                                    null,
                                    Collections.singletonList(
                                            new SimpleGrantedAuthority("ROLE_" + role)));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            AdminContext.clear();
        }
    }
}
