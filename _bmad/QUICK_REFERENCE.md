# BMAD Method - Quick Reference Card

## 🚀 Bắt Đầu Nhanh

### Trong Cursor IDE

```bash
# Mở Cursor Chat (Cmd+L / Ctrl+L), sau đó:

# Load BMad Master Agent
@_bmad/core/agents/bmad-master.md

# Hoặc chạy workflow trực tiếp
@_bmad/core/workflows/brainstorming/workflow.md
```

### Commands (Nếu hỗ trợ)

```bash
# Kích hoạt BMad Master
/agent-bmad-master

# Hoặc
/bmad-master
```

## 📋 Menu Chính

| Code | Command | Mô Tả |
|------|---------|-------|
| MH | Menu Help | Hiển thị lại menu |
| CH | Chat | Trò chuyện với agent |
| LT | List Tasks | Liệt kê tasks |
| LW | List Workflows | Liệt kê workflows |
| PM | Party Mode | Bắt đầu Party Mode |
| DA | Dismiss Agent | Thoát agent |

## 🔧 Commands

### Workflows
```bash
/bmad-brainstorming    # Brainstorming session
/bmad-party-mode       # Multi-agent discussion
```

### Tasks
```bash
/bmad-help                          # Help system
/bmad-index-docs                    # Tạo index documents
/bmad-shard-doc                     # Chia document lớn
/bmad-editorial-review-prose        # Review văn bản
/bmad-editorial-review-structure   # Review cấu trúc
/bmad-review-adversarial-general   # Critical review
```

## 💡 Workflows

### Brainstorming (BSP)
- **Mục đích:** Tạo 100+ ý tưởng đa dạng
- **Output:** `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`
- **Phương pháp:**
  1. User-Selected
  2. AI-Recommended
  3. Random Selection
  4. Progressive Flow

### Party Mode (PM)
- **Mục đích:** Thảo luận đa agent
- **Thoát:** `*exit`, `goodbye`, `end party`, `quit`

## 🎯 Khi Nào Sử Dụng

| Task/Workflow | Khi Nào Sử Dụng |
|---------------|-----------------|
| Brainstorming | Giai đoạn ideation, bị stuck |
| Party Mode | Cần nhiều góc nhìn, cộng tác agents |
| bmad-help | Không chắc bước tiếp theo |
| Index Docs | LLM cần scan nhanh documents |
| Shard Doc | Document >500 dòng |
| Editorial Review | Sau khi draft, cần polish |
| Adversarial Review | Quality assurance, trước khi finalize |

## 📁 Cấu Trúc

```
_bmad/
├── _config/          # Configs & manifests
├── core/             # Core module
└── _bmad-output/     # Outputs (auto-created)
```

## ⚡ Tips

### General
- **Fuzzy matching:** Dùng từ khóa thay vì command đầy đủ
- **Continuation:** BMAD tự động detect và tiếp tục workflow
- **Fresh context:** Chạy mỗi workflow trong context mới
- **Help anytime:** `/bmad-help [your question]`

### Cursor Specific
- **@ Mention:** Dùng `@` để reference files: `@_bmad/core/agents/bmad-master.md`
- **Multiple Files:** Có thể mention nhiều files cùng lúc
- **Code Integration:** Combine với code review: `@src/components/Button.tsx`
- **Chat Windows:** Tạo nhiều chat để chạy workflows song song

## 🔍 Troubleshooting

| Vấn đề | Giải pháp |
|--------|-----------|
| Không tìm thấy config | Kiểm tra `_bmad/core/config.yaml` |
| Workflow không tiếp tục | Dùng `/bmad-help` |
| Agent không hiểu | Thử fuzzy matching |
| Output không tạo | Kiểm tra `output_folder` trong config |

## 📖 Tài Liệu Chi Tiết

- **Hướng dẫn đầy đủ:** `HUONG_DAN_SU_DUNG_BMAD.md`
- **Hướng dẫn Cursor:** `HUONG_DAN_CURSOR.md`
- **Quick Reference:** `QUICK_REFERENCE.md` (file này)

---

**Version:** 6.0.1 | **Language:** Vietnamese | **IDE:** Cursor
