# Tính Năng Mới - Animation, History & Statistics

## ✅ Đã Triển Khai

### 1. Animation Transitions

#### CSS Animations (`app/globals.css`)
- ✅ **fadeIn** - Fade in với slide up
- ✅ **slideIn** - Slide in từ trái
- ✅ **scaleIn** - Scale in effect
- ✅ **bounce** - Bounce animation
- ✅ **pulse** - Pulse effect

#### Utility Classes
- `.animate-fade-in` - Fade in animation
- `.animate-slide-in` - Slide in animation
- `.animate-scale-in` - Scale in animation
- `.card-hover` - Hover effect cho cards
- `.btn-press` - Press effect cho buttons
- `.word-reveal` - Animation khi reveal từ khóa
- `.page-transition` - Transition cho page changes

#### Áp Dụng
- ✅ Home page với fade-in
- ✅ Room lobby với slide-in
- ✅ Game screen với scale-in cho word reveal
- ✅ Buttons với hover và press effects
- ✅ Cards với hover animations

### 2. Game History

#### Database Schema (`supabase/schema.sql`)
- ✅ **game_history** table:
  - `id` (UUID)
  - `room_code` (TEXT)
  - `word_pair_id` (BIGINT)
  - `players` (JSONB)
  - `winners` (JSONB)
  - `game_result` (TEXT)
  - `started_at`, `ended_at` (TIMESTAMP)
  - `duration_seconds` (INTEGER)

#### Features
- ✅ Tự động lưu lịch sử khi game kết thúc
- ✅ Lưu thời gian bắt đầu/kết thúc
- ✅ Tính duration tự động
- ✅ Lưu danh sách người chơi và người thắng
- ✅ Lưu kết quả game

#### UI (`app/history/[code]/page.tsx`)
- ✅ Hiển thị danh sách lịch sử game
- ✅ Hiển thị thời gian, duration, kết quả
- ✅ Hiển thị người thắng
- ✅ Animation cho từng card
- ✅ Responsive design

### 3. Statistics

#### Database Schema (`supabase/schema.sql`)
- ✅ **game_statistics** table:
  - `id` (UUID)
  - `room_code` (TEXT, UNIQUE)
  - `total_games` (INTEGER)
  - `civilian_wins`, `undercover_wins`, `mr_white_wins` (INTEGER)
  - `total_players` (INTEGER)
  - `average_game_duration` (INTEGER)
  - `most_played_category` (TEXT)

#### Auto-Update Trigger
- ✅ Trigger tự động cập nhật statistics khi game kết thúc
- ✅ Tính toán win rate cho từng role
- ✅ Cập nhật average duration
- ✅ Track most played category

#### UI (`app/statistics/[code]/page.tsx`)
- ✅ **Tổng quan:**
  - Tổng số game
  - Tổng số người chơi
  - Thời gian trung bình
  - Tổng số lần thắng

- ✅ **Thống kê thắng/thua:**
  - Dân thường: số lần thắng + win rate + progress bar
  - Undercover: số lần thắng + win rate + progress bar
  - Mr. White: số lần thắng + win rate + progress bar

- ✅ **Visualizations:**
  - Progress bars với animation
  - Color-coded theo role
  - Percentage display

## Cách Sử Dụng

### 1. Setup Database
Chạy lại `supabase/schema.sql` để tạo các bảng mới:
- `game_history`
- `game_statistics`
- Trigger `update_game_statistics`

### 2. Xem Lịch Sử
- Vào Room Lobby → Click "Lịch Sử"
- Hoặc truy cập `/history/[room_code]`

### 3. Xem Thống Kê
- Vào Room Lobby → Click "Thống Kê"
- Hoặc truy cập `/statistics/[room_code]`

## Flow Hoàn Chỉnh

```
1. Home → Tạo/Join phòng
2. Room Lobby → Chọn số người → Chọn mode → Bắt đầu
3. Game Screen → Chơi game (với animations)
4. Result Screen → Xem kết quả
5. (Tự động) → Lưu vào game_history
6. (Tự động) → Cập nhật game_statistics
7. Room Lobby → Xem Lịch Sử / Thống Kê
```

## Technical Details

### Animation Performance
- Sử dụng CSS animations (GPU accelerated)
- Staggered animations cho lists
- Smooth transitions (0.3s - 0.5s)

### Data Storage
- History: Lưu mỗi game riêng biệt
- Statistics: Aggregated data per room
- Auto-update via database triggers

### Type Safety
- TypeScript types cho `GameHistory` và `GameStatistics`
- Type-safe database queries
