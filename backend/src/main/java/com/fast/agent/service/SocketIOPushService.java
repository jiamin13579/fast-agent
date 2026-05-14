package com.fast.agent.service;

import com.corundumstudio.socketio.SocketIOServer;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class SocketIOPushService {

    private SocketIOServer socketIOServer;

    public SocketIOPushService(@Lazy SocketIOServer socketIOServer) {
        // Using @Lazy to break circular reference - socketIOServer will be injected after initialization
        this.socketIOServer = socketIOServer;
    }

    public void pushToRoom(String room, String event, Object data) {
        if (socketIOServer == null) {
            return;
        }
        try {
            socketIOServer.getNamespace("/").getRoomOperations(room).sendEvent(event, data);
        } catch (Exception e) {
            // Log error but don't crash
        }
    }

    public void pushNewMessage(String conversationUuid, Object message) {
        pushToRoom("conversation:" + conversationUuid, "new_message", message);
    }

    public void pushAgentProgress(String conversationUuid, Object progress) {
        pushToRoom("agent:" + conversationUuid, "agent_progress", progress);
    }

    public void pushSync(String conversationUuid, Object syncData) {
        pushToRoom("conversation:" + conversationUuid, "sync", syncData);
        pushToRoom("global:notifications", "sync", syncData);
    }

    public void pushStreamChunk(String conversationUuid, String messageUuid, String content) {
        pushToRoom("conversation:" + conversationUuid, "stream_chunk", Map.of(
            "message_uuid", messageUuid,
            "content", content
        ));
    }

    public void pushStreamDone(String conversationUuid, String messageUuid, String fullContent) {
        pushToRoom("conversation:" + conversationUuid, "stream_done", Map.of(
            "message_uuid", messageUuid,
            "full_content", fullContent
        ));
    }
}