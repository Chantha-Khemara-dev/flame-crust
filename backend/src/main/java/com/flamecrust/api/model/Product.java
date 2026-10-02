package com.flamecrust.api.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@jakarta.persistence.Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(unique = true, length = 40)
    private String sku;
    private String name;
    private String description;
    private BigDecimal price;
    private BigDecimal basePrice;
    private Long categoryId;
    private String category;
    private String image;
    private String tags;
    private BigDecimal rating;
    private boolean popular;
    private boolean spicy;
    private boolean vegetarian;
    private boolean active = true;
    
    @Column(name = "view_count")
    private int viewCount = 0;

    @Column(name = "sales_count")
    private int salesCount = 0;

    @jakarta.persistence.OneToMany(cascade = jakarta.persistence.CascadeType.ALL, fetch = jakarta.persistence.FetchType.EAGER)
    @jakarta.persistence.JoinColumn(name = "product_id")
    private java.util.List<ProductOption> options = new java.util.ArrayList<>();

    protected Product() {}

    public Product(String name, String description, BigDecimal price, BigDecimal basePrice, Long categoryId, String category,
                   String image, String tags, BigDecimal rating, boolean popular,
                   boolean spicy, boolean vegetarian) {
        this.name = name;
        this.description = description;
        this.price = price;
        this.basePrice = basePrice;
        this.categoryId = categoryId;
        this.category = category;
        this.image = image;
        this.tags = tags;
        this.rating = rating;
        this.popular = popular;
        this.spicy = spicy;
        this.vegetarian = vegetarian;
    }

    public Long getId() { return id; }
    public String getSku() { return sku; }
    public String getName() { return name; }
    public String getDescription() { return description; }
    public BigDecimal getPrice() { return price; }
    public BigDecimal getBasePrice() { return basePrice; }
    public Long getCategoryId() { return categoryId; }
    public String getCategory() { return category; }
    public String getImage() { return image; }
    public String getTags() { return tags; }
    public BigDecimal getRating() { return rating; }
    public boolean isPopular() { return popular; }
    public boolean isSpicy() { return spicy; }
    public boolean isVegetarian() { return vegetarian; }
    public boolean isActive() { return active; }
    public int getViewCount() { return viewCount; }
    public int getSalesCount() { return salesCount; }
    public void setSalesCount(int salesCount) { this.salesCount = salesCount; }

    public java.util.List<ProductOption> getOptions() { return options; }
    
    // Setters
    public void setId(Long id) { this.id = id; }
    public void setSku(String sku) { this.sku = sku; }
    public void setName(String name) { this.name = name; }
    public void setDescription(String description) { this.description = description; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public void setBasePrice(BigDecimal basePrice) { this.basePrice = basePrice; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public void setCategory(String category) { this.category = category; }
    public void setImage(String image) { this.image = image; }
    public void setTags(String tags) { this.tags = tags; }
    public void setRating(BigDecimal rating) { this.rating = rating; }
    public void setPopular(boolean popular) { this.popular = popular; }
    public void setSpicy(boolean spicy) { this.spicy = spicy; }
    public void setVegetarian(boolean vegetarian) { this.vegetarian = vegetarian; }
    public void setActive(boolean active) { this.active = active; }
    public void setViewCount(int viewCount) { this.viewCount = viewCount; }
    public void setOptions(java.util.List<ProductOption> options) { this.options = options; }
}
