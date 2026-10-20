# Prompt tạo ảnh demo cho thiệp cưới

Website nhận **JPEG hoặc PNG**, tối đa 100 MB/ảnh và 12.000 px mỗi chiều. Nên tạo 6–8 ảnh, tỉ lệ ảnh đa dạng để album tự động trông tự nhiên.

## 1. Ảnh bìa hero — 1 ảnh ngang

```text
Elegant editorial wedding photograph, Vietnamese couple in their late twenties, Minh and An, standing together in a sunlit botanical garden, cream linen suit and champagne silk dress, soft olive foliage, warm afternoon light, natural joyful expressions, refined modern wedding editorial, muted cream olive and champagne palette, cinematic composition, clean negative space, realistic photography, no text, no watermark, horizontal 16:9
```

## 2. Khoảnh khắc chân dung — 2 ảnh dọc

```text
Romantic Vietnamese wedding portrait, a young couple laughing softly under white flowering trees, elegant minimal styling, warm film grain, olive green and ivory color palette, intimate candid moment, premium wedding magazine photography, realistic skin texture, no text, no watermark, vertical 4:5
```

```text
Editorial wedding portrait of a Vietnamese bride and groom walking hand in hand through an old French colonial street, soft morning light, understated luxury, cream and sage palette, candid movement, realistic professional photography, no text, no watermark, vertical 4:5
```

## 3. Ảnh chi tiết — 2 ảnh vuông

```text
Close-up wedding detail photograph, ivory flowers, olive leaves, handwritten vow cards, champagne rings and silk ribbon on a cream table, elegant Vietnamese wedding styling, soft window light, editorial still life, realistic photography, no text, no watermark, square 1:1
```

```text
Elegant wedding table setting in Vietnam, cream linen, olive branches, white flowers, handwritten place cards with intentionally unreadable text, warm candlelight, modern minimal luxury, realistic editorial photography, no logos, no watermark, square 1:1
```

## 4. Ảnh cảm xúc — 1–2 ảnh ngang

```text
Candid Vietnamese wedding celebration, family and close friends raising champagne glasses for the couple, warm joyful atmosphere, soft string lights, cream olive and gold palette, documentary wedding photography, authentic smiles, realistic, no text, no watermark, horizontal 3:2
```

```text
Romantic sunset wedding scene, Vietnamese newlyweds seen from behind walking toward a garden arch with warm fairy lights, gentle breeze, cinematic but realistic wedding photography, elegant cream and olive palette, no text, no watermark, horizontal 3:2
```

## Gợi ý dùng ảnh

1. Đặt ảnh vào `scripts/demo-media/`.
2. Chạy seed với `-MediaPath .\scripts\demo-media`.
3. Ảnh đầu tiên được chọn làm hero; toàn bộ ảnh được chọn làm album bản nháp.
4. Nếu muốn thay cặp đôi khác, tạo lại ảnh và chạy lại seed; không cần sửa code giao diện.