package com.project.zeevCode;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class ZeevCodeApplication {

	public static void main(String[] args) {
		SpringApplication.run(ZeevCodeApplication.class, args);
	}

}
