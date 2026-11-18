# Hướng dẫn chạy local và deploy qua SSH

## 1. Tổng quan

Code hiện tại chạy theo mô hình Docker Compose:

- Frontend: Next.js 16, React 19, Node.js 24.
- Backend: Spring Boot 4.1.1, Java 21, Maven.
- Database: PostgreSQL 17.
- Reverse proxy và HTTPS: Caddy 2.

Các lệnh dưới đây chạy từ thư mục gốc repository, nơi chứa `backend`, `frontend` và `deploy`.

## 2. Chạy local bằng Docker (khuyến nghị)

Cài Docker Desktop (Windows/macOS) hoặc Docker Engine và Docker Compose plugin (Linux), rồi kiểm tra:

```powershell
docker --version
docker compose version
```

Tạo cấu hình:

```powershell
Copy-Item .env.example .env
```

Sửa `.env`:

```dotenv
DB_PASSWORD=mật-khẩu-dài-và-ngẫu-nhiên
ADMIN_USERNAME=owner
ADMIN_PASSWORD=mật-khẩu-admin-tối-thiểu-12-ký-tự
TOKEN_KEY=
APP_PUBLIC_ORIGIN=http://localhost:8088
SITE_ADDRESS=:80
HTTP_PORT=8088
HTTPS_PORT=8443
COOKIE_SECURE=false
```

Tạo `TOKEN_KEY` (32 byte, Base64):

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Khởi động:

```powershell
docker compose --env-file .env -f deploy/compose.yml up -d --build
docker compose --env-file .env -f deploy/compose.yml ps
```

Truy cập website tại `http://localhost:8088`, quản trị tại `http://localhost:8088/admin/login`, health API tại `http://localhost:8088/api/v1/health`. Tài khoản admin ban đầu lấy từ `ADMIN_USERNAME` và `ADMIN_PASSWORD` chỉ khi bảng admin còn trống.

Xem log hoặc dừng (giữ dữ liệu):

```powershell
docker compose --env-file .env -f deploy/compose.yml logs -f backend
docker compose --env-file .env -f deploy/compose.yml down
```

Không dùng `down -v` nếu không muốn xóa database, media và dữ liệu thử nghiệm.

## 3. Chạy riêng để phát triển

Khởi động database:

```powershell
docker compose --env-file .env -f deploy/compose.yml up -d db
```

Backend cần Java 21, Maven và các biến môi trường:

```powershell
$env:DB_URL='jdbc:postgresql://localhost:5432/wedding'
$env:DB_USER='wedding'
$env:DB_PASSWORD='giống-giá-trị-trong-.env'
$env:TOKEN_KEY='base64-32-bytes'
$env:APP_PUBLIC_ORIGIN='http://localhost:3000'
$env:COOKIE_SECURE='false'
mvn -f backend/pom.xml spring-boot:run
```

Backend chạy tại `http://localhost:8080`. Frontend chạy ở terminal khác:

```powershell
Set-Location frontend
npm ci
$env:BACKEND_URL='http://localhost:8080'
npm run dev
```

Frontend chạy tại `http://localhost:3000`; rewrite trong `frontend/next.config.ts` chuyển `/api/*` tới backend.

## 4. Kiểm tra trước release

```powershell
mvn -f backend/pom.xml clean verify
Set-Location frontend
npm ci
npm run typecheck
npm test
npm run build
Set-Location ..
docker compose --env-file .env -f deploy/compose.yml config
```

Smoke test tạo dữ liệu giả, nên chỉ chạy sau khi đã đọc script:

```powershell
./deploy/smoke.ps1 -Origin http://localhost:8088
```

## 5. Chuẩn bị server Linux

Ví dụ dùng Ubuntu/Debian, user deploy `wedding`, IP `SERVER_IP` và domain `your-domain.com`.

```bash
ssh root@SERVER_IP
adduser wedding
usermod -aG sudo wedding
```

Cài Docker theo hướng dẫn chính thức, sau đó:

```bash
sudo usermod -aG docker wedding
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Đăng xuất/đăng nhập lại để group Docker có hiệu lực. Đưa source lên server:

```bash
ssh wedding@SERVER_IP
mkdir -p ~/apps
git clone https://github.com/OWNER/REPOSITORY.git ~/apps/wedding
cd ~/apps/wedding
```

Với repository private, dùng SSH deploy key hoặc `scp`/`rsync`. Không đưa `.env` vào repository.

## 6. Cấu hình production

```bash
cd ~/apps/wedding
cp .env.example .env
nano .env
chmod 600 .env
```


> Có thể khai báo `DOMAIN=your-domain.com` để ghi nhớ domain. Compose hiện nhận trực tiếp URL tại `APP_PUBLIC_ORIGIN` và hostname tại `SITE_ADDRESS` (Caddy), nên điền cùng domain như ví dụ dưới đây; không đặt scheme trong `SITE_ADDRESS` và dùng `https://` trong `APP_PUBLIC_ORIGIN`.


Giá trị cần dùng trên production:

```dotenv
DB_PASSWORD=mật-khẩu-database-ngẫu-nhiên-dài
ADMIN_USERNAME=owner
ADMIN_PASSWORD=mật-khẩu-admin-mạnh
TOKEN_KEY=base64-của-32-byte-ngẫu-nhiên
APP_PUBLIC_ORIGIN=https://your-domain.com
SITE_ADDRESS=your-domain.com
HTTP_PORT=80
HTTPS_PORT=443
COOKIE_SECURE=true
```

Tạo DNS A/AAAA cho domain trỏ tới server. Caddy tự xin/gia hạn HTTPS khi cổng 80 và 443 truy cập được từ Internet.

## 7. Deploy và cập nhật qua SSH

Deploy lần đầu:

```bash
ssh wedding@SERVER_IP
cd ~/apps/wedding
docker compose --env-file .env -f deploy/compose.yml config
docker compose --env-file .env -f deploy/compose.yml up -d --build
docker compose --env-file .env -f deploy/compose.yml ps
curl -fsS https://your-domain.com/api/v1/health
```

Cập nhật:

```bash
ssh wedding@SERVER_IP
cd ~/apps/wedding
git pull --ff-only
docker compose --env-file .env -f deploy/compose.yml up -d --build
docker compose --env-file .env -f deploy/compose.yml ps
```

Các volume `pgdata`, `media-data`, `caddydata`, `caddyconfig` được giữ qua deploy. Rollback:

```bash
git log --oneline -5
git checkout <commit-an-toan>
docker compose --env-file .env -f deploy/compose.yml up -d --build
```

## 8. Backup, restore và xử lý lỗi

Backup PostgreSQL:

```bash
mkdir -p backups
docker compose --env-file .env -f deploy/compose.yml exec -T db pg_dump -U wedding -d wedding -Fc > "backups/wedding-$(date +%Y%m%d-%H%M%S).dump"
```

Backup database không bao gồm volume `media-data`; phải backup media riêng và lưu bản sao ngoài server. Restore có thể ghi đè dữ liệu:

```bash
docker compose --env-file .env -f deploy/compose.yml stop backend
cat backups/wedding-YYYYMMDD-HHMMSS.dump | docker compose --env-file .env -f deploy/compose.yml exec -T db pg_restore -U wedding -d wedding --clean --if-exists
docker compose --env-file .env -f deploy/compose.yml start backend
```

Xem trạng thái/log:

```bash
docker compose --env-file .env -f deploy/compose.yml ps
docker compose --env-file .env -f deploy/compose.yml logs --tail=200 backend
docker compose --env-file .env -f deploy/compose.yml logs --tail=200 edge
```

- Không vào được 80/443: kiểm tra DNS, firewall cloud, UFW và port mapping.
- Caddy không cấp HTTPS: kiểm tra domain, `SITE_ADDRESS` và cổng 80/443.
- Backend không lên: kiểm tra `DB_PASSWORD`, `TOKEN_KEY`, database health và migration log.
- Lỗi cookie HTTPS: cần `APP_PUBLIC_ORIGIN=https://...` và `COOKIE_SECURE=true`.
- Không chạy `docker compose down -v` trên production.

## 9. Checklist production

- [ ] DNS đúng server, mở 80/443.
- [ ] `.env` không commit, quyền `600`.
- [ ] Giữ nguyên `TOKEN_KEY` qua mọi deploy.
- [ ] Đã đổi mật khẩu admin/database khỏi giá trị mẫu.
- [ ] Có backup database và media ngoài server.
- [ ] Đã kiểm tra health, đăng nhập admin và invitation/RSVP mẫu.
