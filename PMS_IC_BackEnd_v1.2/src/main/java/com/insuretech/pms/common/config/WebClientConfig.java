package com.insuretech.pms.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
public class WebClientConfig {

    // WebClient.Builder is defined in ChatWebFluxConfig with enhanced codecs configuration

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
