package com.fast.agent.config;

import com.fast.agent.util.JwtUtil;
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
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            String authHeader = request.getHeader("Authorization");

            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (jwtUtil.validateToken(token)) {
                    var claims = jwtUtil.parseToken(token);
                    Long userId = Long.parseLong(claims.getSubject());
                    Boolean isAdmin = claims.get("isAdmin", Boolean.class);
                    if (isAdmin == null) isAdmin = false;

                    String namespaceHeader = request.getHeader("X-Namespace-Id");
                    Long namespaceId = 0L;
                    if (namespaceHeader != null) {
                        namespaceId = Long.parseLong(namespaceHeader);
                    }

                    NamespaceContext.set(namespaceId, userId, isAdmin);

                    String role = isAdmin ? "ADMIN" : "USER";
                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    claims.getSubject(),
                                    null,
                                    Collections.singletonList(
                                            new SimpleGrantedAuthority("ROLE_" + role)));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            NamespaceContext.clear();
        }
    }
}
