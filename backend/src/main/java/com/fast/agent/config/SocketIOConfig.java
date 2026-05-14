package com.fast.agent.config;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.AuthorizationListener;
import com.corundumstudio.socketio.SocketIOClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SocketIOConfig {

    @Value("${socketio.port:8081}")
    private int port;

    private final com.fast.agent.ws.ConversationSocketIOHandler conversationSocketIOHandler;

    public SocketIOConfig(com.fast.agent.ws.ConversationSocketIOHandler conversationSocketIOHandler) {
        this.conversationSocketIOHandler = conversationSocketIOHandler;
    }

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setPort(port);
        config.setContext("/");
        config.setAllowCustomRequests(true);

        // Allow all origins for CORS
        config.setAuthorizationListener(new AuthorizationListener() {
            @Override
            public boolean isAuthorized(SocketIOClient client) {
                return true;
            }
        });

        SocketIOServer server = new SocketIOServer(config);
        server.addNamespace("/").addListeners(conversationSocketIOHandler);
        server.start();

        return server;
    }
}