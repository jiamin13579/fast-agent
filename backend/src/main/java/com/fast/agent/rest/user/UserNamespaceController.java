package com.fast.agent.rest.user;

import com.fast.agent.entity.Namespace;
import com.fast.agent.service.NamespaceService;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user/namespaces")
public class UserNamespaceController {

    @Autowired
    private NamespaceService namespaceService;

    @GetMapping
    public List<Namespace> list() {
        return namespaceService.list();
    }
}
