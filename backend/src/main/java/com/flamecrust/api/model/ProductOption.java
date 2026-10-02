package com.flamecrust.api.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@jakarta.persistence.Table(name = "product_options")
public class ProductOption {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "product_id")
    private Long productId;

    @Column(name = "name")
    private String name;

    @Column(name = "is_required")
    private Boolean isRequired;

    @Column(name = "max_selections")
    private Integer maxSelections;

    @jakarta.persistence.OneToMany(cascade = jakarta.persistence.CascadeType.ALL, fetch = jakarta.persistence.FetchType.EAGER)
    @jakarta.persistence.JoinColumn(name = "option_id")
    private java.util.List<ProductVariant> variants = new java.util.ArrayList<>();

}
