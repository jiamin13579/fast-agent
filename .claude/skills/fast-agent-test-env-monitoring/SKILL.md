---
name: fast-agent-test-env-monitoring
description: Use when starting the project test environment, running Playwright browser monitoring, or collecting and fixing UI console errors during manual testing
---

# Test Environment Monitoring

## Overview
Start backend + 2 frontends + 2 Playwright browsers in headed mode. After user signals they're done, automatically collect all errors, record in bug report, and fix them one by one.

## When to Use
- Setting up the full-stack dev environment for this project
- User needs headed Playwright browsers to interact with UI while you monitor for errors
- Collecting and fixing browser console errors after manual testing

## Behavior
- On load: **check `docs/test-bugs/`** for any bug reports with bugs in `pending`/`fixing` status. If found, start fixing immediately without asking.
- Before starting environment: check if old processes are still running (`lsof -ti:8080 -ti:3000 -ti:3001`). If yes, kill them first to avoid port conflicts.
- Before collecting errors: check all services and browsers are healthy. Recover any that crashed.
- After environment starts: if there are no unresolved bugs, **wait**. When user says "done" / "检查错误", run the full pipeline automatically — no need to ask "should I check now?".

## Prerequisites
- `playwright-cli` — if not found globally, use `npx playwright-cli`
- `node` + `npm` — for frontends
- `java` + `mvn` — for backend

## Workflow

### 1. Start Environment
```bash
bash .claude/skills/fast-agent-test-env-monitoring/scripts/test-env.sh
```
Script auto-checks prerequisites and installs npm dependencies if needed.

### 2. User Interacts
Wait. Do nothing until user signals they're done.

### 3. Auto Pipeline (triggered by user saying "done" / "检查错误")

Step A — Collect errors from all sources:
```bash
playwright-cli -s=user-browser console error
playwright-cli -s=admin-browser console error
playwright-cli -s=user-browser console warning
playwright-cli -s=admin-browser console warning
playwright-cli -s=user-browser network
playwright-cli -s=admin-browser network
playwright-cli -s=user-browser snapshot --depth=4
playwright-cli -s=admin-browser snapshot --depth=4
tail -30 /tmp/backend.log
```

Step B — Create bug report:
```bash
cp .claude/skills/fast-agent-test-env-monitoring/templates/bug-report.md \
   docs/test-bugs/$(date +%Y-%m-%d-%H%M%S).md
```

Populate each error into the report.

Step C — Fix one bug at a time, without asking for permission:

1. **Analyze** — trace call chain to find root cause
2. **Fix** — minimal, targeted change
3. **Verify** — reload page, confirm error no longer appears
4. **Commit** — `git commit -am "fix: BUG-N <description>"`
5. **Update** — mark bug as verified in report
6. **Proceed** — next bug

Do NOT ask "can I fix this?" — just fix. Do NOT fix multiple bugs before verifying each one.

Step D — Final verification:
- [ ] All bugs verified/closed in report
- [ ] Each bug committed with message `fix: BUG-N <description>`
- [ ] Both browsers show zero console errors
- [ ] Backend log has no new exceptions

### 4. Recovery

During the session, services or browsers may crash. Before collecting errors or fixing bugs, check health and recover:

```bash
# Check service health
curl -s -o /dev/null -w "backend: %{http_code}\n" http://localhost:8080
curl -s -o /dev/null -w "user: %{http_code}\n" -L http://localhost:3000
curl -s -o /dev/null -w "admin: %{http_code}\n" -L http://localhost:3001

# Check browser sessions
playwright-cli list

# Restart backend if down
lsof -ti:8080 || (cd backend && nohup mvn spring-boot:run -q > /tmp/backend.log 2>&1 &)

# Restart frontend if down
lsof -ti:3000 || (cd user-frontend && nohup npm run dev > /tmp/user-frontend.log 2>&1 &)
lsof -ti:3001 || (cd admin-frontend && nohup npm run dev -- -p 3001 > /tmp/admin-frontend.log 2>&1 &)

# Reopen browser session if closed
playwright-cli -s=user-browser open http://localhost:3000 --headed
playwright-cli -s=admin-browser open http://localhost:3001 --headed
```

### 5. Stop Environment
```bash
playwright-cli kill-all
lsof -ti:8080 -ti:3000 -ti:3001 | xargs kill -9
```

## Sessions
| Session | URL | Frontend |
|---------|-----|----------|
| `user-browser` | http://localhost:3000 | User chat |
| `admin-browser` | http://localhost:3001 | Admin panel |

## Test Accounts
| Account | Password | Frontend |
|---------|----------|----------|
| admin@fast.com | 123456 | User login |
| admin | 123456 | Admin login |

## Common Issues
| Symptom | Likely Cause | Fix |
|---------|-------------|------|
| Login hangs "登录中..." | Backend DB connection pool stale | Restart backend |
| Login 500 error | Backend compilation error | `mvn clean compile` then restart |
| Login 500 error | Controller NPE (`Map.of` with null) | Add null check before `Map.of` |
| Page 404 after login | Route doesn't exist | Navigate to existing route |
| Console network errors | Backend down or CORS | Check backend log |
| `playwright-cli: command not found` | Not installed globally | Use `npx playwright-cli` or `npm install -g @playwright/cli` |

## Related Files
| Path | Purpose |
|------|---------|
| `.claude/skills/fast-agent-test-env-monitoring/` | Skill source (canonical) |
| `.claude/.claude/skills/fast-agent-test-env-monitoring/` | Skill deployment (auto-discovered) |
| `docs/test-bugs/` | Bug report storage |
