# Quản lý Âm thanh — Nhận dạng tiếng nói

Ứng dụng Angular 21 chuyển giọng nói thành văn bản ngay trên trình duyệt bằng **Web Speech API**. Chưa cần backend.

## Chạy local

```bash
npm start
```

Mở [http://localhost:4200](http://localhost:4200). Cần cấp quyền micro. Nên dùng **Chrome** hoặc **Edge**.

## Tính năng hiện có

- Bật/tắt nghe, nhận dạng liên tục
- Chọn ngôn ngữ nhanh: **Tiếng Việt** / **Tiếng Nhật (日本語)**
- Nhận dạng tiếng Nhật qua Web Speech API (`ja-JP`), nối câu không chèn khoảng trắng kiểu Latin
- Bản ghi realtime (phần đang nhận dạng hiện mờ)
- Copy, tải file `.txt`, lưu lịch sử trên máy (`localStorage`)
- Dấu câu theo ngôn ngữ (tiếng Nhật: `。` `、` `？` `！`)

## Lưu ý

Web Speech API trên Chrome/Edge thường gửi âm thanh tới dịch vụ nhận dạng của trình duyệt, nên cần mạng. Đây chưa phải nhận dạng offline hoàn toàn. Safari/Firefox có thể không hỗ trợ.
