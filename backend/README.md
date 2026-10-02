# Flame & Crust API

Backend សម្រាប់ Flame & Crust ប្រើ Java 21, Spring Boot និង MySQL.

Database schema និង seed data សរសេរជា MySQL SQL នៅ `src/main/resources/db/`។ Spring Boot នឹង run វាដោយស្វ័យប្រវត្តិពេល start។ Tables មាន `products`, `customers`, `addresses`, `orders`, `order_items` និង `payments`។

## Run

System MySQL (port 3306):

```bash
sudo systemctl start mysql
set -a; source .env; set +a
mvn spring-boot:run
```

Docker MySQL alternative uses host port 3307. If using it, run with:

```bash
docker compose up -d mysql
set -a; source .env; set +a
MYSQL_URL='jdbc:mysql://localhost:3307/flame_crust?createDatabaseIfNotExist=true&serverTimezone=UTC' mvn spring-boot:run
```

API:

- `GET http://localhost:8080/api/health`
- `GET http://localhost:8080/api/products`
- `GET http://localhost:8080/api/products/pizza`

អាចប្តូរ database តាម environment variables: `MYSQL_URL`, `MYSQL_USER`, `MYSQL_PASSWORD`, `FRONTEND_URL`។
