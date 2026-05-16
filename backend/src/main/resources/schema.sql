CREATE DATABASE IF NOT EXISTS agent_db DEFAULT CHARACTER SET utf8mb4;
USE agent_db;

DROP TABLE IF EXISTS agent_resource;
DROP TABLE IF EXISTS usage_log;
DROP TABLE IF EXISTS llm_model;
DROP TABLE IF EXISTS agent;
DROP TABLE IF EXISTS model_template;
DROP TABLE IF EXISTS admin_namespace;
DROP TABLE IF EXISTS admin;
DROP TABLE IF EXISTS namespace;
DROP TABLE IF EXISTS chat_message;
DROP TABLE IF EXISTS conversation;
DROP TABLE IF EXISTS `user`;

CREATE TABLE `user` (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    nickname VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    status INT NOT NULL DEFAULT 1,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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

CREATE TABLE `admin_namespace` (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    admin_id     BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    role         VARCHAR(20) NOT NULL DEFAULT 'ADMIN' COMMENT 'ADMIN/VIEWER',
    create_time  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_admin_namespace (admin_id, namespace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE conversation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL DEFAULT 1,
    uuid VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    agent_id BIGINT,
    model_id BIGINT,
    namespace_id BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_uuid (uuid),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE chat_message (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    uuid VARCHAR(36) NOT NULL,
    conversation_uuid VARCHAR(36) NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'user/assistant/system',
    content TEXT NOT NULL,
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uk_uuid (uuid),
    INDEX idx_chat_message_conversation_uuid (conversation_uuid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE namespace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(500),
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE model_template (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    base_url VARCHAR(500),
    max_tokens INT,
    temperature DECIMAL(3,2),
    description VARCHAR(500),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE llm_model (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    namespace_id BIGINT NOT NULL COMMENT '0=全局模型',
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    api_key VARCHAR(500),
    base_url VARCHAR(500),
    max_tokens INT,
    temperature DECIMAL(3,2),
    status INT NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_namespace_model (namespace_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    namespace_id BIGINT NOT NULL COMMENT '0=全局 Agent',
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    system_prompt TEXT,
    avatar VARCHAR(500),
    status INT NOT NULL DEFAULT 1,
    version INT NOT NULL DEFAULT 1,
    created_by BIGINT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_namespace_agent (namespace_id, name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE agent_resource (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    agent_id BIGINT NOT NULL,
    resource_type VARCHAR(20) NOT NULL COMMENT 'MODEL/TOOL/SKILL/MCP',
    resource_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_resource (agent_id, resource_type, resource_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE usage_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    agent_id BIGINT,
    model_id BIGINT,
    conversation_id VARCHAR(36),
    input_tokens INT,
    output_tokens INT,
    duration_ms INT,
    cost DECIMAL(10,6),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `admin` (username, nickname, password, is_global_admin, status) VALUES
('admin', 'Admin', '$2a$10$g37MXvYIb6LthhtCyU7riOi2dD.mF6vE90DoUlPWczbTB07aWJR2m', 1, 1);

INSERT INTO `user` (email, phone, nickname, password, status) VALUES
('user@fast.com', '13800000001', 'User', '$2a$10$g37MXvYIb6LthhtCyU7riOi2dD.mF6vE90DoUlPWczbTB07aWJR2m', 1);

INSERT INTO namespace (code, name, description) VALUES ('default', '默认空间', '系统默认空间');

INSERT INTO `admin_namespace` (admin_id, namespace_id, role) VALUES (1, 1, 'ADMIN');

-- Model Templates (全局模板)
INSERT INTO model_template (name, provider, model_name, base_url, max_tokens, temperature, description) VALUES
('MiniMax-ABI', 'minimax', 'MiniMax-ABI', 'https://api.minimax.chat/v1', 32000, 0.70, 'MiniMax ABI 模型，适合对话任务');

-- 全局 LLM 模型 (namespace_id=0)
INSERT INTO llm_model (namespace_id, name, provider, model_name, api_key, base_url, max_tokens, temperature, status) VALUES
(0, 'MiniMax-M2.7', 'minimax', 'MiniMax-M2.7', 'YOUR_API_KEY', 'https://api.minimax.chat/v1', 32000, 0.70, 1);
INSERT INTO llm_model (namespace_id, name, provider, model_name, api_key, base_url, max_tokens, temperature, status) VALUES
(0, 'GPT-4', 'openai', 'gpt-4', 'YOUR_API_KEY', 'https://api.openai.com/v1', 8192, 0.70, 1);
INSERT INTO llm_model (namespace_id, name, provider, model_name, api_key, base_url, max_tokens, temperature, status) VALUES
(0, 'Claude-3', 'anthropic', 'claude-3-haiku-20240307', 'YOUR_API_KEY', 'https://api.anthropic.com/v1', 4096, 0.70, 1);

-- 全局 Agent (namespace_id=0)
INSERT INTO agent (namespace_id, name, description, system_prompt, avatar, status, version, created_by) VALUES
(0, '私人助手', '通用对话助手', '你是一个友善且有用的AI助手。', 'https://api.minimax.chat/v1/avatar.jpg', 1, 1, 1);

-- 绑定 Agent 资源 (Agent + Model)
INSERT INTO agent_resource (agent_id, resource_type, resource_id) VALUES
(1, 'MODEL', 1),
(1, 'MODEL', 2),
(1, 'MODEL', 3);

-- Namespace 模型 (namespace_id=1, 默认空间)
INSERT INTO llm_model (namespace_id, name, provider, model_name, api_key, base_url, max_tokens, temperature, status) VALUES
(1, '默认模型', 'minimax', 'MiniMax-M2.7', 'YOUR_API_KEY', 'https://api.minimax.chat/v1', 32000, 0.70, 1);

-- Namespace Agent (namespace_id=1)
INSERT INTO agent (namespace_id, name, description, system_prompt, avatar, status, version, created_by) VALUES
(1, '工作助手', '团队协作助手', '你是一个专注于团队协作和任务管理的AI助手。', 'https://api.minimax.chat/v1/avatar.jpg', 1, 1, 1);

INSERT INTO agent_resource (agent_id, resource_type, resource_id) VALUES
(2, 'MODEL', 4);
