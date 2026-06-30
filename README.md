# 配镜网微信小程序原型

这是一个眼镜网上商城 + 在线试戴的 MVP 骨架，包含：

- 微信小程序原生前端
- Node.js 后端接口
- 商品列表、商品详情、购物车
- 打开摄像机拍照并生成镜架试戴预览
- 按镜架宽度 `mm` 和估算脸宽给出适配建议

## 目录

```text
.
├── backend/        # Node.js API 服务
└── miniprogram/    # 微信小程序项目
```

## 后端运行

```bash
cd backend
npm install
npm run dev
```

默认服务地址：

```text
http://localhost:32011
```

主要接口：

- `GET /api/products` 商品列表
- `GET /api/products/:id` 商品详情
- `POST /api/try-on` 拍照后生成在线试戴结果
- `POST /api/admin/products` 后台新增镜架商品

后台新增商品接口使用 `multipart/form-data`：

```bash
curl -X POST http://localhost:32011/api/admin/products \
  -F "id=frame-new" \
  -F "name=新款钛架" \
  -F "price=399" \
  -F "frameWidthMm=155" \
  -F "lensWidthMm=54" \
  -F "bridgeWidthMm=18" \
  -F "templeLengthMm=148" \
  -F "color=黑色" \
  -F "material=钛" \
  -F "tags=轻量,商务,大脸友好" \
  -F "cover=@./frame-new.png" \
  -F "modelUrl=https://你的域名/models/frame-new.glb"
```

也可以把 3D 模型文件一起上传：

```bash
-F "model=@./frame-new.glb"
```

## 小程序运行

1. 打开微信开发者工具。
2. 导入 `miniprogram` 目录。
3. 确认 `miniprogram/utils/config.js` 里的 `API_BASE_URL` 指向后端地址。
4. 启动后端后，在小程序中打开摄像机进行在线试戴。

## 在线试戴

商品详情页包含两个试戴入口：

- `在线试戴`：打开摄像机，把脸放进框内，拍照后生成试戴效果图。
- `3D 试戴`：打开摄像机，不拍照，使用微信小程序 XR-FRAME 的 Face tracker 实时把 3D 镜架模型挂在人脸上。

AR 试戴商品模型字段在 `backend/src/data/products.js`：

```js
modelUrl: "https://.../glasses.glb",
modelScale: "1 1 1",
modelPosition: "0 0 0",
modelRotation: "0 0 0"
```

每个真实镜架需要制作 `.glb/.gltf` 模型。建模时建议：

- 模型中心点放在鼻梁中间。
- 模型比例按真实镜架宽度制作。
- 镜片、镜框、镜腿分材质，方便后续做颜色切换。
- 上线时把模型放到 HTTPS CDN，并配置到 `modelUrl`。

微信开发者工具需要使用支持 XR-FRAME 的基础库，并在真机上测试前置摄像头 AR 效果。

## 试戴精度说明

普通单张照片无法直接得到真实毫米级人脸宽度，因为照片没有天然尺度。当前原型支持三种逐步增强方式：

1. 用户输入估算脸宽或已知瞳距，用于毫米比例校准。
2. 接入人脸关键点检测，自动获取脸宽、眼距、倾斜角度。
3. 引入银行卡、尺子、多角度照片或 AR 深度数据，提高真实尺寸判断。

后端已经把适配判断和试戴合成拆成独立服务，后续可以替换为 OpenCV、MediaPipe 或云端视觉模型。
