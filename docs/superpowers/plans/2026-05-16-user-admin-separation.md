# User/Admin Separation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic architecture into isolated user and admin systems with separate auth, data tables, API prefixes, and frontend apps.

**Architecture:** Same Spring Boot backend (port 8080) with dual filter chain — `UserAuthFilter` for `/api/user/**` and `AdminAuthFilter` for `/api/admin/**`. Two JWT secrets. Separate `user` and `admin` tables. Two independent Next.js apps.

**Tech Stack:** Spring Boot 3.2 / Spring Security 6 / MyBatis-Plus 3.5 / Next.js 14 / Tailwind 3 / shadcn-ui

---

### Task 1: Database Schema — New Tables + User Table Cleanup

**Files:**
- Modify: `backend/src/main/resources/schema.sql`

- [ ] **Step 1: Rewrite schema.sql**

Remove `is_admin` and `must_change_password` from `user` table. Add `admin` and `admin_namespace` tables. Remove `user_namespace` table. Update seed data.

Key changes in `schema.sql`:

```sql
-- Modified user table (removed is_admin, must_change_password)
CREATE TABLE `user` (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(100) NOT NULL UNIQUE,
    phone       VARCHAR(20),
    nickname    VARCHAR(50) NOT NULL,
    password    VARCHAR(255) NOT NULL,
    status      INT NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- New admin table
CREATE TABLE `admin` (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(50) NOT NULL UNIQUE,
    password         VARCHAR(255) NOT NULL,
    nickname         VARCHAR(100),
    is_global_admin  TINYINT(1) NOT NULL DEFAULT 0,
    status           INT NOT NULL DEFAULT 1,
    create_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- New admin_namespace table
CREATE TABLE `admin_namespace` (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id     BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'ADMIN' COMMENT 'ADMIN/VIEWER',
    create_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_admin_namespace (admin_id, namespace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Remove user_namespace table
-- DROP TABLE IF EXISTS user_namespace; (already in the DROP section)
```

Seed data changes:

```sql
-- Remove old admin user from user table (admin@fast.com)
-- Insert into admin table instead
INSERT INTO `admin` (username, nickname, password, is_global_admin, status) VALUES
('admin', 'Admin', '$2a$10$g37MXvYIb6LthhtCyU7riOi2dD.mF6vE90DoUlPWczbTB07aWJR2m', 1, 1);

-- Keep existing regular users but without is_admin/must_change_password
INSERT INTO `user` (email, phone, nickname, password, status) VALUES
('user@fast.com', '13800000001', 'User', '$2a$10$g37MXvYIb6LthhtCyU7riOi2dD.mF6vE90DoUlPWczbTB07aWJR2m', 1);

INSERT INTO `admin_namespace` (admin_id, namespace_id, role) VALUES (1, 1, 'ADMIN');
```

All other tables, DROP order, and remaining seed data unchanged.

- [ ] **Step 2: Verify schema syntax**

Run: `mysql -h 43.134.96.44 -u dbadmin -p'Db@Adm123' agent_db < backend/src/main/resources/schema.sql`

---

### Task 2: Backend Entities — Admin + AdminNamespace

**Files:**
- Create: `backend/src/main/java/com/fast/agent/entity/Admin.java`
- Create: `backend/src/main/java/com/fast/agent/entity/AdminNamespace.java`
- Modify: `backend/src/main/java/com/fast/agent/entity/User.java`

- [ ] **Step 1: Remove isAdmin and mustChangePassword from User.java**

```java
// Remove these fields and their getters/setters:
// @TableField("is_admin")
// private Boolean isAdmin;
// @TableField("must_change_password")
// private Boolean mustChangePassword;
```

- [ ] **Step 2: Create Admin.java entity**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("admin")
public class Admin {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String username;
    private String password;
    private String nickname;
    @TableField("is_global_admin")
    private Boolean isGlobalAdmin;
    private Integer status;
    @TableField("create_time")
    private LocalDateTime createTime;
    @TableField("update_time")
    private LocalDateTime updateTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
    public Boolean getIsGlobalAdmin() { return isGlobalAdmin; }
    public void setIsGlobalAdmin(Boolean isGlobalAdmin) { this.isGlobalAdmin = isGlobalAdmin; }
    public Integer getStatus() { return status; }
    public void setStatus(Integer status) { this.status = status; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
    public LocalDateTime getUpdateTime() { return updateTime; }
    public void setUpdateTime(LocalDateTime updateTime) { this.updateTime = updateTime; }
}
```

- [ ] **Step 3: Create AdminNamespace.java entity**

```java
package com.fast.agent.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import java.time.LocalDateTime;

@TableName("admin_namespace")
public class AdminNamespace {
    @TableId(type = IdType.AUTO)
    private Long id;
    @TableField("admin_id")
    private Long adminId;
    @TableField("namespace_id")
    private Long namespaceId;
    private String role;
    @TableField("create_time")
    private LocalDateTime createTime;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }
    public Long getNamespaceId() { return namespaceId; }
    public void setNamespaceId(Long namespaceId) { this.namespaceId = namespaceId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public LocalDateTime getCreateTime() { return createTime; }
    public void setCreateTime(LocalDateTime createTime) { this.createTime = createTime; }
}
```

---

### Task 3: Backend Mappers — Admin + AdminNamespace

**Files:**
- Create: `backend/src/main/java/com/fast/agent/repository/AdminMapper.java`
- Create: `backend/src/main/java/com/fast/agent/repository/AdminNamespaceMapper.java`
- Delete: `backend/src/main/java/com/fast/agent/repository/UserNamespaceMapper.java`

- [ ] **Step 1: Create AdminMapper.java**

```java
package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fast.agent.entity.Admin;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.Optional;

@Mapper
public interface AdminMapper extends BaseMapper<Admin> {
    @Select("SELECT * FROM admin WHERE username = #{username}")
    Optional<Admin> findByUsername(@Param("username") String username);
}
```

- [ ] **Step 2: Create AdminNamespaceMapper.java**

```java
package com.fast.agent.repository;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.fast.agent.entity.AdminNamespace;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import java.util.List;

@Mapper
public interface AdminNamespaceMapper extends BaseMapper<AdminNamespace> {
    @Select("SELECT * FROM admin_namespace WHERE admin_id = #{adminId}")
    List<AdminNamespace> findByAdminId(@Param("adminId") Long adminId);

    @Select("SELECT * FROM admin_namespace WHERE admin_id = #{adminId} AND namespace_id = #{namespaceId}")
    AdminNamespace findByAdminIdAndNamespaceId(@Param("adminId") Long adminId, @Param("namespaceId") Long namespaceId);

    @Select("SELECT * FROM admin_namespace WHERE namespace_id = #{namespaceId}")
    List<AdminNamespace> findByNamespaceId(@Param("namespaceId") Long namespaceId);

    @Select("SELECT COUNT(*) FROM admin_namespace WHERE admin_id = #{adminId} AND namespace_id = #{namespaceId} AND role = 'ADMIN'")
    int countAdminRole(@Param("adminId") Long adminId, @Param("namespaceId") Long namespaceId);
}
```

- [ ] **Step 3: Delete UserNamespaceMapper.java**

Remove the file `backend/src/main/java/com/fast/agent/repository/UserNamespaceMapper.java`.

---

### Task 4: Auth Infrastructure — JWT Utils + Filters + Context

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/util/JwtUtil.java` (rename/refactor)
- Create: `backend/src/main/java/com/fast/agent/util/UserJwtUtil.java`
- Create: `backend/src/main/java/com/fast/agent/util/AdminJwtUtil.java`
- Create: `backend/src/main/java/com/fast/agent/config/UserAuthFilter.java`
- Create: `backend/src/main/java/com/fast/agent/config/AdminAuthFilter.java`
- Create: `backend/src/main/java/com/fast/agent/config/AdminContext.java`
- Delete: `backend/src/main/java/com/fast/agent/util/JwtUtil.java`
- Delete: `backend/src/main/java/com/fast/agent/config/JwtAuthenticationFilter.java`
- Delete: `backend/src/main/java/com/fast/agent/config/NamespaceContext.java`

- [ ] **Step 1: Replace JwtUtil with UserJwtUtil.java**

```java
package com.fast.agent.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class UserJwtUtil {

    @Value("${agent.jwt.user-secret}")
    private String secret;

    @Value("${agent.jwt.user-expiration:604800000}")
    private long expiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long userId, String email) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

- [ ] **Step 2: Create AdminJwtUtil.java**

Same structure as UserJwtUtil but reads `agent.jwt.admin-secret` and `agent.jwt.admin-expiration`. JWT claims include `adminId`, `username`, `isGlobalAdmin`.

```java
package com.fast.agent.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class AdminJwtUtil {

    @Value("${agent.jwt.admin-secret}")
    private String secret;

    @Value("${agent.jwt.admin-expiration:7200000}")
    private long expiration;

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String generateToken(Long adminId, String username, Boolean isGlobalAdmin) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .setSubject(String.valueOf(adminId))
                .claim("username", username)
                .claim("isGlobalAdmin", isGlobalAdmin)
                .setIssuedAt(now)
                .setExpiration(expiryDate)
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    public Claims parseToken(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public boolean validateToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
```

- [ ] **Step 3: Create AdminContext.java**

```java
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
```

- [ ] **Step 4: Create UserAuthFilter.java**

```java
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
            // No context to clear for user — no NamespaceContext/AdminContext
        }
    }
}
```

- [ ] **Step 5: Create AdminAuthFilter.java**

```java
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
```

- [ ] **Step 6: Delete old files**

Delete these files that are no longer needed:
- `backend/src/main/java/com/fast/agent/util/JwtUtil.java`
- `backend/src/main/java/com/fast/agent/config/JwtAuthenticationFilter.java`
- `backend/src/main/java/com/fast/agent/config/NamespaceContext.java`

---

### Task 5: SecurityConfig — Dual Filter Chain

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/config/SecurityConfig.java`

- [ ] **Step 1: Rewrite SecurityConfig.java**

```java
package com.fast.agent.config;

import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired private UserAuthFilter userAuthFilter;
    @Autowired private AdminAuthFilter adminAuthFilter;

    @Value("${agent.cors.allowed-origin-patterns:}")
    private String allowedOriginPatterns;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        List<String> origins =
                Arrays.stream(allowedOriginPatterns.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList();
        configuration.setAllowedOriginPatterns(origins.isEmpty() ? List.of("*") : origins);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(
                        session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(
                        auth ->
                                auth.requestMatchers(HttpMethod.OPTIONS, "/**")
                                        .permitAll()
                                        .requestMatchers("/api/user/auth/login")
                                        .permitAll()
                                        .requestMatchers("/api/admin/auth/login")
                                        .permitAll()
                                        .requestMatchers("/socket.io/**")
                                        .permitAll()
                                        .requestMatchers("/error")
                                        .permitAll()
                                        .requestMatchers("/api/user/**")
                                        .authenticated()
                                        .requestMatchers("/api/admin/**")
                                        .authenticated()
                                        .anyRequest()
                                        .authenticated())
                .addFilterBefore(userAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(adminAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

---

### Task 6: Backend application.yml — Separate JWT Configs

**Files:**
- Modify: `backend/src/main/resources/application.yml`

- [ ] **Step 1: Update JWT configuration**

```yaml
agent:
  jwt:
    user-secret: ${JWT_USER_SECRET:user-secret-key-at-least-256-bits-long-for-hs256}
    user-expiration: 604800000
    admin-secret: ${JWT_ADMIN_SECRET:admin-secret-key-at-least-256-bits-long-for-hs256}
    admin-expiration: 7200000
```

---

### Task 7: User Auth — Controller + Service

**Files:**
- Create: `backend/src/main/java/com/fast/agent/rest/user/UserAuthController.java`
- Create: `backend/src/main/java/com/fast/agent/service/UserAuthService.java`
- Delete: `backend/src/main/java/com/fast/agent/rest/AuthController.java`
- Delete: `backend/src/main/java/com/fast/agent/service/AuthService.java`

- [ ] **Step 1: Create UserAuthService.java**

```java
package com.fast.agent.service;

import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.util.UserJwtUtil;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UserAuthService {

    @Autowired private UserMapper userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private UserJwtUtil userJwtUtil;

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("邮箱或密码错误");
        }
        if (user.getStatus() == null || user.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = userJwtUtil.generateToken(user.getId(), user.getEmail());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", buildUserMap(user));
        return result;
    }

    public User getCurrentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }
        String jwt = authHeader.substring(7);
        if (!userJwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }
        Long userId = Long.parseLong(userJwtUtil.parseToken(jwt).getSubject());
        return userRepository.findById(userId).orElse(null);
    }

    private Map<String, Object> buildUserMap(User user) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", user.getId());
        map.put("email", user.getEmail());
        map.put("nickname", user.getNickname());
        return map;
    }
}
```

- [ ] **Step 2: Create UserAuthController.java**

```java
package com.fast.agent.rest.user;

import com.fast.agent.entity.User;
import com.fast.agent.service.UserAuthService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/auth")
public class UserAuthController {

    @Autowired private UserAuthService userAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "邮箱和密码不能为空"));
        }
        try {
            return ResponseEntity.ok(userAuthService.login(email, password));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = userAuthService.getCurrentUser(authHeader);
            Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", user.getId());
            map.put("email", user.getEmail());
            map.put("nickname", user.getNickname());
            return ResponseEntity.ok(map);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
```

- [ ] **Step 3: Delete old AuthController.java and AuthService.java**

---

### Task 8: Admin Auth — Controller + Service

**Files:**
- Create: `backend/src/main/java/com/fast/agent/rest/admin/AdminAuthController.java`
- Create: `backend/src/main/java/com/fast/agent/service/AdminAuthService.java`

- [ ] **Step 1: Create AdminAuthService.java**

```java
package com.fast.agent.service;

import com.fast.agent.entity.Admin;
import com.fast.agent.repository.AdminMapper;
import com.fast.agent.repository.AdminNamespaceMapper;
import com.fast.agent.util.AdminJwtUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AdminAuthService {

    @Autowired private AdminMapper adminRepository;
    @Autowired private AdminNamespaceMapper adminNamespaceMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AdminJwtUtil adminJwtUtil;

    public Map<String, Object> login(String username, String password) {
        Admin admin = adminRepository.findByUsername(username).orElse(null);
        if (admin == null || !passwordEncoder.matches(password, admin.getPassword())) {
            throw new RuntimeException("用户名或密码错误");
        }
        if (admin.getStatus() == null || admin.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = adminJwtUtil.generateToken(admin.getId(), admin.getUsername(), admin.getIsGlobalAdmin());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("admin", buildAdminMap(admin));
        result.put("namespaces", getNamespaces(admin));
        return result;
    }

    public Admin getCurrentAdmin(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }
        String jwt = authHeader.substring(7);
        if (!adminJwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }
        Long adminId = Long.parseLong(adminJwtUtil.parseToken(jwt).getSubject());
        return adminRepository.selectById(adminId);
    }

    private Map<String, Object> buildAdminMap(Admin admin) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", admin.getId());
        map.put("username", admin.getUsername());
        map.put("nickname", admin.getNickname());
        map.put("isGlobalAdmin", admin.getIsGlobalAdmin());
        return map;
    }

    private List<Map<String, Object>> getNamespaces(Admin admin) {
        if (Boolean.TRUE.equals(admin.getIsGlobalAdmin())) {
            return List.of();
        }
        return adminNamespaceMapper.findByAdminId(admin.getId()).stream()
                .map(an -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", an.getNamespaceId());
                    map.put("role", an.getRole());
                    return map;
                })
                .collect(Collectors.toList());
    }
}
```

- [ ] **Step 2: Create AdminAuthController.java**

```java
package com.fast.agent.rest.admin;

import com.fast.agent.entity.Admin;
import com.fast.agent.service.AdminAuthService;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/auth")
public class AdminAuthController {

    @Autowired private AdminAuthService adminAuthService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "用户名和密码不能为空"));
        }
        try {
            return ResponseEntity.ok(adminAuthService.login(username, password));
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        try {
            Admin admin = adminAuthService.getCurrentAdmin(authHeader);
            Map<String, Object> result = new java.util.HashMap<>();
            result.put("id", admin.getId());
            result.put("username", admin.getUsername());
            result.put("nickname", admin.getNickname());
            result.put("isGlobalAdmin", admin.getIsGlobalAdmin());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
```

---

### Task 9: User API — Move Controllers to /api/user/

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/rest/UserAgentController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/ConversationController.java`
- Create: `backend/src/main/java/com/fast/agent/rest/user/UserNamespaceController.java`
- Modify: `backend/src/main/java/com/fast/agent/service/ConversationService.java`
- Delete: `backend/src/main/java/com/fast/agent/entity/UserNamespace.java`

- [ ] **Step 1: Move UserAgentController to /api/user prefix**

Move file to `backend/src/main/java/com/fast/agent/rest/user/UserAgentController.java` and change `@RequestMapping("/api/agents")` to `@RequestMapping("/api/user/agents")`.

- [ ] **Step 2: Move ConversationController to /api/user prefix**

Move file to `backend/src/main/java/com/fast/agent/rest/user/ConversationController.java` and change `@RequestMapping("/api/conversations")` to `@RequestMapping("/api/user/conversations")`.

- [ ] **Step 3: Create UserNamespaceController.java**

```java
package com.fast.agent.rest.user;

import com.fast.agent.entity.Namespace;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/namespaces")
public class UserNamespaceController {

    @Autowired
    private NamespaceService namespaceService;

    @GetMapping
    public List<Namespace> list() {
        return namespaceService.list();
    }
}
```

- [ ] **Step 4: Update ConversationService to use SecurityContextHolder directly**

In `ConversationService.java`, the `getCurrentUserId()` method already uses `SecurityContextHolder.getContext().getAuthentication().getPrincipal()`. This still works fine since `UserAuthFilter` sets the principal to the user ID as a String. No change needed to the method.

- [ ] **Step 5: Delete UserNamespace.java entity**

Remove `backend/src/main/java/com/fast/agent/entity/UserNamespace.java`.

---

### Task 10: Admin API — Update Permission Checks

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/rest/AdminNamespaceController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/AdminAgentController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/AdminModelController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/AdminModelTemplateController.java`
- Modify: `backend/src/main/java/com/fast/agent/rest/AdminUserController.java`
- Modify: `backend/src/main/java/com/fast/agent/service/UserService.java`

- [ ] **Step 1: Update AdminNamespaceController**

Change `NamespaceContext.getIsAdmin()` to `AdminContext.isGlobalAdmin()`. Replace `UserNamespaceMapper` with `AdminNamespaceMapper`. Update `getNamespaceUsers` to query from `user` table directly (not via `user_namespace`).

```java
package com.fast.agent.rest;

import com.fast.agent.config.AdminContext;
import com.fast.agent.entity.Namespace;
import com.fast.agent.entity.User;
import com.fast.agent.repository.UserMapper;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/namespaces")
public class AdminNamespaceController {

    @Autowired private NamespaceService namespaceService;
    @Autowired private UserMapper userMapper;

    @GetMapping
    public List<Namespace> list() {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.list();
    }

    @GetMapping("/{id}")
    public Namespace get(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return namespaceService.getById(id);
    }

    @PostMapping
    public void create(@RequestBody Namespace namespace) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.create(namespace);
    }

    @PutMapping("/{id}")
    public void update(@PathVariable Long id, @RequestBody Namespace namespace) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespace.setId(id);
        namespaceService.update(namespace);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        namespaceService.delete(id);
    }

    @GetMapping("/{id}/users")
    public List<Map<String, Object>> getNamespaceUsers(@PathVariable Long id) {
        if (!AdminContext.isGlobalAdmin()) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        List<User> users = userMapper.selectList(null).stream()
                .filter(u -> u.getId() != null)
                .toList();
        return users.stream().map(u -> Map.<String, Object>of(
            "userId", u.getId(),
            "nickname", u.getNickname(),
            "email", u.getEmail()
        )).toList();
    }
}
```

- [ ] **Step 2: Update AdminAgentController**

Replace `NamespaceContext` with `AdminContext`. Replace `userNamespaceMapper` permission check with `adminNamespaceMapper`.

```java
// In checkPermission method:
private void checkPermission(Long namespaceId) {
    if (AdminContext.isGlobalAdmin()) return;
    if (namespaceId == 0L) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    Long adminId = AdminContext.getAdminId();
    if (adminNamespaceMapper.countAdminRole(adminId, namespaceId) == 0) {
        throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }
}
```

Remove `UserNamespaceMapper` injection, add `AdminNamespaceMapper` injection.

- [ ] **Step 3: Update AdminModelController**

Same pattern as AdminAgentController — replace `NamespaceContext` with `AdminContext`, `UserNamespaceMapper` with `AdminNamespaceMapper`.

- [ ] **Step 4: Update AdminModelTemplateController**

Replace `NamespaceContext.getIsAdmin()` with `AdminContext.isGlobalAdmin()`.

- [ ] **Step 5: Update AdminUserController**

Replace `NamespaceContext.getIsAdmin()` with `AdminContext.isGlobalAdmin()`. Remove `isAdmin` parameter from the create request body. Update `UserService` to remove `isAdmin` parameter.

```java
// In UserService.create(), remove isAdmin param:
public User create(String email, String phone, String nickname, String password) {
    // ...
    // user.setIsAdmin(...) — remove this line
}
```

---

### Task 11: Backend — DataInitializer Update

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/init/DataInitializer.java`

- [ ] **Step 1: Update DataInitializer to also check admin table**

```java
package com.fast.agent.init;

import com.fast.agent.repository.AdminMapper;
import com.fast.agent.repository.UserMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired private UserMapper userRepository;
    @Autowired private AdminMapper adminRepository;

    @Override
    @Transactional
    public void run(String... args) {
        if (!userRepository.selectList(null).isEmpty() || !adminRepository.selectList(null).isEmpty()) {
            log.info("Data already exists, skipping initialization");
            return;
        }
        log.info("No data found — schema.sql should handle initial data");
    }
}
```

---

### Task 12: Backend — Update Socket.IO Handler Auth

**Files:**
- Modify: `backend/src/main/java/com/fast/agent/socketio/ConversationSocketIOHandler.java`

- [ ] **Step 1: Read the file and update auth to use UserJwtUtil**

Read current file and update any `JwtUtil` references to `UserJwtUtil`.

---

### Task 13: Frontend — Create user-frontend Application

**Files:**
- Create: `user-frontend/` directory (scaffold new Next.js app)
- Create: All pages, components, lib, types

- [ ] **Step 1: Scaffold user-frontend**

```bash
cd /Users/jiamin/work/fast-agent
npx create-next-app@14 user-frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

- [ ] **Step 2: Install dependencies**

```bash
cd user-frontend
npm install @base-ui/react class-variance-authority clsx tailwind-merge lucide-react sonner socket.io-client
npm install -D @types/node
```

- [ ] **Step 3: Create directory structure**

```bash
mkdir -p src/lib/api src/lib/hooks src/components/ui src/types
```

- [ ] **Step 4: Create shadcn/ui primitives** (button, input, card, dropdown, avatar, etc.)

Copy from existing frontend's `src/components/ui/` directory.

- [ ] **Step 5: Create config.ts**

```typescript
const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8081',
};

export default config;
```

- [ ] **Step 6: Create types/index.ts**

```typescript
export interface User {
  id: number;
  email: string;
  nickname: string;
}

export interface Agent {
  id: number;
  namespaceId: number;
  name: string;
  description?: string;
  avatar?: string;
  status: number;
}

export interface Conversation {
  uuid: string;
  name: string;
  agentId: number;
  modelId: number;
  namespaceId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  uuid: string;
  conversationUuid: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt?: string;
}

export interface Namespace {
  id: number;
  code: string;
  name: string;
  description?: string;
}
```

- [ ] **Step 7: Create src/lib/api/client.ts**

```typescript
const TOKEN_KEY = 'auth_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  document.cookie = `auth_token=${token}; path=/; max-age=604800`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = 'auth_token=; path=/; max-age=0';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    if (res.status === 401) clearToken();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `请求失败: ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 8: Create src/lib/api/auth.ts**

```typescript
import request from './client';

export async function login(email: string, password: string) {
  return request<{ token: string; user: any }>('/api/user/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getMe() {
  return request<any>('/api/user/auth/me');
}
```

- [ ] **Step 9: Create src/lib/api/agents.ts**, **namespaces.ts**, **conversations.ts** (API modules for user-facing operations)

- [ ] **Step 10: Create src/lib/hooks/use-auth.tsx** (AuthProvider + useAuth)

- [ ] **Step 11: Create src/lib/socket.ts** (Socket.IO client)

- [ ] **Step 12: Create src/middleware.ts** (route protection)

- [ ] **Step 13: Create pages**
  - `src/app/layout.tsx` — root layout
  - `src/app/login/page.tsx` — user login form
  - `src/app/(main)/layout.tsx` — main layout with sidebar
  - `src/app/(main)/page.tsx` — space/agent selector
  - `src/app/(main)/conversations/[uuid]/page.tsx` — chat view

---

### Task 14: Frontend — Create admin-frontend Application

**Files:**
- Create: `admin-frontend/` directory
- Create: All admin pages, components, lib, types

- [ ] **Step 1: Scaffold admin-frontend**

```bash
cd /Users/jiamin/work/fast-agent
npx create-next-app@14 admin-frontend --typescript --tailwind --eslint --app --src-dir --no-import-alias
```

- [ ] **Step 2: Install dependencies** (same as user-frontend)

- [ ] **Step 3: Create directory structure**

- [ ] **Step 4: Create shadcn/ui primitives** (table, dialog, button, input, card, etc.)

- [ ] **Step 5: Create types/index.ts** (Admin, AdminNamespace, Namespace, ModelTemplate, LlmModel, Agent, User types)

- [ ] **Step 6: Create API client** (using Admin JWT)

- [ ] **Step 7: Create API modules** (auth.ts, namespaces.ts, models.ts, agents.ts, users.ts, model-templates.ts)

- [ ] **Step 8: Create src/lib/hooks/use-auth.tsx** (AdminAuthProvider + useAdminAuth)

- [ ] **Step 9: Create src/middleware.ts**

- [ ] **Step 10: Create admin components** (AdminGuard, AdminSidebar, AdminHeader, DataTable, FormDialog)

- [ ] **Step 11: Create pages**
  - `src/app/layout.tsx` — root layout
  - `src/app/login/page.tsx` — admin login (username + password)
  - `src/app/admin/layout.tsx` — admin layout with sidebar + guard
  - `src/app/admin/page.tsx` — dashboard/redirect
  - `src/app/admin/namespaces/page.tsx` — namespace list
  - `src/app/admin/namespaces/[id]/users/page.tsx` — namespace user mgmt
  - `src/app/admin/model-templates/page.tsx` — model template CRUD
  - `src/app/admin/models/page.tsx` — model CRUD
  - `src/app/admin/agents/page.tsx` — agent CRUD
  - `src/app/admin/agents/[id]/resources/page.tsx` — agent resource binding
  - `src/app/admin/users/page.tsx` — user management (create, reset password)

---

### Task 15: Cleanup — Remove Old Frontend

**Files:**
- Delete: `frontend/` directory

- [ ] **Step 1: Remove old frontend**

```bash
rm -rf /Users/jiamin/work/fast-agent/frontend
```

---

### Task 16: Verify — Compile and Test

- [ ] **Step 1: Backend compile**

```bash
cd /Users/jiamin/work/fast-agent/backend
./mvnw compile -q
```

Expected: BUILD SUCCESS

- [ ] **Step 2: Backend tests**

```bash
cd /Users/jiamin/work/fast-agent/backend
./mvnw test -q
```

Expected: All tests pass

- [ ] **Step 3: user-frontend build**

```bash
cd /Users/jiamin/work/fast-agent/user-frontend
npm run build
```

Expected: Build completes without errors

- [ ] **Step 4: admin-frontend build**

```bash
cd /Users/jiamin/work/fast-agent/admin-frontend
npm run build
```

Expected: Build completes without errors
