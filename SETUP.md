# Hướng Dẫn Setup Dự Án Undercover Clone

## Bước 1: Cài Đặt Dependencies

```bash
npm install
```

## Bước 2: Setup Supabase

### 2.1. Tạo Supabase Project

1. Truy cập [https://supabase.com](https://supabase.com)
2. Đăng nhập/Đăng ký tài khoản
3. Tạo project mới
4. Chờ project được khởi tạo (khoảng 2 phút)

### 2.2. Chạy Database Schema

1. Vào **SQL Editor** trong Supabase Dashboard
2. Copy toàn bộ nội dung file `supabase/schema.sql`
3. Paste vào SQL Editor và chạy (Run)

### 2.3. Import Word Pairs Data

1. Vẫn trong **SQL Editor**
2. Copy toàn bộ nội dung file `supabase/seed-word-pairs.sql`
3. Paste và chạy để import 70 cặp từ mẫu

> **Lưu ý:** Bạn có thể thêm nhiều cặp từ hơn để đạt 500+ như yêu cầu.

### 2.4. Lấy Credentials

1. Vào **Settings** > **API**
2. Copy các giá trị:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Bước 3: Cấu Hình Environment Variables

Tạo file `.env.local` trong thư mục gốc:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Bước 4: Chạy Development Server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trong trình duyệt.

## Bước 5: Test Game Flow

1. **Tạo phòng:** Click "Tạo phòng mới" → Nhận mã phòng
2. **Thêm người chơi:** Nhập tên và click "Thêm"
3. **Bắt đầu game:** Click "Bắt đầu game" (cần ít nhất 3 người)
4. **Chơi game:** 
   - Click vào tên người chơi để xem từ khóa
   - Sau khi thảo luận, click vào người chơi để loại bỏ

## Cấu Trúc Dự Án

```
undercover-clone/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Home page (Create/Join Room)
│   ├── room/[code]/       # Room lobby
│   └── game/[code]/       # Game screen
├── lib/                    # Utilities
│   ├── supabase.ts        # Supabase client
│   ├── game.ts            # Game logic (roles, word selection)
│   └── utils.ts           # Helper functions
├── types/                  # TypeScript types
│   └── database.ts        # Database types
├── supabase/              # Database files
│   ├── schema.sql         # Database schema
│   └── seed-word-pairs.sql # Sample data
└── _bmad/                 # BMAD workflow config (không ảnh hưởng app)
```

## Tính Năng Đã Implement

✅ **Home Page:** Tạo/Join phòng bằng mã
✅ **Room Lobby:** Thêm người chơi, bắt đầu game
✅ **Game Screen:** Hiển thị từ khóa, voting, loại bỏ người chơi
✅ **Real-time Sync:** Đồng bộ trạng thái qua Supabase Realtime
✅ **Role Assignment:** Tự động phân vai (Civilian, Undercover, Mr. White)
✅ **Word Selection:** Chọn từ ngẫu nhiên, tránh trùng lặp

## Tính Năng Còn Thiếu (Có thể mở rộng)

- [ ] Game result screen (hiển thị ai thắng)
- [ ] Game history (lưu lịch sử ván đấu)
- [ ] Pack selection (chọn gói từ theo chủ đề)
- [ ] Difficulty filter (lọc theo độ khó)
- [ ] Timer cho mỗi lượt chơi
- [ ] Sound effects
- [ ] Responsive design cho mobile

## Troubleshooting

### Lỗi: "Missing Supabase environment variables"
→ Kiểm tra file `.env.local` đã được tạo và có đúng credentials chưa

### Lỗi: "relation 'rooms' does not exist"
→ Chưa chạy `schema.sql` trong Supabase SQL Editor

### Lỗi: "No word pairs found"
→ Chưa import `seed-word-pairs.sql` hoặc chưa có data trong bảng `word_pairs`

### Realtime không hoạt động
→ Kiểm tra Realtime đã được enable trong Supabase Dashboard:
  - Settings > API > Realtime
  - Đảm bảo `rooms` table đã được thêm vào Realtime publication

## Next Steps

1. Thêm nhiều word pairs hơn (đạt 500+)
2. Cải thiện UI/UX theo design của bạn
3. Thêm tính năng game result
4. Deploy lên Vercel/Netlify
