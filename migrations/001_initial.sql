CREATE TABLE projects (
    id CHAR(36) PRIMARY KEY,
    slug VARCHAR(80) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    assistant_name VARCHAR(80) NOT NULL DEFAULT 'Sabito',
    system_prompt TEXT NOT NULL,
    status ENUM('active', 'disabled') NOT NULL DEFAULT 'active',
    settings JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE project_credentials (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    client_id VARCHAR(80) NOT NULL UNIQUE,
    secret_hash CHAR(64) NOT NULL,
    secret_hint VARCHAR(16) NOT NULL,
    status ENUM('active', 'revoked') NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMP(3) NULL,
    expires_at TIMESTAMP(3) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    revoked_at TIMESTAMP(3) NULL,
    CONSTRAINT project_credentials_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX project_credentials_project_status_idx (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversations (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    external_user_id VARCHAR(191) NOT NULL,
    title VARCHAR(255) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT conversations_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX conversations_project_user_idx (project_id, external_user_id, updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE messages (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    conversation_id CHAR(36) NOT NULL,
    reply_to_message_id CHAR(36) NULL,
    role ENUM('user', 'assistant', 'system', 'tool') NOT NULL,
    content LONGTEXT NOT NULL,
    status ENUM('accepted', 'streaming', 'completed', 'failed') NOT NULL,
    idempotency_key VARCHAR(100) NULL,
    error_code VARCHAR(80) NULL,
    metadata JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    completed_at TIMESTAMP(3) NULL,
    CONSTRAINT messages_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT messages_conversation_fk FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    CONSTRAINT messages_reply_fk FOREIGN KEY (reply_to_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    UNIQUE KEY messages_project_idempotency_uq (project_id, idempotency_key),
    INDEX messages_conversation_created_idx (conversation_id, created_at),
    INDEX messages_reply_idx (reply_to_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE knowledge_documents (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    source_type ENUM('manual', 'url', 'file', 'api') NOT NULL DEFAULT 'manual',
    source_uri VARCHAR(1000) NULL,
    status ENUM('ready', 'processing', 'failed', 'disabled') NOT NULL DEFAULT 'ready',
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    CONSTRAINT knowledge_documents_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    INDEX knowledge_documents_project_status_idx (project_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE knowledge_chunks (
    id CHAR(36) PRIMARY KEY,
    project_id CHAR(36) NOT NULL,
    document_id CHAR(36) NOT NULL,
    chunk_index INT UNSIGNED NOT NULL,
    content TEXT NOT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT knowledge_chunks_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    CONSTRAINT knowledge_chunks_document_fk FOREIGN KEY (document_id) REFERENCES knowledge_documents(id) ON DELETE CASCADE,
    UNIQUE KEY knowledge_chunks_document_index_uq (document_id, chunk_index),
    INDEX knowledge_chunks_project_idx (project_id),
    FULLTEXT KEY knowledge_chunks_content_ft (content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_logs (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    project_id CHAR(36) NULL,
    actor_type ENUM('admin', 'client', 'user', 'system') NOT NULL,
    actor_id VARCHAR(191) NULL,
    action VARCHAR(120) NOT NULL,
    metadata JSON NULL,
    ip_address VARCHAR(45) NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    CONSTRAINT audit_logs_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    INDEX audit_logs_project_created_idx (project_id, created_at),
    INDEX audit_logs_action_created_idx (action, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
