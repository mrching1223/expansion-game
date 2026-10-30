# 部署去 Netlify（netlify.app）

因式鍊金術係純靜態網站：冇 build step，冇伺服器程式，部署完就係一條 `https://<名>.netlify.app` 網址。

> ⚠ 呢個 repo 嘅 `main` 分支同時係 GitHub Pages（`mrching1223.github.io/expansion-game`），首頁仲係《2ab 拆彈小隊》。
> 新遊戲喺 `factor-alchemy` 分支。下面兩個方法都**唔使改 `main`**，GitHub Pages 會保持原狀。

---

## 第 0 步：學生記錄（已經設定好）

成績記錄沿用「數學小島物語」嘅 Apps Script 同 Google Sheet，唔使另外設定。部署前可以順手檢查 `CONFIG` 嘅 `classes`（班別）、`defaultRules`（預設玩法）、`badgePass`（得徽章要第一次答對幾多題）。

---

## 方法 A：拖放上載（最快，約 2 分鐘）

1. 登入 <https://app.netlify.com>（可以用 GitHub / Google 帳戶）。
2. 打開 <https://app.netlify.com/drop>。
3. 將 `factor-alchemy-netlify.zip`（或者解壓後成個資料夾）拖入去。
4. 完成後會見到隨機網址，例如 `https://jolly-tanuki-123abc.netlify.app`。
5. 改名：「Site configuration → Change site name」，例如 `factor-alchemy-2b` → 網址變成 `https://factor-alchemy-2b.netlify.app`。

之後改咗 `CONFIG`：去該網站嘅「Deploys」頁，將新嘅資料夾 / zip 再拖入去就會更新。

## 方法 B：連 GitHub（之後 push 就自動更新）

1. <https://app.netlify.com> →「Add new site → Import an existing project → GitHub」。
2. 授權後揀 `mrching1223/expansion-game`。
3. 設定：
   | 欄位 | 填 |
   | --- | --- |
   | Branch to deploy | `factor-alchemy` |
   | Base directory | （留空） |
   | Build command | （留空） |
   | Publish directory | `.` |
4. 按「Deploy」。`netlify.toml` 已經寫好，Netlify 會自動讀。
5. 同方法 A 一樣可以改網站名。

之後喺 `factor-alchemy` 分支改 `index.html` 再 push，Netlify 會自動重新部署。

---

## 部署後檢查清單

- [ ] 用 Chromebook / iPad 開網址，見到羊皮紙登入畫面同燭光桌面。
- [ ] 填班別、學號、姓名、語言 → 開始一局。
- [ ] 玩一個關卡，答錯一次、答啱一次 → Google Sheet 見到 `game = factor-alchemy` 嘅 start / answer 記錄。
- [ ] 同一部機開「數學小島物語」，學生資料唔使再輸入。
- [ ] 舊遊戲：`https://<名>.netlify.app/2ab-bomb-squad/` 都開到。

## 常見問題

| 情況 | 原因 / 解決 |
| --- | --- |
| 一片黑 / 卡住 | 學校網絡封鎖 `cdn.jsdelivr.net` 或 `fonts.googleapis.com`，請 IT 開放。 |
| Google Sheet 冇記錄 | 確認學生填咗班別同學號；喺 claude.ai 預覽入面唔會傳送，要用 Netlify 網址測試。 |
| 改咗 `CONFIG` 學生見唔到 | 重新部署；`netlify.toml` 已設定 `index.html` 唔快取，學生重新載入就得。 |
| 畫面報「CONFIG 驗證失敗」 | 新加嘅目標卡標準答案錯，或者因式唔係 primitive，按畫面提示改返。 |
