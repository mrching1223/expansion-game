# 部署去 Netlify（netlify.app）

因式鍊金術係純靜態網站：冇 build step，冇伺服器程式，部署完就係一條 `https://<名>.netlify.app` 網址。

> ⚠ 呢個 repo 嘅 `main` 分支同時係 GitHub Pages（`mrching1223.github.io/expansion-game`），首頁仲係《2ab 拆彈小隊》。
> 新遊戲喺 `factor-alchemy` 分支。下面兩個方法都**唔使改 `main`**，GitHub Pages 會保持原狀。

---

## 第 0 步：準備記錄網址（可以遲啲先做）

1. 開一個新 Google Sheet →「擴充功能 → Apps Script」→ 貼入 `Code.gs` → 儲存。
2. 「部署 → 新增部署作業 → 網頁應用程式」：執行身分「我」、存取權「所有人」→ 部署 → 授權。
3. 複製網址（結尾 `/exec`），貼入 `index.html` 頂部：
   ```js
   scriptUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```
4. 順手檢查 `classes`（班別）、`winScore`（勝利分數）、`starsIncluded`（星級）。

未填 `scriptUrl` 都玩得，不過記錄只會儲存喺學生部機，唔會交到 Google Sheet。

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
- [ ] 玩完（測試可以先將 `winScore` 改細，例如 `3`）→ 檢討頁顯示「記錄已交俾老師 ✓」。
- [ ] Google Sheet 出現「Games」同「Attempts」兩個工作表同一行記錄。
- [ ] 舊遊戲：`https://<名>.netlify.app/2ab-bomb-squad/` 都開到。

## 常見問題

| 情況 | 原因 / 解決 |
| --- | --- |
| 一片黑 / 卡住 | 學校網絡封鎖 `cdn.jsdelivr.net` 或 `fonts.googleapis.com`，請 IT 開放。 |
| 檢討頁顯示「暫時未能連線…」 | Apps Script 未部署成「所有人」，或者 `scriptUrl` 貼錯；記錄會儲存喺本機，下次開遊戲自動重傳。 |
| 改咗 `Code.gs` 冇反應 | Apps Script 要「管理部署作業 → 編輯 → 新版本」再部署。 |
| 改咗 `CONFIG` 學生見唔到 | 重新部署；`netlify.toml` 已設定 `index.html` 唔快取，學生重新載入就得。 |
| 畫面報「CONFIG 驗證失敗」 | 新加嘅目標卡標準答案錯，或者因式唔係 primitive，按畫面提示改返。 |
