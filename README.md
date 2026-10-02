# 🍕 Flame & Crust — Food Ordering & Management Platform

<p align="center">
  <a href="https://flame-crust-4dw.pages.dev">
    <img src="https://img.shields.io/badge/🌐_Live_Demo-flame--crust--4dw.pages.dev-FF5722?style=for-the-badge" alt="Live Demo" />
  </a>
  <img src="https://img.shields.io/badge/Cloudflare_Pages-Frontend-F38020?style=for-the-badge&logo=cloudflare" alt="Cloudflare Pages" />
  <img src="https://img.shields.io/badge/Alibaba_Cloud-ECS_Backend-FF6A00?style=for-the-badge&logo=alibabacloud" alt="Alibaba Cloud" />
  <img src="https://img.shields.io/badge/Spring%20Boot-3.5.4-brightgreen?style=for-the-badge&logo=springboot" alt="Spring Boot" />
  <img src="https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=openjdk" alt="Java 21" />
  <img src="https://img.shields.io/badge/React-19-blue?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-7-purple?style=for-the-badge&logo=vite" alt="Vite" />
  <img src="https://img.shields.io/badge/Aiven%20MySQL-8.4-00758f?style=for-the-badge&logo=mysql" alt="Aiven MySQL" />
  <img src="https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions" alt="GitHub Actions" />
</p>

---

## 🔗 Live Demo & Links
- **Live Demo (Frontend):** [https://flame-crust-4dw.pages.dev](https://flame-crust-4dw.pages.dev)
- **GitHub Repository:** [https://github.com/Chantha-Khemara-dev/flame-crust](https://github.com/Chantha-Khemara-dev/flame-crust)

---

## 📖 Overview

**Flame & Crust** គឺជាប្រព័ន្ធបញ្ជាទិញម្ហូប និងភីហ្សាទំនើប (Full-Stack Food & Pizza Ordering Platform) ដែលត្រូវបានអភិវឌ្ឍឡើងដោយប្រើបច្ចេកវិទ្យា **React 19 + Vite** នៅផ្នែក Frontend និង **Java Spring Boot 3.5.4 (Java 21)** នៅផ្នែក Backend រួមជាមួយនឹង Cloud Database លើ **Aiven MySQL**។ ប្រព័ន្ធនេះក៏រួមបញ្ចូលនូវការទូទាត់ប្រាក់ក្នុងស្រុកតាមរយៈ **Bakong KHQR** និងដំណើរការស្វ័យប្រវត្តិនៃការ Deploy តាម **GitHub Actions CI/CD** ទៅកាន់ **Alibaba Cloud ECS** និង **Cloudflare Pages**។

---

## ✨ Key Features (លក្ខណៈពិសេសចម្បងៗ)

- 🍕 **Product & Menu Management:** ម៉ឺនុយភីហ្សា និងម្ហូបច្រើនជម្រើស ជាមួយការកំណត់ទំហំ តម្លៃ ប្រភេទ និងការគ្រប់គ្រងតាមរយៈ Admin Dashboard។
- 🛒 **Interactive Cart & Ordering:** រទេះទំនិញងាយស្រួលប្រើ រៀបចំការកុម្ម៉ង់បានរហ័ស និងគណនាតម្លៃច្បាស់លាស់។
- 🇰🇭 **Bakong KHQR Payment Gateway:** បង្កើត និងផ្ទៀងផ្ទាត់ QR Code ស្ដង់ដារ KHQR សម្រាប់ទូទាត់តាមកម្មវិធីធនាគារក្នុងស្រុក (Bakong, ABA, etc.) ដោយស្វ័យប្រវត្តិ។
- 🔐 **Authentication & Security:** ប្រើប្រាស់ **JWT (JSON Web Token)**, Spring Security និង Rate Limiting ការពារ API។
- 📧 **Order & Email Notifications:** ផ្ញើសារបញ្ជាក់ការទិញ និងវិក្កយបត្រតាម Email។
- 📍 **Interactive Maps & Location:** ជ្រើសរើសទីតាំងដឹកជញ្ជូនតាមរយៈ Leaflet Map។
- 🎨 **Modern & Responsive UI:** រចនាបទបែបទំនើប ស្រស់ស្អាត ដំណើរការរលូនលើ Mobile និង Desktop ដោយប្រើ Tailwind CSS, Radix UI និង Framer Motion។
- ☁️ **Full Cloud & DevOps Architecture:** 
  - **Frontend:** Hosted លើ **Cloudflare Pages** (Global Edge CDN, High Speed)
  - **Backend:** Hosted លើ **Alibaba Cloud ECS** ជាមួយ Docker & Reverse Proxy
  - **Database:** Cloud-Managed MySQL លើ **Aiven Cloud** (SSL Encryption)
  - **CI/CD:** Automated Deployment ជាមួយ **GitHub Actions** ពេល Push ទៅ branch `main`។

---

## 🛠️ Tech Stack

### Frontend
- **Framework & Build Tool:** React 19, Vite
- **UI & Styling:** Tailwind CSS, Radix UI Components, Lucide Icons
- **State Management:** Zustand, TanStack Query
- **Payment & QR:** `bakong-khqr`, `qrcode.react`
- **Maps & Animation:** Leaflet / React-Leaflet, Framer Motion, Canvas Confetti

### Backend
- **Framework:** Spring Boot 3.5.4 (Java 21)
- **Security:** Spring Security, JWT (io.jsonwebtoken)
- **Database / ORM:** Spring Data JPA, Hibernate, Flyway DB Migration
- **Database Engine:** MySQL 8.4 (Cloud Managed on Aiven)
- **Tools:** Lombok, Bucket4j (Rate Limiting), Spring Mail

### DevOps & Cloud Infrastructure
- **Frontend Hosting:** Cloudflare Pages
- **Backend Host:** Alibaba Cloud ECS (Ubuntu Linux)
- **Cloud Database:** Aiven Cloud MySQL (SSL enabled)
- **Containerization:** Docker & Docker Compose
- **CI/CD Pipelines:**
  - `ci.yml`: Frontend build verification & testing
  - `deploy-alibaba.yml`: Automated build, env config, and remote deployment to Alibaba Cloud ECS via SSH action

---

## 📂 Project Structure

```text
flame-crust/
├── .github/workflows/
│   ├── ci.yml                  # Frontend test & build workflow
│   └── deploy-alibaba.yml      # Automated CD to Alibaba Cloud ECS
├── backend/                    # Spring Boot 3 (Java 21) API
│   ├── src/main/java/          # Controllers, Services, Entities, Repositories
│   ├── src/main/resources/     # application.yml, database migrations
│   ├── pom.xml                 # Maven dependencies
│   └── Dockerfile              # Backend container configuration
├── frontend/                   # React 19 + Vite SPA
│   ├── src/                    # Pages (Menu, Admin, Cart), Components, Context
│   ├── package.json            # Node.js dependencies & scripts
│   └── vite.config.js          # Vite config
├── Dockerfile                  # Multi-stage root Dockerfile
└── README.md                   # Project documentation
```

---

## 🚀 Getting Started (Local Development)

### ១. Prerequisites
- **Java:** JDK 21+
- **Maven:** 3.9+
- **Node.js:** 20+
- **MySQL Database:** Local MySQL 8.0+ ឬ Aiven Cloud MySQL instance

---

### ២. Clone Repository
```bash
git clone https://github.com/Chantha-Khemara-dev/flame-crust.git
cd flame-crust
```

---

### ៣. Backend Setup

1. ចូលទៅកាន់ folder `backend`:
   ```bash
   cd backend
   ```
2. បង្កើតឯកសារ `.env` (ឬកំណត់តាម Environment Variables):
   ```env
   SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/flame_crust?createDatabaseIfNotExist=true&serverTimezone=UTC
   SPRING_DATASOURCE_USERNAME=root
   SPRING_DATASOURCE_PASSWORD=your_mysql_password
   JWT_SECRET=your_super_secret_jwt_key_at_least_256_bits_long
   JWT_EXPIRATION=86400000
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_email_app_password
   BAKONG_API_TOKEN=your_bakong_token
   PORT=8080
   ```
3. ដំណើរការ Backend Server:
   ```bash
   ./mvnw spring-boot:run
   ```
   API នឹងដំណើរការលើ `http://localhost:8080`

---

### ៤. Frontend Setup

1. ចូលទៅកាន់ folder `frontend`:
   ```bash
   cd ../frontend
   ```
2. ដំឡើង Dependencies:
   ```bash
   npm install
   ```
3. បង្កើតឯកសារ `.env`:
   ```env
   VITE_API_URL=http://localhost:8080
   ```
4. ដំណើរការ Frontend Dev Server:
   ```bash
   npm run dev
   ```
   Frontend នឹងដំណើរការលើ `http://localhost:3000`

---

## ☁️ Production & Deployment Architecture

| Layer | Technology / Platform | Description |
| :--- | :--- | :--- |
| **Frontend** | [Cloudflare Pages](https://pages.cloudflare.com/) | Deployed globally on Cloudflare Edge CDN (`flame-crust-4dw.pages.dev`) |
| **Backend API** | [Alibaba Cloud ECS](https://www.alibabacloud.com/product/ecs) | Ubuntu Server ដំណើរការ Spring Boot Backend តាមរយៈ Docker/Service |
| **Database** | [Aiven Cloud MySQL](https://aiven.io/) | Managed MySQL Database ជាមួយ SSL Encryption 24/7 |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) | Auto-deploy ទៅកាន់ Alibaba Cloud ECS រាល់ពេល push កូដទៅ branch `main` |

---

## ⚙️ Automated CI/CD Pipelines

គម្រោងនេះត្រូវបានបំពាក់ដោយ GitHub Actions ចំនួន ២៖
1. **Frontend CI (`ci.yml`):** ដំណើរការត្រួតពិនិត្យ Build Test របស់ React App លើគ្រប់ Pull Request និង Push។
2. **Deploy to Alibaba Cloud (`deploy-alibaba.yml`):** 
   - ភ្ជាប់ទៅកាន់ Server Alibaba Cloud តាមរយៈ SSH
   - Fetch កូដចុងក្រោយបង្អស់ពី branch `main`
   - រៀបចំ Environment សម្រាប់ Aiven Cloud MySQL
   - Restart និង Compile Backend Service ដោយស្វ័យប្រវត្តិ។

---

## 📄 License

This project is open-source under the [MIT License](LICENSE).
