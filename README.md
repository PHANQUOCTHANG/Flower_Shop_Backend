# 🌸 Flower Shop Backend API

Backend API for an **online flower shop e-commerce system**, built with **Node.js, Express.js, TypeScript, Prisma ORM, and PostgreSQL**.

The system provides a complete backend solution including authentication, product management, shopping cart, order processing, asynchronous job queuing, real-time chat with rich media support, and admin operations.

---

# 🛠 Technology Stack

| Technology | Description |
|---|---|
| Node.js | JavaScript runtime environment |
| Express.js | Web framework for building REST APIs |
| TypeScript | Strongly typed JavaScript |
| PostgreSQL | Relational database |
| Prisma ORM | Modern ORM for database access |
| Redis | Caching, session storage, and BullMQ job queue backend |
| BullMQ | Distributed job queue for asynchronous order processing |
| JWT | Authentication and authorization |
| Bcrypt | Password hashing |
| Zod | Request validation |
| Cloudinary | Image and media file storage |
| Nodemailer | Email sending service |
| Socket.io | Real-time bidirectional communication |
| Swagger / OpenAPI | API documentation |
| Winston | Structured logging system |

---

# ✨ Core Features

| Feature | Description |
|---|---|
| Authentication | User registration, login, OTP email verification, social login, and refresh token rotation |
| User Management | Profile management and role-based access control (RBAC) |
| Product Management | Create, update, delete products with categories and images |
| Shopping Cart | Add, remove, and update cart items |
| Order Management | Create orders and track order status |
| Async Order Processing | BullMQ job queues with rate limiting to handle high-concurrency checkout safely |
| Reviews | Product rating and review system |
| Real-time Chat | Customer and admin chat using Socket.io with rich media support |
| Rich Media Messages | Upload and render images, videos, and file attachments in chat (with `mediaName` & `mediaSize` metadata) |
| Redis Caching | Cache frequently accessed data to reduce database load and improve scalability |
| Admin Dashboard | Manage products, orders, users, and support chats |

---

# 🔐 Authentication & Authorization

The system supports multiple authentication mechanisms:

- Email & Password login
- Email OTP verification for registration and recovery
- Social login (Google, Facebook)
- JWT access tokens
- Refresh token rotation
- Role-based access control (RBAC)

### User Roles

```
CUSTOMER
ADMIN
STAFF
```

---

# ⚡ Asynchronous Order Processing

Orders are processed through a **BullMQ** job queue backed by **Redis**, ensuring:

- **High-concurrency safety** — checkout requests are queued and processed serially per user
- **Rate limiting** — prevents abuse during flash sales or peak traffic
- **Real-time status updates** — order processing state is pushed to the client via **Socket.IO**
- **Retry & failure handling** — failed jobs are automatically retried with configurable backoff

---

---

# 💬 Real-time Chat with Rich Media

The chat system is built on **Socket.IO** and supports:

- **Text messages** between customers and admin/staff
- **File attachments** — images, videos, and documents uploaded via Cloudinary
- **Rich file cards** — messages include `mediaName`, `mediaSize`, and `mediaType` metadata for Zalo-style rendering in the UI
- **Multi-room chat** — isolated chat rooms per customer session
- **Real-time delivery** — instant message push via WebSocket

---

# 📁 Project Structure

```
src/

├── api/v1/routes/        → API route definitions
├── config/               → Application configuration, Swagger & Redis
├── module/               → Business modules
│   ├── auth/             → Authentication & OTP
│   ├── user/             → User management & RBAC
│   ├── product/          → Product management
│   ├── category/         → Product categories
│   ├── cart/             → Shopping cart
│   ├── order/            → Order processing
│   ├── review/           → Product reviews
│   └── chat/             → Real-time chat & rich media
│
├── middleware/           → Auth, validation, error handling
├── lib/                  → Prisma, Redis, Cloudinary
├── utils/                → Helper functions
├── jobs/                 → BullMQ job definitions and processors
└── socket/               → Socket.io handlers
```

---

# 🗄 Database Schema

### Main Models

| Model | Description |
|---|---|
| User | System users with role definitions |
| RefreshToken | Token rotation system |
| Otp | Email OTP verification |
| Category | Product categories |
| Product | Product information |
| ProductImage | Product images |
| ProductCategory | Many-to-many relation |
| Cart | User shopping cart |
| CartItem | Cart items |
| Order | Customer orders |
| OrderItem | Order item details with review status |
| Review | Verified product reviews |
| ReviewMedia | Images and videos attached to reviews |
| SystemSetting | Key-value store for app configuration |
| ActivityLog | Log of system and admin activities |
| Chat | Chat rooms |
| Message | Chat messages (text + rich media metadata) |

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
| REDIS_URL | Redis connection string (used by BullMQ and caching) |
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
http://localhost:5000
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
| POST | /api/v1/auth/register | Register new user |
| POST | /api/v1/auth/login | User login |
| GET | /api/v1/products | Get product list |
| GET | /api/v1/categories | Get product categories |
| POST | /api/v1/cart/add | Add item to cart |
| POST | /api/v1/orders | Create order |
| GET | /api/v1/users/me | Get user profile |
| POST | /api/v1/chats/upload | Upload media file to chat |
| GET | /api/v1/chats/:roomId/messages | Get paginated chat messages |

### 📖 API Documentation (Swagger)

Full interactive API documentation is automatically generated using Swagger UI.
After starting the server, you can view the docs and test the endpoints directly at:

👉 **[http://localhost:5000/api/docs](http://localhost:5000/api/docs)**

- **Explore Endpoints:** All modules (Auth, Users, Products, Orders, etc.) are fully documented here.
- **Testing:** You can test APIs directly from your browser.
- **Authentication:** For secured routes, use the **Authorize** button at the top right to inject your `Bearer Token` (obtained from the login endpoint).

---

# 📄 License

This project is licensed under the **MIT License**.
