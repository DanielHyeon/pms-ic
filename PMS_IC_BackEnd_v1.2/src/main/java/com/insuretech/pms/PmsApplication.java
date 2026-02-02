package com.insuretech.pms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceTransactionManagerAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    HibernateJpaAutoConfiguration.class,
    DataSourceTransactionManagerAutoConfiguration.class
})
@ComponentScan(
    basePackages = "com.insuretech.pms",
    excludeFilters = {
        @ComponentScan.Filter(
            type = FilterType.REGEX,
            pattern = {
                // Exclude blocking controllers (non-Reactive)
                "com\\.insuretech\\.pms\\.project\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.task\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.chat\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.report\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.rfp\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.education\\.controller\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.lineage\\.controller\\.(?!Reactive).*",
                // Exclude blocking services (non-Reactive) except Outbox services
                "com\\.insuretech\\.pms\\.project\\.service\\.(?!Reactive|Deliverable).*",
                "com\\.insuretech\\.pms\\.task\\.service\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.report\\.service\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.rfp\\.service\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.education\\.service\\.(?!Reactive).*",
                "com\\.insuretech\\.pms\\.lineage\\.service\\.(?!Reactive).*",
                // Exclude blocking lineage config
                "com\\.insuretech\\.pms\\.lineage\\.config\\.LineageStreamInitializer"
            }
        )
    }
)
@EnableCaching
@EnableAsync
@EnableScheduling
public class PmsApplication {

    public static void main(String[] args) {
        SpringApplication.run(PmsApplication.class, args);
    }

}
