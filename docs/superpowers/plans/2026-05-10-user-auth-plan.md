# 用户认证实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现邮箱+密码登录的用户认证体系，包含 JWT 认证、权限控制和管理员密码重置功能

**Architecture:**
- 后端：Spring Boot + MyBatis-Plus + Spring Security（JWT）
- 前端：Next.js App Router + Tailwind CSS
- 数据库：MySQL，用户数据预初始化

**Tech Stack:** Spring Security, jjwt, BCrypt, Next.js 14 (App Router)

---

## 文件结构

```
backend/src/main/java/com/agent/
├── config/
│   └── SecurityConfig.java          # Spring Security 配置，JWT 过滤器
├── entity/
│   └── User.java                     # 用户实体（含 Role 枚举）
├── repository/
│   └── UserRepository.java           # MyBatis-Plus Mapper
├── service/
│   └── UserService.java              # 用户服务（含密码重置）
├── util/
│   └── JwtUtil.java                  # JWT 生成/验证工具
├── controller/
│   └── AuthController.java           # 登录、当前用户接口
│   └── AdminUserController.java      # 管理员操作用户接口
└── init/
    └── DataInitializer.java          # 启动时初始化 6 个默认用户

frontend/src/
├── app/
│   └── login/
│       └── page.tsx                  # 登录页
└── lib/
    └── auth.ts                       # 认证状态管理
```

---

## Task 1: 后端 - User 实体和 Role 枚举

**Files:**
- Create: `backend/src/main/java/com/agent/entity/Role.java`
- Create: `backend/src/main/java/com/agent/entity/User.java`
- Create: `backend/src/main/java/com/agent/repository/UserRepository.java`

- [ ] **Step 1: 创建 Role 枚举**

```java
package com.agent.entity;

public enum Role {
    SUPER_ADMIN,
    ADMIN,
    USER
}
```

- [ ] **Step 2: 创建 User 实体**

```java
package com.agent.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("t_user")
public class User {
    @TableId(type = IdType.AUTO)
    private Long id;

    private String email;
    private String phone;
    private String nickname;
    private String password;
    private Role role;
    private Integer status; // 1=ENABLED, 0=DISABLED
    private Boolean mustChangePassword;
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
```

- [ ] **Step 3: 创建 UserRepository**

```java
package com.agent.repository;

import com.agent.entity.User;
import com.baomidou.mybatisplus.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserRepository extends BaseMapper<User> {
}
```

- [ ] **Step 4: 运行 SQL 建表**

```sql
CREATE TABLE IF NOT EXISTS t_user (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    nickname VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,
    status INT NOT NULL DEFAULT 1,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

Run: `mysql -h 43.134.96.44 -u dbadmin -p'Db@Adm123' agent_db -e "CREATE TABLE IF NOT EXISTS t_user (...)"`

- [ ] **Step 5: 提交**

```bash
git add backend/src/main/java/com/agent/entity/Role.java backend/src/main/java/com/agent/entity/User.java backend/src/main/java/com/agent/repository/UserRepository.java
git commit -m "feat: add User entity and Role enum"
```

---

## Task 2: 后端 - JWT 工具类

**Files:**
- Create: `backend/src/main/java/com/agent/util/JwtUtil.java`

- [ ] **Step 1: 添加 JWT 依赖到 pom.xml**

在 `<dependencies>` 中添加：
```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.11.5</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.11.5</version>
    <scope>runtime</scope>
</dependency>
```

- [ ] **Step 2: 创建 JwtUtil**

```java
package com.agent.util;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {

    @Value("${agent.jwt.secret:super-secret-key-for-jwt-tokens-2024}")
    private String secret;

    @Value("${agent.jwt.expiration:604800000}") // 7 days in ms
    private long expiration;

    private SecretKey getSigningKey() {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(Long userId, String email, String role) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + expiration);

        return Jwts.builder()
                .setSubject(String.valueOf(userId))
                .claim("email", email)
                .claim("role", role)
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

- [ ] **Step 3: 提交**

```bash
git add backend/pom.xml backend/src/main/java/com/agent/util/JwtUtil.java
git commit -m "feat: add JWT utility with jjwt"
```

---

## Task 3: 后端 - 认证服务 (AuthService)

**Files:**
- Create: `backend/src/main/java/com/agent/service/AuthService.java`

- [ ] **Step 1: 创建 AuthService**

```java
package com.agent.service;

import com.agent.entity.User;
import com.agent.repository.UserRepository;
import com.agent.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public Map<String, Object> login(String email, String password) {
        User user = userRepository.selectOne(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User>()
                .eq(User::getEmail, email)
        );

        if (user == null || !passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("邮箱或密码错误");
        }

        if (user.getStatus() == 0) {
            throw new RuntimeException("账号已被禁用");
        }

        String token = jwtUtil.generateToken(user.getId(), user.getEmail(), user.getRole().name());

        Map<String, Object> result = new HashMap<>();
        result.put("token", token);
        result.put("user", Map.of(
            "id", user.getId(),
            "email", user.getEmail(),
            "nickname", user.getNickname(),
            "role", user.getRole().name(),
            "mustChangePassword", user.getMustChangePassword()
        ));

        return result;
    }

    public User getCurrentUser(String token) {
        if (token == null || !token.startsWith("Bearer ")) {
            throw new RuntimeException("未登录");
        }

        String jwt = token.substring(7);
        if (!jwtUtil.validateToken(jwt)) {
            throw new RuntimeException("token 已过期");
        }

        Long userId = Long.parseLong(jwtUtil.parseToken(jwt).getSubject());
        return userRepository.selectById(userId);
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/agent/service/AuthService.java
git commit -m "feat: add AuthService for login"
```

---

## Task 4: 后端 - Security 配置和 JWT 过滤器

**Files:**
- Create: `backend/src/main/java/com/agent/config/SecurityConfig.java`
- Create: `backend/src/main/java/com/agent/config/JwtAuthenticationFilter.java`

- [ ] **Step 1: 添加 Spring Security 依赖到 pom.xml**

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
```

- [ ] **Step 2: 创建 JwtAuthenticationFilter**

```java
package com.agent.config;

import com.agent.util.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    @Autowired
    private JwtUtil jwtUtil;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            if (jwtUtil.validateToken(token)) {
                var claims = jwtUtil.parseToken(token);
                String role = claims.get("role", String.class);
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                    claims.getSubject(), null,
                    Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                );
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }
}
```

- [ ] **Step 3: 创建 SecurityConfig**

```java
package com.agent.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf().disable()
            .cors().and()
            .sessionManagement().sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            .and()
            .authorizeRequests()
                .antMatchers("/api/auth/login").permitAll()
                .anyRequest().authenticated()
            .and()
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

- [ ] **Step 4: 提交**

```bash
git add backend/pom.xml backend/src/main/java/com/agent/config/SecurityConfig.java backend/src/main/java/com/agent/config/JwtAuthenticationFilter.java
git commit -m "feat: add Spring Security with JWT filter"
```

---

## Task 5: 后端 - AuthController

**Files:**
- Create: `backend/src/main/java/com/agent/controller/AuthController.java`

- [ ] **Step 1: 创建 AuthController**

```java
package com.agent.controller;

import com.agent.entity.User;
import com.agent.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String password = body.get("password");
            return authService.login(email, password);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(401, e.getMessage());
        }
    }

    @GetMapping("/me")
    public Map<String, Object> me(@RequestHeader("Authorization") String authHeader) {
        try {
            User user = authService.getCurrentUser(authHeader);
            return Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "nickname", user.getNickname(),
                "role", user.getRole().name()
            );
        } catch (RuntimeException e) {
            throw new ResponseStatusException(401, e.getMessage());
        }
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/agent/controller/AuthController.java
git commit -m "feat: add AuthController for login/me APIs"
```

---

## Task 6: 后端 - 管理员重置密码接口

**Files:**
- Create: `backend/src/main/java/com/agent/controller/AdminUserController.java`
- Create: `backend/src/main/java/com/agent/service/UserService.java`

- [ ] **Step 1: 创建 UserService**

```java
package com.agent.service;

import com.agent.entity.User;
import com.agent.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public String resetPassword(Long userId) {
        User user = userRepository.selectById(userId);
        if (user == null) {
            throw new RuntimeException("用户不存在");
        }

        String newPassword = generateRandomPassword(8);
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setMustChangePassword(true);
        userRepository.updateById(user);

        return newPassword;
    }

    private String generateRandomPassword(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        Random random = new Random();
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
```

- [ ] **Step 2: 创建 AdminUserController**

```java
package com.agent.controller;

import com.agent.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @PostMapping("/{id}/reset-password")
    public Map<String, String> resetPassword(@PathVariable Long id) {
        try {
            String newPassword = userService.resetPassword(id);
            return Map.of("newPassword", newPassword);
        } catch (RuntimeException e) {
            throw new ResponseStatusException(400, e.getMessage());
        }
    }
}
```

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/agent/controller/AdminUserController.java backend/src/main/java/com/agent/service/UserService.java
git commit -m "feat: add admin user reset password API"
```

---

## Task 7: 后端 - 初始化默认用户

**Files:**
- Create: `backend/src/main/java/com/agent/init/DataInitializer.java`

- [ ] **Step 1: 创建 DataInitializer**

```java
package com.agent.init;

import com.agent.entity.Role;
import com.agent.entity.User;
import com.agent.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.selectCount(null) > 0) {
            return; // 已有数据，跳过
        }

        String defaultPassword = passwordEncoder.encode("123456");

        User[] users = {
            createUser("superadmin@example.com", "superadmin", Role.SUPER_ADMIN),
            createUser("admin1@example.com", "管理员1", Role.ADMIN),
            createUser("admin2@example.com", "管理员2", Role.ADMIN),
            createUser("user1@example.com", "用户1", Role.USER),
            createUser("user2@example.com", "用户2", Role.USER),
            createUser("user3@example.com", "用户3", Role.USER)
        };

        for (User user : users) {
            user.setPassword(defaultPassword);
            user.setStatus(1);
            user.setMustChangePassword(true);
            userRepository.insert(user);
        }

        System.out.println("Initialized " + users.length + " default users");
    }

    private User createUser(String email, String nickname, Role role) {
        User user = new User();
        user.setEmail(email);
        user.setNickname(nickname);
        user.setRole(role);
        return user;
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add backend/src/main/java/com/agent/init/DataInitializer.java
git commit -m "feat: add DataInitializer for default users"
```

---

## Task 8: 前端 - 登录页

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Create: `frontend/src/lib/auth.ts` (认证状态管理)

- [ ] **Step 1: 创建 auth.ts**

```typescript
const API_BASE = "http://localhost:8080/api";
const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export interface User {
  id: number;
  email: string;
  nickname: string;
  role: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(USER_KEY);
  return stored ? JSON.parse(stored) : null;
}

export function setUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || "登录失败");
  }

  const data = await res.json();
  setToken(data.token);
  setUser(data.user);
  return data.user;
}

export async function getCurrentUser(): Promise<User> {
  const token = getToken();
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    clearAuth();
    throw new Error("未登录");
  }

  return res.json();
}
```

- [ ] **Step 2: 创建登录页 login/page.tsx**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("登录成功");
      router.push("/chat");
    } catch (err: any) {
      toast.error(err.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-[400px]">
        <CardHeader className="text-center">
          <CardTitle>登录</CardTitle>
          <CardDescription>输入邮箱和密码登录系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">邮箱</label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">密码</label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: 创建路由保护中间件**

Create: `frontend/src/middleware.ts`

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const token = getToken();
  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/chat", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico|api/).*)"],
};
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/lib/auth.ts frontend/src/app/login/page.tsx frontend/src/middleware.ts
git commit -m "feat: add login page and auth utilities"
```

---

## Task 9: 前端 - 修改现有页面集成登录状态

**Files:**
- Modify: `frontend/src/app/page.tsx` (主页面重定向到 /chat 如果已登录)

- [ ] **Step 1: 修改 page.tsx 使其重定向**

在文件顶部添加：
```tsx
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
```

在组件开头添加 useEffect：
```tsx
useEffect(() => {
  if (getToken()) {
    router.push("/chat");
  } else {
    router.push("/login");
  }
}, [router]);
```

然后移除整个页面内容（因为现在路由由 middleware 控制）。

- [ ] **Step 2: 提交**

```bash
git add frontend/src/app/page.tsx
git commit -m "feat: redirect to login if not authenticated"
```

---

## Task 10: 验证

**验证步骤：**

- [ ] **Step 1: 启动后端**

Run: `cd backend && mvn spring-boot:run`
Expected: 后端启动成功，端口 8080

- [ ] **Step 2: 测试登录 API**

Run: `curl -X POST http://localhost:8080/api/auth/login -H "Content-Type: application/json" -d '{"email":"superadmin@example.com","password":"123456"}'`
Expected: 返回 JWT token 和 user 信息

- [ ] **Step 3: 测试获取当前用户**

Run: `curl http://localhost:8080/api/auth/me -H "Authorization: Bearer <token>"`
Expected: 返回当前用户信息

- [ ] **Step 4: 启动前端**

Run: `cd frontend && npm run dev`
Expected: 访问 http://localhost:3000 自动跳转到 /login

- [ ] **Step 5: 测试登录流程**

在浏览器中打开 http://localhost:3000/login，输入 superadmin@example.com / 123456，验证登录成功后跳转到 /chat

---

## 总结

本计划包含 10 个 Task，覆盖：
- 后端：User 实体、JWT 工具、AuthService、Security 配置、AuthController、AdminUserController、DataInitializer
- 前端：登录页、auth 工具类、路由保护
- 验证：完整的测试流程

每个 Task 独立可测试，建议按顺序执行。