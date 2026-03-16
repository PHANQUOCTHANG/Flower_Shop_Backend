# PostGreSql + Prisma : 

Sửa schema (production)	npx prisma migrate dev --name ten_migration
Sửa schema (dev nhanh)	npx prisma db push
Chỉ muốn generate lại type	npx prisma generate
Reset DB	npx prisma migrate reset
Mở GUI	npx prisma studio

# Flower Shop Backend API

## 📋 Giới thiệu
Backend API cho hệ thống bán hoa online, xây dựng với **Express.js**, **TypeScript**, **Prisma** và **PostgreSQL**. Cung cấp đầy đủ chức năng quản lý sản phẩm, đơn hàng, giỏ hàng, xác thực và tương tác người dùng.

## ✨ Các tính năng chính

### 🔐 Xác thực & Người dùng
- Đăng ký/đăng nhập (Email + Password)
- Xác thực OTP qua email
- Hỗ trợ đăng nhập social (Google, Facebook)
- Refresh Token tự động
- Quản lý hồ sơ người dùng
- Role-based access (CUSTOMER, ADMIN, STAFF)

### 🌸 Quản lý sản phẩm
- CRUD sản phẩm đầy đủ
- Phân loại sản phẩm (Categories)
- Hỗ trợ URL slug thân thiện
- Upload ảnh via Cloudinary
- Bộ lọc và tìm kiếm nâng cao

### 🛒 Giỏ hàng & Đơn hàng
- Quản lý giỏ hàng (thêm, xóa, cập nhật số lượng)
- Tạo & theo dõi đơn hàng
- Lịch sử đơn hàng người dùng
- Xác thực quyền truy cập

### ⭐ Đánh giá & Bình luận
- Để lại đánh giá sản phẩm
- Xem lịch sử đánh giá của người dùng

### 💬 Chat real-time (Socket.io)
- Hỗ trợ chat giữa khách hàng và admin
- Real-time messaging

### 📊 Công nghệ sử dụng
- **Runtime**: Node.js avec TypeScript
- **Framework**: Express.js v5.1
- **Database**: PostgreSQL avec Prisma ORM
- **Cache**: Redis (ioredis)
- **File Storage**: Cloudinary
- **Email**: Nodemailer
- **Auth**: JWT + Bcrypt
- **Validation**: Zod
- **API Docs**: Swagger/OpenAPI
- **Logging**: Winston

---

## 🚀 Cách chạy

### 1️⃣ Chuẩn bị môi trường
```bash
# Cài đặt dependencies
npm install

# Tạo file .env (copy from .env.example hoặc tạo mới)
# Cần cấu hình:
# - DATABASE_URL (PostgreSQL)
# - JWT secret keys
# - Cloudinary credentials
# - Email service
# - Redis connection (optional)
```

### 2️⃣ Khởi tạo Database
```bash
# Chạy migration
npx prisma migrate dev --name init

# (Hoặc dùng db push để dev nhanh)
npx prisma db push

# Xem GUI quản lý DB
npx prisma studio
```

### 3️⃣ Chạy server

**Development** (auto-reload):
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm run serve
```

Server sẽ chạy tại: `http://localhost:8000` (mặc định)

---

## 📁 Cấu trúc thư mục

```
src/
├── api/v1/routes/          → Định tuyến chính
├── config/                 → Cấu hình & Swagger
├── module/                 → Modules chính
│   ├── auth/              → Xác thực & OTP
│   ├── user/              → Quản lý người dùng
│   ├── product/           → Sản phẩm
│   ├── category/          → Danh mục
│   ├── cart/              → Giỏ hàng
│   ├── order/             → Đơn hàng
│   └── review/            → Đánh giá
├── middleware/            → Auth, Error, Validation
├── lib/                   → Cloudinary, Prisma, Redis
├── utils/                 → Helper functions
└── socket/                → WebSocket handlers
```

---

## �️ Database Schema

### Main Tables

| Model | Mô tả | Trường quan trọng |
|-------|------|------------------|
| **User** | Người dùng hệ thống | id, email, role, avatar, emailVerified, provider (LOCAL/GOOGLE/FACEBOOK) |
| **RefreshToken** | Token làm mới | userId, token, expiresAt, revoked |
| **Otp** | Xác thực qua email | email, otpHash, expiresAt, verified |
| **Category** | Danh mục sản phẩm | id, name, slug, parentId (hỗ trợ đệ quy), thumbnailUrl |
| **Product** | Sản phẩm | id, name, slug, price, comparePrice, sku, stockQuantity, thumbnailUrl |
| **ProductCategory** | Liên kết N-N | productId, categoryId (một sản phẩm có nhiều danh mục) |
| **ProductImage** | Hình ảnh sản phẩm | id, productId, imageUrl, isPrimary, sortOrder |
| **Cart** | Giỏ hàng | id, userId (1:1, một người dùng 1 giỏ) |
| **CartItem** | Chi tiết giỏ hàng | id, cartId, productId, quantity |
| **Order** | Đơn hàng | id, userId, totalPrice, status, paymentStatus, shippingAddress |
| **OrderItem** | Chi tiết đơn hàng | id, orderId, productId, quantity, price (giá chốt lúc mua) |
| **Chat** | Phòng chat | id, userId, adminId, status (open/closed) |
| **Message** | Tin nhắn | id, chatId, senderId, senderRole, content |

### Relationships

```
User (1) ──→ (N) RefreshToken     [onDelete: Cascade]
User (1) ──→ (1) Cart              [onDelete: Cascade]
User (1) ──→ (N) Order             [onDelete: Cascade]
User (1) ──→ (N) Chat              [onDelete: Cascade]
User (1) ──→ (N) Message

Category (1) ──→ (N) ProductCategory  [onDelete: Cascade]
Product (1) ──→ (N) ProductCategory   [onDelete: Cascade]
Product (1) ──→ (N) ProductImage      [onDelete: Cascade]
Product (1) ──→ (N) CartItem          [onDelete: Cascade]
Product (1) ──→ (N) OrderItem         [onDelete: Cascade]

Cart (1) ──→ (N) CartItem         [onDelete: Cascade]
Order (1) ──→ (N) OrderItem       [onDelete: Cascade]
Chat (1) ──→ (N) Message          [onDelete: Cascade]
```

### Enums

```typescript
UserRole: CUSTOMER | ADMIN | STAFF
AuthProvider: LOCAL | GOOGLE | FACEBOOK
```

---

## 📝 Database Commands - Hướng dẫn chi tiết

### 1️⃣ **Tạo Migration** (Production-ready)
```bash
npx prisma migrate dev --name ten_migration
```
**Khi nào dùng?** Sau khi chỉnh sửa `schema.prisma`
- ✅ Tạo file `.sql` lưu thay đổi
- ✅ Áp dụng vào database
- ✅ Tự động generate Prisma Client
- ⚠️ Không nên dùng trên production trực tiếp, check SQL trước

**Ví dụ:**
```bash
npx prisma migrate dev --name add_product_reviews
npx prisma migrate dev --name create_chat_tables
```

---

### 2️⃣ **Push Schema trực tiếp** (Dev nhanh)
```bash
npx prisma db push
```
**Khi nào dùng?** Khi phát triển nhanh, không cần lưu migration
- ✅ Syncs schema với database ngay lập tức
- ✅ Không tạo file migration
- ❌ **Không dùng trên production** (mất thay đổi lịch sử)
- ⚠️ Có thể mất dữ liệu nếu schema thay đổi bất thường

**Cú pháp đầy đủ:**
```bash
npx prisma db push --skip-generate  # Không generate Client
npx prisma db push --force-reset    # Reset DB (mất dữ liệu!)
```

---

### 3️⃣ **Generate lại Prisma Client**
```bash
npx prisma generate
```
**Khi nào dùng?**
- 📝 Sau khi update `schema.prisma` thủ công
- 🐛 Fix lỗi TypeScript liên quan đến types
- 🔄 Sử dụng sau khi pull code từ Git

**Dùng khi:**
```bash
# Cập nhật types TypeScript
npx prisma generate

# Hoặc kết hợp sau migration
npx prisma migrate dev --name changes
```

---

### 4️⃣ **Reset Database hoàn toàn**
```bash
npx prisma migrate reset
```
**Khi nào dùng?** Phát triển local hoặc test
- ⚠️ **XÓA TẤT CẢ DỮ LIỆU**
- 🔄 Chạy lại tất cả migrations từ đầu
- 🌱 Seed database (nếu có file `seed.ts`)

**Cảnh báo:** Không bao giờ dùng trên production!

```bash
# Reset không xác nhận
npx prisma migrate reset --force

# Reset + chạy seed
npx prisma migrate reset && npm run seed
```

---

### 5️⃣ **Mở GUI quản lý Database**
```bash
npx prisma studio
```
**Khi nào dùng?** Quản lý data trực quan
- 🖥️ Mở ở `http://localhost:5555`
- 📊 Xem, thêm, chỉnh sửa, xóa records
- 🔍 Filter, sort, relations

---

### 6️⃣ **Deploy Migrations lên Production**
```bash
npx prisma migrate deploy
```
**Khi nào dùng?** Trên production server
- ✅ Chỉ apply migrations chưa chạy
- ✅ An toàn, không reset data
- ❌ Không tạo file migration mới

**Workflow production:**
```bash
# 1. Dev tạo migration
npx prisma migrate dev --name feature_x

# 2. Push code lên Git (bao gồm migration file)

# 3. Trên production
git pull
npx prisma migrate deploy
```

---

### 7️⃣ **Các lệnh khác hữu ích**

| Lệnh | Mục đích |
|------|---------|
| `npx prisma format` | Format file `schema.prisma` |
| `npx prisma validate` | Kiểm tra lỗi trong schema |
| `npx prisma version` | Xem phiên bản Prisma |
| `npx prisma db seed` | Chạy seed file (nếu có) |
| `npx prisma migrate status` | Xem trạng thái migrations |
| `npx prisma migrate resolve` | Resolve lỗi migration bị pending |

---

### 📋 Workflow chuẩn khi dev

```bash
# 1️⃣ Sửa schema.prisma
# (Thay đổi model, thêm field, v.v.)

# 2️⃣ Tạo migration
npx prisma migrate dev --name describe_change

# 3️⃣ Generate lại types (tự động)
# (Đã tự động sau migrate dev)

# 4️⃣ Update code tương ứng

# 5️⃣ Test và commit
git add .
git commit -m "feat: add new feature"
git push

# 6️⃣ Production deploy
# npx prisma migrate deploy
```

---

## 📝 Database Commands (Bảng tham chiếu)

| Lệnh | Mô tả | Nguy hiểm | Sử dụng |
|------|------|----------|--------|
| `migrate dev --name` | Tạo migration + áp dụng | ⚠️ None | Dev/Staging |
| `db push` | Sync schema trực tiếp | 🔴 Có | Dev only |
| `generate` | Tạo lại Prisma Client | ✅ Safe | Anytime |
| `migrate reset` | Reset DB (mất data) | 🔴 Cao | Dev/Local |
| `studio` | GUI quản lý DB | ✅ Safe | Dev/Debug |
| `migrate deploy` | Deploy migrations | ✅ Safe | Production |
| `migrate status` | Xem trạng thái | ✅ Safe | Anytime |
| `format` | Format schema.prisma | ✅ Safe | Anytime |

---

## 🔗 API Endpoints chính

- `POST /api/auth/register` → Đăng ký
- `POST /api/auth/login` → Đăng nhập
- `GET /api/products` → Danh sách sản phẩm
- `GET /api/categories` → Danh sách danh mục
- `POST /api/cart` → Thêm giỏ hàng (yêu cầu auth)
- `POST /api/orders` → Tạo đơn hàng
- `GET /api/users/profile` → Hồ sơ người dùng (yêu cầu auth)

📚 **Xem chi tiết tại**: `/api-docs` (Swagger UI)

---

## ⚙️ Lưu ý

- Sử dụng `reflect-metadata` & `tsconfig-paths` cho import aliases (`@/`)
- JWT tokens được lưu trong cookies
- Middleware auth kiểm soát quyền truy cập
- Error handling tập trung qua global handler
- Logging tất cả hoạt động via Winston