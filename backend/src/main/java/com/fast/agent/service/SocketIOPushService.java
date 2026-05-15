package com.fast.agent.service;

import com.corundumstudio.socketio.SocketIOServer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@Slf4j
public class SocketIOPushService {

    private SocketIOServer socketIOServer;

    public SocketIOPushService(@Lazy SocketIOServer socketIOServer) {
        this.socketIOServer = socketIOServer;
    }

    public void pushToRoom(String room, String event, Object data) {
        if (socketIOServer == null) {
            log.warn("SocketIOServer not initialized, skip push to room: {}", room);
            return;
        }
        try {
            var ns = socketIOServer.getNamespace("");
            if (ns == null) {
                log.warn("Namespace not found for room: {}", room);
                return;
            }
            ns.getRoomOperations(room).sendEvent(event, data);
        } catch (Exception e) {
            log.error("Failed to push event {} to room {}: {}", event, room, e.getMessage());
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

    public void pushStreamEvent(String conversationUuid, Map<String, Object> data) {
        pushToRoom("conversation:" + conversationUuid, "stream_event", data);
    }
}