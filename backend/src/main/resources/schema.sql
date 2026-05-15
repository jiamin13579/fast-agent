CREATE DATABASE IF NOT EXISTS agent_db DEFAULT CHARACTER SET utf8mb4;
USE agent_db;

DROP TABLE IF EXISTS agent_resource;
DROP TABLE IF EXISTS usage_log;
DROP TABLE IF EXISTS llm_model;
DROP TABLE IF EXISTS agent;
DROP TABLE IF EXISTS model_template;
DROP TABLE IF EXISTS user_namespace;
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
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    status INT NOT NULL DEFAULT 1,
    must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
    create_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
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

CREATE TABLE user_namespace (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    namespace_id BIGINT NOT NULL,
    role VARCHAR(20) NOT NULL COMMENT 'ADMIN/USER',
    UNIQUE KEY uk_user_namespace (user_id, namespace_id)
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

INSERT INTO `user` (email, phone, nickname, password, is_admin, status, must_change_password) VALUES
('admin@fast.com', '13800000000', 'Admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', TRUE, 1, FALSE);

INSERT INTO namespace (code, name, description) VALUES ('default', '默认空间', '系统默认空间');
