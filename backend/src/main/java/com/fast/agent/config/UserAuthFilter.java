package com.fast.agent.config;

import com.fast.agent.util.UserJwtUtil;
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
public class UserAuthFilter extends OncePerRequestFilter {

    @Autowired private UserJwtUtil userJwtUtil;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            String path = request.getRequestURI();
            if (!path.startsWith("/api/user/")) {
                filterChain.doFilter(request, response);
                return;
            }

            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.startsWith("Bearer ")) {
                String token = authHeader.substring(7);
                if (userJwtUtil.validateToken(token)) {
                    Claims claims = userJwtUtil.parseToken(token);
                    Long userId = Long.parseLong(claims.getSubject());

                    UsernamePasswordAuthenticationToken auth =
                            new UsernamePasswordAuthenticationToken(
                                    String.valueOf(userId),
                                    null,
                                    Collections.singletonList(
                                            new SimpleGrantedAuthority("ROLE_USER")));
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            // No context to clear for user
        }
    }
}
