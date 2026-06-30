export function renderAdminPage() {
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>配镜网超级管理</title>
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        background: #f5f7fb;
        color: #111827;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
      }
      .layout { display: grid; grid-template-columns: 224px 1fr; min-height: 100vh; }
      aside { background: #111827; color: #d0d5dd; padding: 22px 16px; }
      .brand { color: #fff; font-size: 19px; font-weight: 800; margin-bottom: 26px; }
      .nav-item { height: 40px; display: flex; align-items: center; padding: 0 12px; border-radius: 6px; font-size: 14px; }
      .nav-item.active { background: #344054; color: #fff; }
      .content { min-width: 0; }
      header { height: 64px; display: flex; align-items: center; justify-content: space-between; padding: 0 28px; background: #fff; border-bottom: 1px solid #e5e7eb; }
      h1 { margin: 0; font-size: 20px; }
      main { display: grid; grid-template-columns: 430px 1fr; gap: 20px; padding: 24px; }
      section { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; }
      h2 { margin: 0 0 18px; font-size: 18px; }
      label { display: block; margin-bottom: 6px; color: #475467; font-size: 13px; font-weight: 600; }
      input { width: 100%; height: 38px; border: 1px solid #d0d5dd; border-radius: 6px; padding: 0 10px; font-size: 14px; }
      input[type="file"] { height: auto; padding: 8px; background: #f9fafb; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      .field { margin-bottom: 12px; }
      .hint { margin-top: 6px; color: #667085; font-size: 12px; line-height: 1.45; }
      .actions { display: flex; align-items: center; gap: 12px; margin-top: 18px; }
      button { height: 38px; border: 0; border-radius: 6px; padding: 0 16px; background: #111827; color: #fff; font-size: 14px; font-weight: 700; cursor: pointer; }
      button.secondary { background: #fff; color: #111827; border: 1px solid #d0d5dd; }
      button.danger { background: #fff; color: #b42318; border: 1px solid #fecdca; }
      .message { min-height: 20px; color: #667085; font-size: 13px; }
      .message.error { color: #b42318; }
      .message.ok { color: #087443; }
      .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 14px; }
      .count { color: #667085; font-size: 13px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #eaecf0; padding: 12px 10px; text-align: left; font-size: 13px; vertical-align: middle; }
      th { color: #667085; background: #f9fafb; font-weight: 700; }
      .cover { width: 92px; height: 54px; object-fit: contain; border: 1px solid #eaecf0; border-radius: 6px; background: #f9fafb; }
      .tag { display: inline-flex; margin: 2px; padding: 2px 6px; border-radius: 4px; background: #eef4ff; color: #3538cd; font-size: 12px; }
      .muted { color: #667085; }
      .model-cell { max-width: 240px; word-break: break-all; color: #667085; }
      @media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } aside { display: none; } main { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <div class="layout">
      <aside>
        <div class="brand">配镜网 Admin</div>
        <div class="nav-item active">商品管理</div>
      </aside>
      <div class="content">
        <header>
          <h1>超级管理后台</h1>
          <span class="muted">3D 模型在小程序 AR 试戴时实时渲染</span>
        </header>

        <main>
          <section>
            <h2>新增镜架商品</h2>
            <form id="product-form">
              <div class="grid">
                <div class="field"><label for="id">商品 ID</label><input id="id" name="id" placeholder="frame-001" /></div>
                <div class="field"><label for="name">商品名称</label><input id="name" name="name" required placeholder="轻钛商务方框" /></div>
              </div>
              <div class="grid">
                <div class="field"><label for="price">价格 元</label><input id="price" name="price" type="number" min="0" step="0.01" required placeholder="399" /></div>
                <div class="field"><label for="frameWidthMm">镜架宽度 mm</label><input id="frameWidthMm" name="frameWidthMm" type="number" min="1" required placeholder="155" /></div>
              </div>
              <div class="grid">
                <div class="field"><label for="lensWidthMm">单片宽 mm</label><input id="lensWidthMm" name="lensWidthMm" type="number" min="1" placeholder="54" /></div>
                <div class="field"><label for="bridgeWidthMm">鼻梁宽 mm</label><input id="bridgeWidthMm" name="bridgeWidthMm" type="number" min="1" placeholder="18" /></div>
              </div>
              <div class="grid">
                <div class="field"><label for="templeLengthMm">镜腿长 mm</label><input id="templeLengthMm" name="templeLengthMm" type="number" min="1" placeholder="145" /></div>
                <div class="field"><label for="color">颜色</label><input id="color" name="color" placeholder="黑色" /></div>
              </div>
              <div class="grid">
                <div class="field"><label for="material">材质</label><input id="material" name="material" placeholder="钛 / TR90" /></div>
                <div class="field"><label for="tags">标签</label><input id="tags" name="tags" placeholder="轻量,商务,大脸友好" /></div>
              </div>
              <div class="field">
                <label for="cover">参数/封面图</label>
                <input id="cover" name="cover" type="file" accept="image/*,.svg" required />
                <div class="hint">用于商品列表和详情展示，可以是带参数文字的商品图。</div>
              </div>
              <div class="field">
                <label for="frontImage">正面商品图</label>
                <input id="frontImage" name="frontImage" type="file" accept="image/*,.svg" />
                <div class="hint">建议上传白底正面图。未上传透明试戴图时，后台会用这张图自动生成在线试戴素材。</div>
              </div>
              <div class="field">
                <label for="sideImage">侧面商品图</label>
                <input id="sideImage" name="sideImage" type="file" accept="image/*,.svg" />
                <div class="hint">用于详情展示和后续侧脸/3D效果参考。</div>
              </div>
              <div class="field">
                <label for="tryOnAsset">在线试戴透明镜框图</label>
                <input id="tryOnAsset" name="tryOnAsset" type="file" accept="image/png,image/webp,.svg" />
                <div class="hint">可选。上传专业透明 PNG/SVG 时优先使用；不上传则从正面商品图自动抠出试戴素材。</div>
              </div>
              <div class="field">
                <label for="model">3D 模型文件，可选</label>
                <input id="model" name="model" type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" />
                <div class="hint">这里上传的是镜架模型文件。用户打开小程序 AR 试戴时，前端会打开摄像头并实时渲染这个模型。</div>
              </div>
              <div class="field"><label for="modelUrl">或填写 3D 模型 URL</label><input id="modelUrl" name="modelUrl" placeholder="https://example.com/frame.glb" /></div>
              <div class="grid">
                <div class="field"><label for="modelScale">模型缩放</label><input id="modelScale" name="modelScale" value="1 1 1" /></div>
                <div class="field"><label for="modelPosition">模型位置</label><input id="modelPosition" name="modelPosition" value="0 0 0" /></div>
              </div>
              <div class="field"><label for="modelRotation">模型旋转</label><input id="modelRotation" name="modelRotation" value="0 0 0" /></div>
              <div class="actions"><button type="submit">保存商品</button><button class="secondary" type="reset">清空</button><span id="message" class="message"></span></div>
            </form>
          </section>

          <section>
            <div class="toolbar"><h2>商品列表</h2><span id="count" class="count"></span></div>
            <table>
              <thead><tr><th>封面</th><th>商品</th><th>价格</th><th>尺寸</th><th>商品图</th><th>试戴素材</th><th>AR 模型</th><th>标签</th><th>操作</th></tr></thead>
              <tbody id="product-list"></tbody>
            </table>
          </section>
        </main>
      </div>
    </div>

    <script>
      const form = document.querySelector("#product-form");
      const list = document.querySelector("#product-list");
      const count = document.querySelector("#count");
      const message = document.querySelector("#message");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setMessage("正在保存...");
        try {
          const response = await fetch("/api/admin/products", { method: "POST", body: new FormData(form) });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message || "保存失败");
          setMessage("保存成功", "ok");
          form.reset();
          form.modelScale.value = "1 1 1";
          form.modelPosition.value = "0 0 0";
          form.modelRotation.value = "0 0 0";
          await loadProducts();
        } catch (error) {
          setMessage(error.message, "error");
        }
      });

      list.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-delete]");
        if (!button) return;
        const id = button.dataset.delete;
        if (!confirm("确认删除商品 " + id + "？")) return;
        const response = await fetch("/api/admin/products/" + encodeURIComponent(id), { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          setMessage(data.message || "删除失败", "error");
          return;
        }
        setMessage("删除成功", "ok");
        await loadProducts();
      });

      async function loadProducts() {
        const response = await fetch("/api/admin/products");
        const data = await response.json();
        count.textContent = data.items.length + " 个商品";
        list.innerHTML = data.items.map(renderProduct).join("");
      }

      function renderProduct(product) {
        const tags = (product.tags || []).map((tag) => '<span class="tag">' + escapeHtml(tag) + '</span>').join("");
        const modelSource = product.modelUrl && product.modelUrl.startsWith("/static/") ? "本地上传模型" : "外部模型 URL";
        return '<tr>' +
          '<td><img class="cover" src="' + product.coverUrl + '" alt="" /></td>' +
          '<td><strong>' + escapeHtml(product.name) + '</strong><br><span class="muted">' + escapeHtml(product.id) + '</span></td>' +
          '<td>¥' + (product.price / 100).toFixed(2) + '</td>' +
          '<td>' + product.frameWidthMm + 'mm<br><span class="muted">' + product.lensWidthMm + '-' + product.bridgeWidthMm + '-' + product.templeLengthMm + '</span></td>' +
          '<td class="model-cell">正面' + (product.frontImageUrl ? '已配置' : '未配置') + '<br>侧面' + (product.sideImageUrl ? '已配置' : '未配置') + '</td>' +
          '<td class="model-cell">' + (product.tryOnAssetUrl ? '已配置' : '未配置') + '</td>' +
          '<td class="model-cell">' + modelSource + '<br><span>' + escapeHtml(product.modelScale || "1 1 1") + '</span></td>' +
          '<td>' + tags + '</td>' +
          '<td><button class="danger" data-delete="' + escapeHtml(product.id) + '">删除</button></td>' +
        '</tr>';
      }

      function setMessage(text, type = "") { message.textContent = text; message.className = "message " + type; }
      function escapeHtml(value) { return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
      loadProducts().catch((error) => setMessage(error.message, "error"));
    </script>
  </body>
</html>`;
}
