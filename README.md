# 因式鍊金術 Factor Alchemy

俾香港中二學生溫習因式分解嘅 3D 卡牌網頁遊戲，以《鋼之鍊金術師》做主題（等價交換、鍊成陣、賢者之石、真理之門）。
支援 Chromebook、iPad 同手機瀏覽器（橫向）。純靜態網站，唔需要 build step，可以直接部署去 Netlify。
學生嘅遊戲記錄會經 Google Apps Script 寫入 Google Sheet。

> 美術全部係原創（程式畫嘅鍊成陣、齒輪、機械鎧紋理），冇用原作角色樣貌、官方 logo 或截圖；角色只用名字同原創出場對白。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 遊戲本身（所有程式碼都喺入面）。頂部嘅 `window.CONFIG` 係老師設定同牌組。 |
| `Code.gs` | Google Apps Script 後端，將記錄寫入 Google Sheet。 |
| `netlify.toml` | Netlify 設定（publish 根目錄，冇 build command）。 |
| `2ab-bomb-squad/index.html` | 之前放喺根目錄嘅《2ab 拆彈小隊》，搬咗入子資料夾，網址係 `/2ab-bomb-squad/`。 |

外部資源只用 CDN：Three.js 0.160.0（WebGL + `CSS3DRenderer`）、KaTeX 0.16.11、Google Fonts（Noto Serif TC、EB Garamond）。冇用 Firebase，冇外部音檔（音效全部用 WebAudio 即場合成）。

## 部署

### 1. Google Sheet + Apps Script（遊戲記錄）

1. 開一個新嘅 Google Sheet。
2. 「擴充功能 → Apps Script」，刪走預設內容，貼入 `Code.gs` 全部內容，儲存。
3. 「部署 → 新增部署作業」，類型揀 **網頁應用程式**：
   - 執行身分：**我**
   - 存取權：**所有人**
4. 授權之後，複製網頁應用程式網址（結尾係 `/exec`）。
5. 打開 `index.html`，將網址貼入 `CONFIG.scriptUrl`：
   ```js
   scriptUrl: 'https://script.google.com/macros/s/XXXXXXXX/exec',
   ```

第一次收到記錄嗰陣，後端會自動建立「Games」同「Attempts」兩個工作表同標題列。

> 之後如果改咗 `Code.gs`，要用「管理部署作業 → 編輯 → 新版本」重新部署，網址先會用到新程式碼。

### 2. Netlify

任揀一個方法：
- **Git**：Netlify 「Add new site → Import an existing project」，揀呢個 repo，Build command 留空，Publish directory 填 `.`（`netlify.toml` 已經寫好）。
- **拖放**：將成個資料夾拖去 Netlify 嘅 Deploys 頁面。

## 老師設定（`index.html` 頂部 `CONFIG`）

| 設定 | 預設 | 說明 |
| --- | --- | --- |
| `scriptUrl` | `''` | Apps Script 網址。留空嘅話記錄只會排隊儲存喺本機。 |
| `classes` | `['2A'…'2E']` | 登入畫面嘅班別下拉選單。 |
| `studentNoMin` / `studentNoMax` | `1` / `40` | 學號範圍。 |
| `nameMaxLength` | `20` | 姓名最多幾多字。 |
| `defaultRules` | `'simple'` | 預設玩法：`'simple'` 簡易或 `'full'` 進階（見下面「兩種玩法」）。 |
| `allowRuleChoice` | `true` | 學生可唔可以喺設定畫面自己揀玩法；`false` 就一律用 `defaultRules`。 |
| `winScore` | `15` | 進階玩法嘅勝利分數。 |
| `winScoreSimple` | `10` | 簡易玩法嘅勝利分數。 |
| `starsIncluded` | `[1, 2, 3]` | 包含邊幾個星級，例如只溫公因式同分組：`[1, 2]`。 |
| `points` | `{1:1, 2:2, 3:3}` | 各星級得分。 |
| `tableSize` | `4` | 桌面目標卡數量。 |
| `handStartSimple` / `handLimitSimple` | `8` / `10` | 簡易玩法起手張數同手牌上限。手牌多，湊到答案嘅機會就大（上限建議唔好超過 10，否則畫面太擠）。 |
| `handStart` / `handLimit` | `6` / `8` | 進階玩法起手張數同手牌上限。 |
| `hintsPerGame` | `3` | 每局提示次數。 |
| `reactionMs` | `{hand: 3000, snipe: 5000}` | 反應窗口長度（毫秒）。 |
| `aiThinkMs` | `[1000, 2000]` | 電腦「思考」時間。 |
| `factorDeckSize` | `60` | 因式組件卡總數。 |
| `monomialCards` | `2、3、4、5、6、x、y` | 單項式卡同張數。 |
| `trapCards` | 10 張 | 陷阱卡（非 primitive 嘅一次式，例如 `2x + 4`）。 |
| `functionCards` | 各 5 張 | 逆鍊成 `reverse`、賢者之石 `stone`、分解之手 `hand`。 |
| `targets` | 30 張 | 目標卡：`{ stars, expr, answer }`。 |
| `ai` | 三個難度 | 電腦錯過合成機率、故意交「唔最簡」機率、截胡機率同延遲等。 |

### 改目標卡

```js
{ stars: 2, expr: 'xy + 2x + 3y + 6', answer: '(x + 3)(y + 2)' },
```

- `expr` 同 `answer` 可以寫 `x^2`、`x²`、`-`、`−`；`answer` 只可以係因式相乘，例如 `3x(x - 2)`、`2(x + 2)(x - 2)`、`(x + 3)^2`。
- 一次因式卡會由所有（包含星級嘅）標準答案自動生成，所以加目標卡唔使另外加因式卡。

### 啟動時自動驗證

遊戲一開就會檢查以下幾點，有錯會 throw error，畫面會顯示邊張卡出錯：
1. 每張目標卡嘅標準答案展開之後同目標一致。
2. 每個因式都係 primitive（係數 gcd = 1，首項係數正數），而且只係單項式或者一次式。
3. 牌組夠湊齊每一張目標卡（包括常數，例如 6 可以用 6 或者 2 × 3）。
4. 陷阱卡真係非 primitive。

## 兩種玩法

| | 簡易（預設） | 進階 |
| --- | --- | --- |
| 功能卡（逆鍊成、賢者之石、分解之手） | 冇 | 有 |
| 乘積錯 | 卡退返手，回合結束 | 卡退返手，仲要棄 1 張做代價 |
| 唔最簡（用咗陷阱卡） | 只棄走嗰張陷阱卡，並話你知應該點拆 | 5 秒截胡窗口，合成者出嘅卡全部棄掉 |
| 正確 | 即刻得分 | 先有 3 秒「分解之手」反應窗口 |
| 換牌 | 揀 1 張卡再按「換走呢張 · 結束回合」 | 「棄一抽一」掣 |
| 起手 / 手牌上限 | 8 張 / 10 張（滿咗就唔抽牌） | 6 張 / 8 張（超過要揀卡棄） |
| 勝利分數 | `winScoreSimple`（10） | `winScore`（15） |

第一次玩簡易玩法會自動彈出「點樣玩」說明，右上角 ? 掣隨時再睇。記錄入面 `rules` 欄會寫低用咗邊種玩法。

## 遊戲規則摘要（進階玩法）

- **開局**：揀 2 人或 4 人（1 個真人，其餘係電腦）、電腦難度、角色。桌面翻 4 張目標卡，每人起手 6 張因式組件卡；之後功能卡先洗入抽牌堆。
- **每個回合**：抽 1 張 →（可以）用逆鍊成 →（可以）揀 1 張目標 + 幾張手牌按「鍊成！」→ 冇鍊成可以「棄一抽一」→ 手牌上限 8 張。
- **合成判定**
  - 乘積錯：「等價交換失敗」，卡退返手，要棄 1 張做代價，回合結束。
  - 正確又最簡：3 秒反應窗口（分解之手），冇人打就得分。
  - 正確但唔最簡（用咗陷阱卡）：5 秒「分解不徹底！」，其他玩家可以揀一張能整除該因式 content 嘅常數卡（或賢者之石）截胡；揀錯卡就失去機會。合成者出嘅卡全部棄掉。
- **最簡因式組合**：乘積等於目標；每張一次因式 primitive；次序唔影響；重複因式出兩張；常數可以拆（6 = 2 × 3）。
- **功能卡**：逆鍊成（一次因式 +/− 互換）、賢者之石（當任意正整數常數）、分解之手（反應窗口強制展開，目標卡碎裂後退返桌面，合成者補抽同樣數量）。
- **真理之門**：一整輪冇人成功，換走桌面最舊嘅目標卡。
- **勝利**：先夠 15 分，或者目標卡用完時最高分。

## 教學功能

- 只用四種方法：提取公因式（★）、分組分解（★★）、平方差恆等式、完全平方恆等式（★★★，可以先抽公因式）。提示、驗算同檢討頁都會講明用咗邊種。
- 成功鍊成會有鍊成陣光柱、衝擊波、金色火花，再加一段「cut-in」：角色徽章、原創披風鍊金術師剪影同原創勝利對白（唔係原作角色樣貌）。撳一下畫面可以跳過。

- 每次成功合成彈出「驗算」：觀察 → 分解 → 驗算，逐步展開證明。
- 提示掣只講方法類別（公因式／分組分解／恆等式），每局 3 次。
- 完局檢討頁：所有出現過嘅目標卡同標準答案、玩家犯過嘅錯（乘積錯、唔最簡）同原因。
- 登入時揀中文 / English / 雙語，術語跟住顯示。

## 遊戲記錄

- 每局完結用 `fetch` POST（`Content-Type: text/plain;charset=utf-8`，避免 CORS preflight）。
- 中途離開（關分頁、按離開掣）用 `navigator.sendBeacon`，標記 `status: "abandoned"`。
- 傳送失敗會排隊存喺 localStorage，下次開遊戲自動重傳，成功先清除。後端用 `gameId` 去重，唔會重複寫入。

**Games 工作表（每局一行）**：gameId、receivedAt、class、studentNo、name、startTime、endTime、durationSec、players、difficulty、stars、language、character、score、rank、result（win / lose / draw / abandoned）、status（completed / abandoned）、success1–3、successTotal、wrongCount、incompleteCount、snipeSuccess、snipeMissed、destroyedCount、hintsUsed、turns、attemptCount、version、rules（simple / full）。

**Attempts 工作表（每次合成嘗試一行）**：gameId、class、studentNo、name、attemptNo、time、target、stars、cards、result（correct / wrong / incomplete / sniped / destroyed）、gameStatus。可以直接用篩選或者樞紐分析。

## 效能

- 鏡頭固定，CSS3D 只喺有變化嗰陣先重畫；燭光用 2 盞點光源；冇陰影。
- 右上角 ⚡ 掣係「簡化特效」：關閉閃電、碎片、塵埃同燭光閃爍，降低解像度。開局 4 秒內如果偵測到幀率太低會自動開啟。
- 設定（靜音、簡化特效、上次揀嘅角色）同學生資料都記喺 localStorage，所有讀寫都有 try/catch，私密瀏覽模式都玩得。

## 本機測試

因為用咗 ES module 同 import map，要經 HTTP 開，唔可以直接雙擊檔案：

```bash
python3 -m http.server 8000
# 打開 http://localhost:8000
```
