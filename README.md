# 🌸 Flower Shop Backend API

Backend API for an **online flower shop e-commerce system**, built with **Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL**.

The system provides a complete backend solution including authentication, product management, shopping cart, order processing, real-time chat, and admin operations.

---

# 🛠 Technology Stack

| Technology | Description |
|---|---|
| Node.js | JavaScript runtime environment |
| Express.js | Web framework for building REST APIs |
| TypeScript | Strongly typed JavaScript |
| PostgreSQL | Relational database |
| Prisma ORM | Modern ORM for database access |
| Redis | Caching and session storage |
| JWT | Authentication and authorization |
| Bcrypt | Password hashing |
| Zod | Request validation |
| Cloudinary | Image storage service |
| Nodemailer | Email sending service |
| Socket.io | Real-time communication |
| Swagger / OpenAPI | API documentation |
| Winston | Logging system |

---

# ✨ Core Features

| Feature | Description |
|---|---|
| Authentication | User registration, login, OTP email verification, and refresh tokens |
| User Management | Profile management and role-based access control |
| Product Management | Create, update, delete products with categories and images |
| Shopping Cart | Add, remove, and update cart items |
| Order Management | Create orders and track order status |
| Reviews | Product rating and review system |
| Real-time Chat | Customer and admin chat using Socket.io |
| Admin Dashboard | Manage products, orders, and users |

---

# 🔐 Authentication & Authorization

The system supports multiple authentication mechanisms:

- Email & Password login
- Email OTP verification
- Social login (Google, Facebook)
- JWT access tokens
- Refresh token rotation
- Role-based access control

### User Roles

```
CUSTOMER
ADMIN
STAFF
```

---

# 📁 Project Structure

```
src/

├── api/v1/routes/        → API route definitions
├── config/               → Application configuration & Swagger
├── module/               → Business modules
│   ├── auth/             → Authentication & OTP
│   ├── user/             → User management
│   ├── product/          → Product management
│   ├── category/         → Product categories
│   ├── cart/             → Shopping cart
│   ├── order/            → Order processing
│   └── review/           → Product reviews
│
├── middleware/           → Auth, validation, error handling
├── lib/                  → Prisma, Redis, Cloudinary
├── utils/                → Helper functions
└── socket/               → Socket.io handlers
```

---

# 🗄 Database Schema

### Main Models

| Model | Description |
|---|---|
| User | System users |
| RefreshToken | Token rotation system |
| Otp | Email OTP verification |
| Category | Product categories |
| Product | Product information |
| ProductImage | Product images |
| ProductCategory | Many-to-many relation |
| Cart | User shopping cart |
| CartItem | Cart items |
| Order | Customer orders |
| OrderItem | Order item details |
| Chat | Chat rooms |
| Message | Chat messages |

---

# 🔗 Database Relationships

```
User (1) → (N) RefreshToken
User (1) → (1) Cart
User (1) → (N) Order
User (1) → (N) Chat

Product (1) → (N) ProductImage
Product (1) → (N) CartItem
Product (1) → (N) OrderItem

Category (1) → (N) ProductCategory
Product (1) → (N) ProductCategory

Cart (1) → (N) CartItem
Order (1) → (N) OrderItem
Chat (1) → (N) Message
```

---

# ⚙️ Environment Variables

Create a `.env` file in the root directory.

| Variable | Description |
|---|---|
| DATABASE_URL | PostgreSQL connection string |
| JWT_ACCESS_SECRET | JWT access token secret |
| JWT_REFRESH_SECRET | JWT refresh token secret |
| CLOUDINARY_API_KEY | Cloudinary API key |
| CLOUDINARY_SECRET | Cloudinary secret |
| REDIS_URL | Redis connection string |
| EMAIL_USER | Email service user |
| EMAIL_PASS | Email service password |

---

# 🚀 Getting Started

## 1️⃣ Install dependencies

```bash
npm install
```

---

## 2️⃣ Setup Database

Run Prisma migration

```bash
npx prisma migrate dev --name init
```

or quick development sync

```bash
npx prisma db push
```

Open Prisma Studio

```bash
npx prisma studio
```

---

## 3️⃣ Run the Server

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm run serve
```

Server will run at:

```
http://localhost:8000
```

---

# 🧠 Prisma Database Commands

| Command | Description |
|---|---|
| `npx prisma migrate dev --name` | Create and apply a migration |
| `npx prisma db push` | Sync schema directly to database |
| `npx prisma generate` | Generate Prisma Client |
| `npx prisma migrate reset` | Reset database (delete all data) |
| `npx prisma studio` | Open database GUI |
| `npx prisma migrate deploy` | Run migrations in production |

---

# 📋 Development Workflow

```
1. Modify schema.prisma
2. Run migration
3. Update business logic
4. Test locally
5. Commit and push
6. Deploy migrations to production
```

Example

```bash
npx prisma migrate dev --name add_product_reviews
git add .
git commit -m "feat: add review feature"
git push
```

---

# 🔗 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | User login |
| GET | /api/products | Get product list |
| GET | /api/categories | Get product categories |
| POST | /api/cart | Add item to cart |
| POST | /api/orders | Create order |
| GET | /api/users/profile | Get user profile |

Full API documentation is available at:

```
/api-docs
```

(Swagger UI)

---

# 📄 License

This project is licensed under the **MIT License**.
