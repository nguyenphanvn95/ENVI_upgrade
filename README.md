# ENVI Custom – Lưu & Quản lý từ vựng + Xuất/Nhập + Nhập vào Anki (AnkiConnect)

Tài liệu này hướng dẫn **nâng cấp extension “Từ điển Anh Việt ENVI” bản gốc** thành **phiên bản custom** có thêm:
- Nút **Save** để lưu từ vựng (kèm **nghĩa + ví dụ + phiên âm**) vào bộ nhớ cục bộ (Chrome/Edge storage).
- Trang **Quản lý từ vựng**: tìm kiếm, sửa, xóa (chọn nhiều), xuất TXT/CSV/JSON, nhập JSON.
- Nút **Nhập vào Anki** qua **AnkiConnect**: chọn Deck, Note type, map field rồi “Save to Anki”.
- Click vào **từ vựng** trong trang quản lý sẽ mở tra cứu: `https://envi.jpdictionary.com/?word=<word>`

> Extension gốc trên Microsoft Edge Add-ons:  
> https://microsoftedge.microsoft.com/addons/detail/t%E1%BB%AB-%C4%91i%E1%BB%83n-anh-vi%E1%BB%87t-envi/chdeclnmlnempcpfdobilgliaheoobfi


---

## 1) Chuẩn bị

### 1.1. Yêu cầu
- Microsoft Edge (khuyến nghị mới nhất)
- Quyền **Developer mode** để load extension unpacked
- Bộ file custom (bạn sẽ **ghi đè** lên code của extension)

### 1.2. Các file custom cần có
Bạn cần các file sau (đúng tên):
- `popup2.js` (bản đã patch để có nút Save + mở trang quản lý)
- `vocab_manager.html`
- `vocab_manager.js`
- `manifest.json` (đã thêm cấu hình để mở trang quản lý và cấp quyền phù hợp)

> Nếu bạn đang dùng bộ file do mình tạo: hãy đổi tên đúng theo hướng dẫn ở phần “Ghi đè file”.

---

## 2) Lấy mã nguồn extension gốc (ENVI)

Vì extension trên store không cho bạn “sửa trực tiếp”, cách chuẩn là:
1. Cài extension ENVI từ store (link ở trên).
2. Sau đó tạo **bản sao unpacked** để bạn sửa và load bằng Developer mode.

### Cách A (khuyến nghị – dễ làm, ổn định)
1. Mở: `edge://extensions`
2. Bật **Developer mode** (góc phải trên)
3. Tìm extension “Từ điển Anh Việt ENVI”
4. Bấm **Details**
5. Tìm mục **Extension ID** (ví dụ: `chdeclnmlnempcpfdobilgliaheoobfi`)
6. Vào thư mục extension đã cài:
   - Windows thường nằm ở:
     - `C:\Users\<YourUser>\AppData\Local\Microsoft\Edge\User Data\Default\Extensions\<ExtensionID>\`
7. Bên trong sẽ có 1 hoặc nhiều thư mục version (ví dụ `1.2.3_0`).  
   **Copy toàn bộ thư mục version đó** ra một nơi bạn dễ quản lý, ví dụ:
   - `D:\ENVI_custom\`

> Từ đây trở đi, bạn **chỉ chỉnh sửa trong thư mục copy** (D:\ENVI_custom\), không chỉnh trong thư mục Edge cài đặt.

---

## 3) Ghi đè / sao chép file custom vào đúng vị trí

### 3.1. Xác định các file trong thư mục ENVI_custom
Trong thư mục bạn copy ra (ví dụ `D:\ENVI_custom\`) sẽ có các file kiểu:
- `manifest.json`
- `popup.html`, `popup.js`, `popup2.js` (tùy phiên bản)
- Các file css/js khác…

### 3.2. Ghi đè các file sau
Bạn **copy các file custom** và **ghi đè** vào **chính thư mục gốc** của extension (cùng cấp với manifest):

1) Ghi đè:
- `manifest.json`

2) Ghi đè/Thêm mới:
- `popup2.js`  *(bản custom đã thêm Save + mở trang quản lý)*

3) Thêm mới (nếu chưa có):
- `vocab_manager.html`
- `vocab_manager.js`

#### Ví dụ cấu trúc sau khi copy:
```
D:\ENVI_custom\
  manifest.json
  popup.html
  popup.js
  popup2.js          <-- custom
  vocab_manager.html <-- custom
  vocab_manager.js   <-- custom
  ...
```

> **Lưu ý:** Nếu extension gốc không có `popup2.js` mà dùng tên khác (ví dụ `popup.js`), bạn phải:
- hoặc đổi tên file custom thành đúng tên file đang được `manifest.json` gọi,
- hoặc sửa `manifest.json` để trỏ đúng file (phần `action.default_popup`).

---

## 4) Load extension custom (Unpacked) trên Edge

1. Mở `edge://extensions`
2. Bật **Developer mode**
3. Bấm **Load unpacked**
4. Chọn thư mục `D:\ENVI_custom\` (thư mục có `manifest.json`)
5. Extension custom sẽ xuất hiện trong danh sách

> Khuyến nghị: **tắt / remove** bản ENVI cài từ store để tránh xung đột, hoặc ít nhất “Disable” bản store.

---

## 5) Cách dùng các tính năng mới

### 5.1. Lưu từ vựng (Save)
- Khi bạn tra một từ, popup hiện kết quả.
- Bấm nút **Save** (nút custom) để lưu vào bộ nhớ cục bộ.
- Dữ liệu lưu gồm:
  - word
  - phonetic
  - pos (loại từ)
  - meanings (tối đa 2 nghĩa)
  - examples (tối đa 2 ví dụ + dịch)
  - pageUrl (URL trang đang đọc)

### 5.2. Mở trang quản lý
Trong popup, bấm **Quản lý** để mở trang:
- `vocab_manager.html`

Trang này cho phép:
- Tìm kiếm
- Tick chọn nhiều → **xóa hàng loạt**
- Sửa từng từ (icon bút ✏️)
- Xóa từng từ (icon thùng rác 🗑)
- Xuất TXT/CSV/JSON
- Nhập JSON (merge, chống trùng theo từ/phiên âm/loại từ)

### 5.3. Click vào từ vựng để xem thêm
Trên trang quản lý, bấm vào **từ vựng** sẽ mở:
- `https://envi.jpdictionary.com/?word=<word>`

---

## 6) Nhập vào Anki bằng AnkiConnect (chi tiết)

### 6.1. Cài Anki + AnkiConnect
1. Cài Anki (khuyến nghị bản mới nhất)
2. Mở Anki → **Tools → Add-ons → Get Add-ons…**
3. Nhập mã AnkiConnect: **2055492159**
4. Restart Anki

> AnkiConnect chạy server local ở: `http://127.0.0.1:8765`

### 6.2. Lưu ý tường lửa / quyền truy cập
- Đảm bảo Windows Firewall không chặn Anki.
- Anki phải **đang mở** thì nút “Nhập vào Anki” mới hoạt động.

### 6.3. Dùng nút “Nhập vào Anki” trong trang quản lý
1. Mở trang quản lý `vocab_manager.html`
2. (Tuỳ chọn) Tick chọn các từ muốn nhập
3. Bấm **Nhập vào Anki**
4. Trong cửa sổ:
   - Chọn **Deck**
   - Chọn **Note type**
   - Chọn “Scope”:
     - Chỉ từ đã chọn / danh sách đang hiển thị / tất cả
   - Map field:
     - Word → field Word (hoặc Front)
     - Phonetic → field IPA/Pronunciation
     - POS → field POS
     - Meanings → field Meaning/Back
     - Examples → field Examples
     - Source URL → field Source/URL
5. Bấm **Save to Anki**

Nếu báo lỗi:
- “Không kết nối được” → Anki chưa mở hoặc chưa cài AnkiConnect
- “modelFieldNames error” → note type bạn chọn không tồn tại / AnkiConnect lỗi
- “addNotes error” → xem message cụ thể, thường do field mapping sai hoặc AnkiConnect bị chặn

---

## 7) Cập nhật / nâng cấp về sau

Khi bạn có bản custom mới:
- Chỉ cần copy đè 2 file trang quản lý:
  - `vocab_manager.html`
  - `vocab_manager.js`
- Và/hoặc file popup:
  - `popup2.js`
- Nếu có thay đổi quyền hoặc đường dẫn → copy đè `manifest.json`

Sau đó vào:
- `edge://extensions` → extension custom → **Reload**

---

## 8) FAQ nhanh

### Q1: Vì sao không mở được `vocab_manager.html`?
- Kiểm tra `manifest.json` đã khai báo web accessible / action đúng chưa
- Đảm bảo file `vocab_manager.html` nằm cùng thư mục với manifest
- Reload extension

### Q2: Vì sao Save không lưu đủ nghĩa/ví dụ?
- Cần đảm bảo code popup đã lấy đúng DOM selectors theo popup ENVI.
- Nếu ENVI đổi UI, bạn cần cập nhật selector trong `popup2.js`.

### Q3: Nhập JSON có bị mất dữ liệu cũ?
- Không. Cơ chế là **merge + chống trùng**; ưu tiên giữ dữ liệu cũ nếu đã có nghĩa/ví dụ.

---

## 9) Ghi chú pháp lý / trách nhiệm
- Đây là bản **custom (unofficial)**, tự bạn chịu trách nhiệm khi sử dụng.
- Khi ENVI bản store cập nhật UI/DOM, phần “Save” có thể cần chỉnh lại selector.

---

## 10) Checklist để “chạy chắc”
- [ ] Đã copy source ENVI ra thư mục riêng (không sửa trong thư mục Edge)
- [ ] Đã ghi đè `manifest.json`, `popup2.js`
- [ ] Đã thêm `vocab_manager.html`, `vocab_manager.js`
- [ ] Edge bật Developer mode + Load unpacked
- [ ] Trang quản lý mở được
- [ ] Save lưu đủ nghĩa/ví dụ
- [ ] Anki mở + AnkiConnect cài OK → Save to Anki thành công

Chúc bạn build bộ từ vựng IELTS “đã” như Quizlet nhưng mạnh như Anki 😄
