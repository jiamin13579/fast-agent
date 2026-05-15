package com.fast.agent.socketio;

import com.corundumstudio.socketio.SocketIOClient;
import com.corundumstudio.socketio.annotation.OnEvent;
import com.fast.agent.service.ConversationService;
import com.fast.agent.service.SocketIOPushService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class ConversationSocketIOHandler {

    private final ConversationService conversationService;
    private final SocketIOPushService pushService;

    @OnEvent("join")
    public void onJoin(SocketIOClient client, String room) {
        client.joinRoom(room);
    }

    @OnEvent("leave")
    public void onLeave(SocketIOClient client, String room) {
        client.leaveRoom(room);
    }

    @OnEvent("auth")
    public void onAuth(SocketIOClient client, String token) {
        log.info("Client {} authenticated", client.getSessionId());
    }
}