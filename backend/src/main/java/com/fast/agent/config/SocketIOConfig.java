package com.fast.agent.config;

import com.corundumstudio.socketio.SocketIOServer;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
public class SocketIOConfig {

    @Value("${socketio.port:8080}")
    private int port;

    private final com.fast.agent.ws.ConversationSocketIOHandler conversationSocketIOHandler;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setPort(port);
        config.setContext("/");

        // Enable heartbeat for connection health
        config.setHeartbeatInterval(25);
        config.setHeartbeatTimeout(60);

        SocketIOServer server = new SocketIOServer(config);
        server.addNamespace("/").addListeners(conversationSocketIOHandler);

        return server;
    }
}