package org.vision.autocomplete;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.vision.autocomplete.entity.Product;
import org.vision.autocomplete.repository.ProductRepository;

import java.math.BigDecimal;
import java.util.Arrays;

@SpringBootApplication
public class AutocompleteApplication {

    public static void main(String[] args) {
        SpringApplication.run(AutocompleteApplication.class, args);
    }

    @Bean
    public CommandLineRunner initData(ProductRepository productRepository) {
        return args -> {
            // Initialize with sample data
            productRepository.saveAll(Arrays.asList(
                    new Product("MacBook Pro 16-inch", "Apple M2 Pro chip with 12-core CPU and 19-core GPU", new BigDecimal("2499.99"), "Laptops"),
                    new Product("iPhone 15 Pro", "6.1-inch Super Retina XDR display with ProMotion", new BigDecimal("999.99"), "Smartphones"),
                    new Product("iPad Air", "10.9-inch Liquid Retina display with True Tone", new BigDecimal("599.99"), "Tablets"),
                    new Product("AirPods Pro", "Active Noise Cancellation for immersive sound", new BigDecimal("249.99"), "Audio"),
                    new Product("Apple Watch Series 9", "Always-On Retina display with health monitoring", new BigDecimal("399.99"), "Wearables"),
                    new Product("Samsung Galaxy S23", "6.1-inch Dynamic AMOLED 2X display", new BigDecimal("799.99"), "Smartphones"),
                    new Product("Dell XPS 15", "15.6-inch 4K UHD display with Intel Core i9", new BigDecimal("1899.99"), "Laptops"),
                    new Product("Sony WH-1000XM5", "Industry-leading noise canceling wireless headphones", new BigDecimal("349.99"), "Audio"),
                    new Product("Microsoft Surface Pro 9", "13-inch touchscreen 2-in-1 laptop", new BigDecimal("999.99"), "Tablets"),
                    new Product("Google Pixel 7", "6.3-inch display with Google Tensor G2", new BigDecimal("599.99"), "Smartphones")
            ));
        };
    }


}
