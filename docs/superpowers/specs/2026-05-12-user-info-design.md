# 右上角用户信息展示 - 设计文档

日期: 2026-05-12

## 需求

在应用右上角展示当前登录用户的头像和个人信息，点击头像展开下拉菜单显示详细信息和登出选项。

## 数据来源

- API: `GET /api/auth/me`
- Header: `Authorization: Bearer <token>`
- 返回格式:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "nickname": "张三",
    "role": "ADMIN"
  }
  ```

## UI 设计

### 布局

在 `AppLayout` 顶部右侧添加用户信息区域，不影响左侧导航栏。

### 组件结构

```
HeaderRight
├── Avatar + Nickname + Arrow
└── Dropdown Menu
    ├── Nickname
    ├── Email
    ├── Role Badge
    ├── Divider
    └── Logout Button
```

### 样式

- **头像**: 圆形，40px，显示姓名首字母，渐变背景色
- **昵称**: 14px，常规字体
- **下拉箭头**: ▼
- **下拉菜单**: 白色卡片，8px 圆角，阴影，200px 宽度
- **菜单项**: hover 时浅灰背景

### 交互

- 点击头像区域展开/收起下拉菜单
- 点击外部关闭菜单
- 登出: 清除 localStorage 中的 auth_token 和 auth_user，跳转 /login

## 文件修改

- `frontend/src/components/layout.tsx`: 修改 AppLayout，添加 HeaderRight 组件

## 实现步骤

1. 在 AppLayout 添加 header 容器，右侧放置用户信息
2. 创建 HeaderRight 组件，包含头像、昵称、箭头
3. 实现下拉菜单，包含用户信息和登出按钮
4. 添加点击外部关闭菜单的逻辑
5. 样式适配（参考现有蓝白配色）