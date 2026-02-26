# Hướng Dẫn Sử Dụng BMAD Method Trong Cursor IDE

## 🎯 Tổng Quan

BMAD Method hoạt động trong Cursor thông qua **Chat Interface** của Cursor. Bạn sẽ tương tác với BMAD bằng cách chat trực tiếp với AI assistant trong Cursor, và AI sẽ đóng vai trò là các BMAD agents.

---

## 🚀 Cách Bắt Đầu

### Phương Pháp 1: Kích Hoạt BMad Master Agent (Khuyến Nghị)

**Bước 1:** Mở Cursor Chat (phím tắt: `Cmd+L` trên Mac hoặc `Ctrl+L` trên Windows/Linux)

**Bước 2:** Gõ một trong các lệnh sau:

```
@_bmad/core/agents/bmad-master.md
```

Hoặc đơn giản hơn, bạn có thể nói:

```
Hãy load BMad Master agent từ file _bmad/core/agents/bmad-master.md và kích hoạt nó
```

**Bước 3:** AI sẽ đọc file agent và kích hoạt BMad Master. Bạn sẽ thấy:
- Lời chào từ BMad Master
- Menu với các tùy chọn (MH, CH, LT, LW, PM, DA)
- Hướng dẫn sử dụng `/bmad-help`

### Phương Pháp 2: Sử Dụng Commands Trực Tiếp

Bạn có thể bắt đầu workflow trực tiếp mà không cần load agent:

```
/bmad-brainstorming
```

Hoặc:

```
Hãy chạy workflow brainstorming từ _bmad/core/workflows/brainstorming/workflow.md
```

---

## 💬 Các Cách Tương Tác

### 1. Load Agent và Sử Dụng Menu

```
@_bmad/core/agents/bmad-master.md

Sau khi load, tôi muốn xem menu
```

**Kết quả:** BMad Master sẽ hiển thị menu:
1. [MH] Redisplay Menu Help
2. [CH] Chat with the Agent
3. [LT] List Available Tasks
4. [LW] List Workflows
5. [PM] Start Party Mode
6. [DA] Dismiss Agent

Bạn có thể:
- **Nhập số:** `1`, `2`, `3`, etc.
- **Nhập mã:** `MH`, `CH`, `LT`, etc.
- **Fuzzy match:** "menu", "help", "party", "exit"

### 2. Chạy Workflow Trực Tiếp

#### Brainstorming

```
Hãy chạy workflow brainstorming. Tôi muốn brainstorm về [chủ đề của bạn]
```

Hoặc:

```
@_bmad/core/workflows/brainstorming/workflow.md

Bắt đầu brainstorming session về [chủ đề]
```

**Quy trình:**
1. AI sẽ hỏi về chủ đề và mục tiêu
2. Bạn chọn phương pháp brainstorming (1-4)
3. AI sẽ hướng dẫn bạn qua từng bước
4. Output được lưu tại `_bmad-output/brainstorming/`

#### Party Mode

```
Hãy bắt đầu Party Mode. Tôi muốn thảo luận về [chủ đề]
```

Hoặc:

```
@_bmad/core/workflows/party-mode/workflow.md

Khởi động Party Mode để thảo luận về [chủ đề]
```

**Quy trình:**
1. AI load tất cả agents từ manifest
2. AI điều phối cuộc thảo luận giữa các agents
3. Bạn có thể đặt câu hỏi và các agents sẽ thảo luận
4. Thoát bằng: `*exit`, `goodbye`, `end party`

### 3. Sử Dụng Tasks

#### Help System

```
/bmad-help
```

Hoặc:

```
@_bmad/core/tasks/help.md

Tôi vừa hoàn thành brainstorming, bước tiếp theo là gì?
```

#### Index Docs

```
@_bmad/core/tasks/index-docs.xml

Hãy tạo index cho thư mục [đường dẫn]
```

#### Shard Document

```
@_bmad/core/tasks/shard-doc.xml

Hãy chia document này thành các file nhỏ hơn: [đường dẫn file]
```

#### Editorial Review

```
@_bmad/core/tasks/editorial-review-prose.xml

Hãy review văn bản này: [đường dẫn file]
```

```
@_bmad/core/tasks/editorial-review-structure.xml

Hãy review cấu trúc của document này: [đường dẫn file]
```

#### Adversarial Review

```
@_bmad/core/tasks/review-adversarial-general.xml

Hãy review critical document này: [đường dẫn file]
```

---

## 🎨 Ví Dụ Sử Dụng Thực Tế

### Ví Dụ 1: Brainstorming Cho Dự Án Mới

```
@_bmad/core/workflows/brainstorming/workflow.md

Chào bạn! Tôi muốn brainstorm về một ứng dụng quản lý task với AI assistant. 
Hãy bắt đầu session brainstorming.
```

**AI sẽ:**
1. Chào bạn và hỏi về chủ đề chi tiết
2. Hỏi về mục tiêu cụ thể
3. Đề xuất phương pháp brainstorming
4. Hướng dẫn bạn qua quy trình

### Ví Dụ 2: Review Code/Document

```
@_bmad/core/tasks/review-adversarial-general.xml

Hãy review file này một cách critical và tìm các vấn đề tiềm ẩn:
@src/components/MyComponent.tsx
```

### Ví Dụ 3: Party Mode - Thảo Luận Đa Agent

```
@_bmad/core/workflows/party-mode/workflow.md

Khởi động Party Mode. Tôi muốn thảo luận về kiến trúc của ứng dụng này.
Các agents có thể đưa ra ý kiến về:
- Security best practices
- Performance optimization
- User experience
```

**AI sẽ:**
1. Load các agents có sẵn
2. Giới thiệu các agents
3. Điều phối thảo luận giữa các agents
4. Mỗi agent đưa ra góc nhìn khác nhau

### Ví Dụ 4: Sử Dụng Help System

```
@_bmad/core/tasks/help.md

Tôi đã hoàn thành brainstorming session. Bây giờ tôi nên làm gì tiếp theo?
```

**AI sẽ:**
1. Phân tích output từ brainstorming
2. Đề xuất các bước tiếp theo
3. Gợi ý workflows/tasks phù hợp

---

## 🔧 Tips & Tricks Cho Cursor

### 1. Sử Dụng @ Mention

Cursor hỗ trợ `@` để mention files. Bạn có thể:

```
@_bmad/core/agents/bmad-master.md load agent này
```

Hoặc mention nhiều files:

```
@_bmad/core/workflows/brainstorming/workflow.md 
@_bmad/core/config.yaml

Hãy load config và bắt đầu brainstorming
```

### 2. Reference Files Trong Chat

Bạn có thể reference files trong workspace:

```
Hãy đọc file này và review: @src/components/Button.tsx
```

### 3. Kết Hợp Commands

```
@_bmad/core/agents/bmad-master.md

Sau khi load, hãy:
1. Hiển thị menu
2. Sau đó chạy brainstorming về "mobile app features"
```

### 4. Continuation

BMAD tự động detect continuation. Nếu bạn đã chạy workflow trước đó:

```
Tiếp tục brainstorming session trước đó
```

AI sẽ:
- Tìm output document
- Đọc frontmatter để biết state
- Tiếp tục từ bước đã dừng

### 5. Context Switching

Bạn có thể switch giữa các workflows:

```
Tạm dừng brainstorming này. Hãy chạy Party Mode để thảo luận về ý tưởng vừa tạo.
```

---

## 📋 Workflow Patterns Trong Cursor

### Pattern 1: Ideation → Review → Refine

```
# Bước 1: Brainstorming
@_bmad/core/workflows/brainstorming/workflow.md
Brainstorm về [chủ đề]

# Bước 2: Review ý tưởng
@_bmad/core/tasks/review-adversarial-general.xml
Review các ý tưởng từ brainstorming session

# Bước 3: Refine
@_bmad/core/tasks/editorial-review-structure.xml
Tổ chức lại và refine các ý tưởng tốt nhất
```

### Pattern 2: Multi-Perspective Analysis

```
# Sử dụng Party Mode để có nhiều góc nhìn
@_bmad/core/workflows/party-mode/workflow.md
Thảo luận về [vấn đề] từ nhiều góc độ
```

### Pattern 3: Document Management

```
# Bước 1: Tạo index
@_bmad/core/tasks/index-docs.xml
Tạo index cho thư mục docs/

# Bước 2: Shard nếu cần
@_bmad/core/tasks/shard-doc.xml
Chia file lớn thành các phần nhỏ

# Bước 3: Review
@_bmad/core/tasks/editorial-review-prose.xml
Review từng phần
```

---

## 🎯 Best Practices

### 1. Luôn Load Config Trước

BMAD cần config để hoạt động. Khi load agent, nó sẽ tự động load config từ `_bmad/core/config.yaml`.

### 2. Sử Dụng Fresh Context

Mỗi workflow nên chạy trong context mới để tránh confusion. Bạn có thể:
- Tạo chat mới trong Cursor
- Hoặc nói rõ "bắt đầu workflow mới"

### 3. Reference Output Files

Sau khi workflow chạy xong, bạn có thể reference output:

```
Đọc file brainstorming output này và tổ chức lại:
@_bmad-output/brainstorming/brainstorming-session-2026-02-22.md
```

### 4. Sử Dụng Help Khi Stuck

```
@_bmad/core/tasks/help.md
Tôi không chắc bước tiếp theo. Hãy giúp tôi.
```

### 5. Combine với Code

Bạn có thể combine BMAD workflows với code review:

```
@_bmad/core/tasks/review-adversarial-general.xml
Review code này và tìm bugs:
@src/utils/api.ts
```

---

## 🐛 Troubleshooting

### Vấn đề: AI không hiểu command

**Giải pháp:**
- Sử dụng `@` mention để reference file cụ thể
- Nói rõ ràng: "Hãy load agent từ file..."
- Hoặc: "Hãy chạy workflow từ file..."

### Vấn đề: Workflow không tiếp tục

**Giải pháp:**
```
@_bmad/core/tasks/help.md
Tôi đã chạy brainstorming trước đó. Làm sao để tiếp tục?
```

### Vấn đề: Output không được tạo

**Giải pháp:**
- Kiểm tra `_bmad/core/config.yaml` có đúng không
- Kiểm tra quyền write vào `_bmad-output/`
- Yêu cầu AI tạo output file rõ ràng

### Vấn đề: Agent không giữ character

**Giải pháp:**
- Reference lại agent file: `@_bmad/core/agents/bmad-master.md`
- Nói rõ: "Hãy đóng vai BMad Master agent"

---

## 📝 Quick Commands Cheat Sheet

### Load Agents
```
@_bmad/core/agents/bmad-master.md
```

### Workflows
```
@_bmad/core/workflows/brainstorming/workflow.md
@_bmad/core/workflows/party-mode/workflow.md
```

### Tasks
```
@_bmad/core/tasks/help.md
@_bmad/core/tasks/index-docs.xml
@_bmad/core/tasks/shard-doc.xml
@_bmad/core/tasks/editorial-review-prose.xml
@_bmad/core/tasks/editorial-review-structure.xml
@_bmad/core/tasks/review-adversarial-general.xml
```

### Config
```
@_bmad/core/config.yaml
```

---

## 🎓 Advanced Usage

### Custom Agent Behavior

Bạn có thể customize agent behavior bằng file:
```
@_bmad/_config/agents/core-bmad-master.customize.yaml
```

### Multiple Workflows

Bạn có thể chạy nhiều workflows song song bằng cách tạo nhiều chat windows trong Cursor.

### Integration với Code

BMAD workflows có thể được tích hợp vào development workflow:

```
@_bmad/core/workflows/brainstorming/workflow.md
Brainstorm về test strategy cho component này:
@src/components/UserProfile.tsx
```

---

## ✅ Checklist Khi Sử Dụng

- [ ] Đã kiểm tra config tại `_bmad/core/config.yaml`
- [ ] Đã load agent hoặc reference workflow file
- [ ] Đã nói rõ mục tiêu/chủ đề
- [ ] Đã chờ AI hỏi và trả lời đầy đủ
- [ ] Đã kiểm tra output files sau khi hoàn thành
- [ ] Đã sử dụng `/bmad-help` nếu cần hướng dẫn

---

**Chúc bạn sử dụng BMAD Method hiệu quả trong Cursor! 🚀**

Nếu có thắc mắc, hãy sử dụng:
```
@_bmad/core/tasks/help.md
```
