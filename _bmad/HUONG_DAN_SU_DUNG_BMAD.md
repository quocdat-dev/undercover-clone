# Hướng Dẫn Sử Dụng BMAD Method

## 📚 Tổng Quan

**BMAD (BMad Method)** là một hệ thống quản lý workflow và orchestration cho các tác vụ phát triển phần mềm, được thiết kế để giúp bạn làm việc hiệu quả hơn với LLM (Large Language Models).

### Phiên Bản Hiện Tại
- **Version:** 6.0.1
- **Cài đặt:** 2026-02-22
- **Module Core:** 6.0.1

---

## 🎯 Khái Niệm Cốt Lõi

### 1. **BMad Master Agent** 🧙
Agent chính điều phối toàn bộ hệ thống:
- Quản lý tài nguyên runtime
- Điều phối workflows
- Thực thi tasks
- Quản lý kiến thức dự án

### 2. **Workflows (Quy Trình)**
Các quy trình có cấu trúc để thực hiện các tác vụ phức tạp:
- **Brainstorming:** Tạo ý tưởng đa dạng
- **Party Mode:** Thảo luận đa agent

### 3. **Tasks (Tác Vụ)**
Các công cụ độc lập có thể sử dụng bất cứ lúc nào:
- Editorial Review (Prose & Structure)
- Index Docs
- Shard Document
- Adversarial Review
- Help System

### 4. **Micro-File Architecture**
Mỗi workflow được chia thành các file nhỏ, tự chứa để quản lý state và execution một cách có kỷ luật.

---

## 🚀 Bắt Đầu Sử Dụng

### Bước 1: Kiểm Tra Cấu Hình

File cấu hình nằm tại: `_bmad/core/config.yaml`

```yaml
user_name: Dlqnchill
communication_language: Vietnamese
document_output_language: English
output_folder: "{project-root}/_bmad-output}"
```

**Lưu ý:** BMAD sẽ tự động sử dụng ngôn ngữ giao tiếp từ config (`communication_language`).

### Bước 2: Kích Hoạt BMad Master Agent

Để bắt đầu, bạn cần load BMad Master agent:

```
/agent-bmad-master
```

Hoặc sử dụng command:
```
/bmad-master
```

### Bước 3: Menu Chính

Sau khi kích hoạt, bạn sẽ thấy menu:

1. **[MH]** Redisplay Menu Help - Hiển thị lại menu
2. **[CH]** Chat with the Agent - Trò chuyện với agent
3. **[LT]** List Available Tasks - Liệt kê các tasks có sẵn
4. **[LW]** List Workflows - Liệt kê các workflows có sẵn
5. **[PM]** Start Party Mode - Bắt đầu Party Mode
6. **[DA]** Dismiss Agent - Thoát agent

Bạn có thể:
- Nhập số (1-6)
- Nhập mã lệnh (MH, CH, LT, LW, PM, DA)
- Nhập từ khóa (fuzzy match): "menu", "help", "party", "exit", v.v.

---

## 📋 Các Workflows Có Sẵn

### 1. Brainstorming (BSP) 💡

**Mục đích:** Tạo ra nhiều ý tưởng đa dạng thông qua các kỹ thuật sáng tạo tương tác.

**Khi nào sử dụng:**
- Giai đoạn đầu của ideation
- Khi bị stuck và cần ý tưởng mới
- Cần nhiều góc nhìn khác nhau

**Cách sử dụng:**
```
/bmad-brainstorming
```

**Quy trình:**
1. **Session Setup:** Thiết lập chủ đề và mục tiêu
2. **Technique Selection:** Chọn phương pháp brainstorming
   - User-Selected: Bạn tự chọn kỹ thuật
   - AI-Recommended: AI đề xuất dựa trên mục tiêu
   - Random Selection: Chọn ngẫu nhiên
   - Progressive Flow: Bắt đầu rộng, sau đó thu hẹp dần
3. **Technique Execution:** Thực hiện kỹ thuật đã chọn
4. **Idea Organization:** Tổ chức và phân loại ý tưởng

**Output:** File tại `{output_folder}/brainstorming/brainstorming-session-{{date}}.md`

**Đặc điểm:**
- Mục tiêu: 100+ ý tưởng trước khi tổ chức
- Chống bias: Chuyển domain mỗi 10 ý tưởng
- Tập trung vào generative exploration

### 2. Party Mode (PM) 🎉

**Mục đích:** Điều phối thảo luận nhóm giữa tất cả các BMAD agents đã cài đặt.

**Khi nào sử dụng:**
- Cần nhiều góc nhìn từ các agent khác nhau
- Muốn các agent cộng tác với nhau
- Cần thảo luận đa chiều về một chủ đề

**Cách sử dụng:**
```
/bmad-party-mode
```

**Quy trình:**
1. **Agent Loading:** Load tất cả agents từ manifest
2. **Discussion Orchestration:** Điều phối cuộc thảo luận
   - Phân tích relevance của từng agent
   - Chọn 2-3 agents phù hợp nhất
   - Cho phép agents tương tác với nhau
3. **Graceful Exit:** Thoát một cách lịch sự

**Đặc điểm:**
- Agents giữ nguyên personality và expertise
- Cho phép cross-talk giữa các agents
- Tự động rotate agents để đảm bảo đa dạng

**Thoát Party Mode:**
- Gõ: `*exit`, `goodbye`, `end party`, `quit`

---

## 🛠️ Các Tasks Có Sẵn

### 1. bmad-help (BH) ❓

**Mục đích:** Giúp bạn biết bước tiếp theo hoặc trả lời câu hỏi về BMAD Method.

**Cách sử dụng:**
```
/bmad-help
```

Hoặc kết hợp với câu hỏi:
```
/bmad-help where should I start with an idea I have that does XYZ
```

**Tính năng:**
- Phân tích workflow hiện tại
- Đề xuất bước tiếp theo dựa trên phase/sequence
- Kiểm tra artifacts đã tạo
- Hướng dẫn routing giữa các workflows

### 2. Index Docs (ID) 📑

**Mục đích:** Tạo index nhẹ để LLM scan nhanh các documents.

**Khi nào sử dụng:**
- Khi LLM cần hiểu các docs có sẵn mà không cần load tất cả
- Tạo overview của một thư mục documents

**Cách sử dụng:**
```
/bmad-index-docs
```

### 3. Shard Document (SD) ✂️

**Mục đích:** Chia document lớn thành các file nhỏ hơn theo sections.

**Khi nào sử dụng:**
- Document quá lớn (>500 dòng)
- Cần quản lý document hiệu quả hơn
- Muốn tách document thành các phần độc lập

**Cách sử dụng:**
```
/bmad-shard-doc
```

### 4. Editorial Review - Prose (EP) ✍️

**Mục đích:** Review văn bản về clarity, tone, và các vấn đề communication.

**Khi nào sử dụng:**
- Sau khi draft xong, cần polish nội dung
- Cần cải thiện cách viết

**Cách sử dụng:**
```
/bmad-editorial-review-prose
```

**Output:** Bảng markdown 3 cột với các đề xuất sửa đổi, đặt cùng với target document.

### 5. Editorial Review - Structure (ES) 🏗️

**Mục đích:** Đề xuất cắt, tổ chức lại, và đơn giản hóa trong khi vẫn giữ được comprehension.

**Khi nào sử dụng:**
- Document được tạo từ nhiều subprocesses
- Cần cải thiện cấu trúc

**Cách sử dụng:**
```
/bmad-editorial-review-structure
```

**Output:** Report đặt cùng với target document.

### 6. Adversarial Review (AR) 🔍

**Mục đích:** Review nội dung một cách critical để tìm issues và weaknesses.

**Khi nào sử dụng:**
- Quality assurance
- Trước khi finalize deliverables
- Code Review (tự động chạy trong các modules khác)

**Cách sử dụng:**
```
/bmad-review-adversarial-general
```

---

## 📖 Hướng Dẫn Sử Dụng Chi Tiết

### Scenario 1: Bắt Đầu Một Dự Án Mới

1. **Kích hoạt BMad Master:**
   ```
   /agent-bmad-master
   ```

2. **Sử dụng Brainstorming để tạo ý tưởng:**
   - Chọn `[PM]` hoặc gõ "brainstorming"
   - Hoặc dùng command: `/bmad-brainstorming`
   - Thiết lập chủ đề và mục tiêu
   - Chọn phương pháp brainstorming
   - Generate 100+ ý tưởng
   - Tổ chức và phân loại

3. **Nếu cần nhiều góc nhìn:**
   - Sử dụng Party Mode: `/bmad-party-mode`
   - Đặt câu hỏi và để các agents thảo luận

### Scenario 2: Review và Cải Thiện Document

1. **Nếu document quá lớn:**
   ```
   /bmad-shard-doc
   ```

2. **Review prose:**
   ```
   /bmad-editorial-review-prose
   ```

3. **Review structure:**
   ```
   /bmad-editorial-review-structure
   ```

4. **Adversarial review:**
   ```
   /bmad-review-adversarial-general
   ```

### Scenario 3: Bị Stuck và Cần Hướng Dẫn

1. **Sử dụng help system:**
   ```
   /bmad-help
   ```

2. **Hoặc kết hợp với câu hỏi cụ thể:**
   ```
   /bmad-help I just finished brainstorming, what should I do next?
   ```

### Scenario 4: Cần Index Documents

1. **Tạo index:**
   ```
   /bmad-index-docs
   ```

2. **LLM sẽ có thể scan nhanh các documents mà không cần load tất cả**

---

## 🎓 Best Practices

### 1. Workflow Execution
- **Luôn chạy mỗi workflow trong fresh context window** để tránh confusion
- **Đọc output documents** để hiểu state hiện tại
- **Sử dụng `/bmad-help`** khi không chắc bước tiếp theo

### 2. Brainstorming
- **Mục tiêu 100+ ý tưởng** trước khi tổ chức
- **20 ý tưởng đầu thường là obvious** - magic xảy ra ở ý tưởng 50-100
- **Giữ generative exploration mode** càng lâu càng tốt
- **Chống bias:** Chuyển domain mỗi 10 ý tưởng

### 3. Party Mode
- **Đặt câu hỏi rõ ràng** để agents hiểu context
- **Cho phép agents tương tác** với nhau tự nhiên
- **Sử dụng khi cần diverse perspectives**

### 4. Document Management
- **Shard documents >500 dòng** để quản lý tốt hơn
- **Review theo thứ tự:** Prose → Structure → Adversarial
- **Sử dụng Index Docs** khi có nhiều documents

### 5. Validation
- **Sử dụng LLM chất lượng cao khác** cho validation workflows nếu có thể
- **Adversarial Review** nên chạy trước khi finalize

---

## 🔧 Cấu Trúc Thư Mục

```
_bmad/
├── _config/              # Cấu hình và manifests
│   ├── agent-manifest.csv
│   ├── bmad-help.csv
│   ├── task-manifest.csv
│   ├── workflow-manifest.csv
│   └── manifest.yaml
├── core/                 # Module core
│   ├── agents/           # Agent definitions
│   ├── tasks/           # Task definitions
│   ├── workflows/       # Workflow definitions
│   └── config.yaml      # Core config
└── _bmad-output/        # Output folder (tự động tạo)
    └── brainstorming/   # Brainstorming outputs
```

---

## 💡 Tips & Tricks

1. **Fuzzy Matching:** Bạn không cần nhập chính xác command, có thể dùng từ khóa
   - "brainstorm" → Brainstorming
   - "party" → Party Mode
   - "help" → bmad-help

2. **Continuation:** BMAD tự động detect nếu bạn đang tiếp tục một workflow
   - Kiểm tra output documents
   - Load state từ frontmatter
   - Tiếp tục từ bước đã dừng

3. **Multi-Language Support:**
   - Communication: Sử dụng `communication_language` từ config
   - Documents: Sử dụng `document_output_language` từ config

4. **Agent Memory:**
   - Agents có thể nhớ context từ các conversations trước
   - Sử dụng Party Mode để agents chia sẻ knowledge

---

## 🆘 Troubleshooting

### Vấn đề: Không tìm thấy config
**Giải pháp:** Kiểm tra `_bmad/core/config.yaml` tồn tại và có đúng format

### Vấn đề: Workflow không tiếp tục được
**Giải pháp:** 
- Kiểm tra output document có frontmatter với `stepsCompleted`
- Sử dụng `/bmad-help` để xem bước tiếp theo

### Vấn đề: Agent không hiểu command
**Giải pháp:**
- Sử dụng `/bmad-help` để xem commands có sẵn
- Thử fuzzy matching với từ khóa
- Kiểm tra spelling

### Vấn đề: Output không được tạo
**Giải pháp:**
- Kiểm tra `output_folder` trong config
- Đảm bảo có quyền write vào thư mục
- Kiểm tra workflow đã complete chưa

---

## 📚 Tài Liệu Tham Khảo

- **Agent Master:** `_bmad/core/agents/bmad-master.md`
- **Help System:** `_bmad/core/tasks/help.md`
- **Brainstorming Workflow:** `_bmad/core/workflows/brainstorming/workflow.md`
- **Party Mode Workflow:** `_bmad/core/workflows/party-mode/workflow.md`
- **Manifests:** `_bmad/_config/*.csv`

---

## 🎯 Tóm Tắt Nhanh

### Commands Chính:
- `/agent-bmad-master` - Kích hoạt BMad Master
- `/bmad-brainstorming` - Bắt đầu brainstorming
- `/bmad-party-mode` - Bắt đầu party mode
- `/bmad-help` - Xem hướng dẫn

### Menu Shortcuts:
- `MH` - Menu Help
- `CH` - Chat
- `LT` - List Tasks
- `LW` - List Workflows
- `PM` - Party Mode
- `DA` - Dismiss Agent

### Workflows:
1. **Brainstorming** - Tạo ý tưởng (100+ ideas)
2. **Party Mode** - Thảo luận đa agent

### Tasks:
1. **bmad-help** - Hướng dẫn
2. **Index Docs** - Tạo index
3. **Shard Document** - Chia document
4. **Editorial Review** - Review văn bản
5. **Adversarial Review** - Review critical

---

**Chúc bạn sử dụng BMAD Method hiệu quả! 🚀**

Nếu có thắc mắc, hãy sử dụng `/bmad-help` hoặc chat với BMad Master agent.
