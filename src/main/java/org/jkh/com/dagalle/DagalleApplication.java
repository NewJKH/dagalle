package org.jkh.com.dagalle;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DagalleApplication {

    public static void main(String[] args) {
        SpringApplication.run(DagalleApplication.class, args);
    }

}
