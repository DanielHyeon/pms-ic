package com.insuretech.pms.common.controller;

import com.insuretech.pms.common.config.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class AppConfigController {

    private final AppProperties appProperties;

    @GetMapping
    public Mono<Map<String, Object>> getConfig() {
        return Mono.just(Map.of(
                "useMockData", appProperties.isUseMockData()
        ));
    }
}
