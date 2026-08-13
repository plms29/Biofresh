# BioFresh OS — Sản phẩm khả dụng tối thiểu

Phần mềm vận hành sau thu hoạch cho hợp tác xã nông sản dễ hỏng. Phạm vi bản này
chỉ xử lý **4 điểm đứt gãy thông tin** và **hỗ trợ quyết định hàng dư thừa**.

> Khách mua **không** phải người dùng BioFresh. Họ vẫn gửi đơn và tiêu chuẩn qua
> Zalo, thư điện tử, điện thoại như hiện tại. Bộ phận Bán hàng nhập vào hệ thống.
> Khách mua chỉ quét mã QR để xem **Hộ chiếu Quy trình** ở chế độ chỉ xem.

## Bốn điểm đứt gãy được giải quyết

| Đứt gãy | Cách xử lý trong sản phẩm |
| --- | --- |
| Mù thị trường | Bán hàng ghi lại đơn và tín hiệu thị trường vào một chỗ |
| Bán hàng không thấy tồn kho thật | Kho xác nhận phân loại → tồn kho có thể bán cập nhật ngay |
| Tiêu chuẩn khách mua không xuống được vườn | Tiêu chuẩn tự chuyển thành hướng dẫn hái trực quan cho ngoài vườn |
| Hàng dư thừa không được xử lý kịp | Lô con chưa phân bổ vào Phòng quyết định kèm phương án so sánh được |

## Bốn vai trò, một cơ sở dữ liệu

| Vai trò | Màn hình | Thao tác chính |
| --- | --- | --- |
| Bán hàng | `/sales` | Nhập đơn và tiêu chuẩn, nhập tín hiệu thị trường, phân bổ lô |
| Giám sát ngoài vườn | `/field` | Nhận hướng dẫn hái, cập nhật sản lượng, báo sự cố |
| Kho đóng gói / Kiểm soát chất lượng | `/packhouse` | Xác nhận nhập kho, nhập hạng thực tế, ghi 6 bước quy trình |
| Quản lý / Giám đốc HTX | `/manager` | Chốt phương án xử lý hàng dư thừa, xem điều hành, chỉnh cấu hình |

Vai trò đi theo màn hình đang mở — đứng ở màn hình kho nghĩa là đang làm việc với
tư cách kho, nên mọi thao tác đều ghi đúng người thực hiện.

Ngoài ra: `/batches` danh sách lô, `/batches/[id]` hồ sơ lô đầy đủ kèm mã QR,
`/p/[id]` Hộ chiếu Quy trình công khai cho khách mua.

## Hành trình của một lô hàng

```
ĐÃ LÊN KẾ HOẠCH → ĐANG THU HOẠCH → ĐÃ NHẬP KHO → ĐÃ KIỂM SOÁT CHẤT LƯỢNG
   → ĐÃ PHÂN BỔ / CHƯA PHÂN BỔ → QUYẾT ĐỊNH XỬ LÝ → XỬ LÝ/ĐÓNG GÓI
   → XUẤT HÀNG → ĐÓNG LÔ
```

Một lô gốc được tách thành **lô con theo hạng** (Hạng A / Hạng B / Hàng chế biến /
Hàng loại) ngay khi kho xác nhận kết quả phân loại.

## Quy trình Thực địa BioFresh — 6 bước bắt buộc

`Phân loại → Chuẩn bị dung dịch → Nhúng/Phun → Làm khô → Đóng gói → Đồng bộ dữ liệu`

Các bước phải ghi tuần tự, kèm mốc thời gian và người thực hiện. **Không thể đánh
dấu "Đã hoàn tất xử lý" nếu chưa ghi đủ 6 bước.** Đây chính là nội dung duy nhất
khách mua thấy khi quét mã QR.

## Quy tắc cảnh báo

Toàn bộ là quy tắc tường minh, **không có mô hình dự báo**:

- **Thiếu hàng cho đơn** — tồn kho khả dụng thấp hơn phần còn lại của đơn đã chốt.
- **Phân bổ vượt số lượng** — đã phân bổ nhiều hơn số lượng đơn yêu cầu.
- **Hàng dư thừa** — kg đã phân loại nhưng chưa phân bổ vượt ngưỡng HTX cấu hình.
- **Lô có rủi ro** — sắp tới hạn phải hành động (hạn = thời điểm phân loại + cửa
  sổ cấu hình của sản phẩm, do người dùng đặt).
- **Tiêu chuẩn đã cập nhật** — Bán hàng sửa tiêu chuẩn thì hướng dẫn hái tự cập
  nhật và ngoài vườn được báo.
- **Quy trình chưa hoàn tất** — lô đang xử lý mà chưa ghi đủ 6 bước.

Ngưỡng hàng dư thừa và mốc khẩn cấp chỉnh được ở `/manager` → tab Cấu hình.

## Phòng quyết định

Mỗi lô con chưa phân bổ sinh ra 5 phương án: **bán ngay / đổi kênh / bảo quản /
chế biến / giữ hàng**. Mỗi phương án hiển thị:

- **Giá trị kỳ vọng** = giá trị ròng × khả năng thực hiện được.
- Giá trị ròng, chi phí thêm, số ngày thu tiền, mức rủi ro.
- **Nguồn số liệu** — luôn truy được về đơn hàng, tín hiệu thị trường do Bán hàng
  nhập, hoặc giá tham chiếu nội bộ.

Khả năng thực hiện phản ánh việc đã có người mua xác định hay chưa. Nhờ vậy phương
án "giữ hàng" không còn trông đẹp nhất chỉ vì chưa ai trả giá. Nút **Giải thích**
diễn giải từng phương án bằng lời và so sánh với phương án tốt nhất.

Sau khi chốt, hệ thống tự tạo phân bổ tương ứng và sinh **việc cần làm** giao cho
đúng bộ phận.

## Ngoài phạm vi bản này — KHÔNG xây

- Ứng dụng hay tài khoản riêng cho khách mua.
- Thị giác máy tính tự động phân loại trái cây.
- Dự báo vệ tinh, dịch bệnh, sản lượng.
- Mô hình trí tuệ nhân tạo dự báo thời gian tươi còn lại.
- Kết nối dữ liệu trực tiếp với hệ thống bán hàng của siêu thị.
- Quản trị nông trại và tính lương đầy đủ.

## Chạy dự án

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Dữ liệu trình diễn được nạp tự động và lưu ở
`localStorage` của trình duyệt — chưa cần máy chủ hay biến môi trường nào. Nút
**Đặt lại dữ liệu** ở cuối cột điều hướng nạp lại bộ dữ liệu gốc.

```bash
npm run build   # dựng bản phát hành
npx eslint src  # kiểm tra mã
npx tsc --noEmit
```

## Cấu trúc mã

```
src/
  app/(app)/          màn hình theo vai trò + danh sách/hồ sơ lô
  app/p/[id]/         Hộ chiếu Quy trình công khai (không lộ dữ liệu nội bộ)
  lib/domain/         quy tắc nghiệp vụ thuần: tồn kho, cảnh báo, quyết định,
                      hướng dẫn hái, quy trình 6 bước
  store/use-biofresh  trạng thái dùng chung (zustand + persist)
  components/         giao diện theo vai trò và các khối dùng chung
```

Quy tắc nghiệp vụ nằm tách trong `lib/domain` và không phụ thuộc giao diện — khi
thay `localStorage` bằng cơ sở dữ liệu thật thì phần này giữ nguyên.
