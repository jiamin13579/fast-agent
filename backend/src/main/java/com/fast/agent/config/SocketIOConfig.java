package com.fast.agent.config;

import com.corundumstudio.socketio.AuthorizationResult;
import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.AuthorizationListener;
import com.corundumstudio.socketio.HandshakeData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@Slf4j
public class SocketIOConfig {

    @Value("${socketio.port:8081}")
    private int port;

    private final com.fast.agent.socketio.ConversationSocketIOHandler conversationSocketIOHandler;

    public SocketIOConfig(com.fast.agent.socketio.ConversationSocketIOHandler conversationSocketIOHandler) {
        this.conversationSocketIOHandler = conversationSocketIOHandler;
    }

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setPort(port);
        config.setAllowCustomRequests(true);

        // Allow all origins for CORS
        config.setAuthorizationListener(data -> AuthorizationResult.SUCCESSFUL_AUTHORIZATION);

        SocketIOServer server = new SocketIOServer(config);
        server.addEventListener("join", String.class, (client, room, ackRequest) ->
            client.joinRoom(room)
        );
        server.addEventListener("leave", String.class, (client, room, ackRequest) ->
            client.leaveRoom(room)
        );
        server.start();

        return server;
    }
}