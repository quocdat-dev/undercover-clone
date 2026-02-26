# Changelog

## Room Lobby Simplification

### Thay đổi chính:
- ✅ **Bỏ phần "Add Player"** - Không cần thêm người chơi thủ công nữa
- ✅ **Thêm slider chọn số lượng người chơi** (3-10 người)
- ✅ **Tự động tạo danh sách người chơi** khi bắt đầu game (Người chơi 1, Người chơi 2, ...)
- ✅ **Thêm nút "Dừng phòng"** để xóa room khi không chơi nữa
- ✅ **Đơn giản hóa flow:** Tạo phòng → Chọn số người → Chọn mode → Bắt đầu

### Lý do:
- Game chỉ chơi trên 1 máy (Pass & Play)
- Không cần quản lý danh sách người chơi phức tạp
- Mỗi phòng là riêng biệt, có thể dừng khi không dùng

### Flow mới:
```
Home → Tạo phòng → Room Lobby:
  - Chọn số lượng người chơi (slider 3-10)
  - Chọn mode (Random/Pack)
  - Bắt đầu game (tự động tạo danh sách)
  - Dừng phòng (nếu không chơi nữa)
```
