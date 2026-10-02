import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
public class TestJackson {
    public static void main(String[] args) throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        com.flamecrust.api.model.Order order = new com.flamecrust.api.model.Order();
        order.setOrderNumber("ORD-123");
        order.setDeliveryFee(new java.math.BigDecimal("5.00"));
        System.out.println(mapper.writeValueAsString(order));
    }
}
