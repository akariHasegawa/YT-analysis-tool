/**
 * 請求書: Gmailラベル「請求書」→ PDFをルート配下フォルダに保存 → Geminiで読取 → 請求書明細シート2行目へ挿入
 * 実行・承認・トリガーは「クライアントのGoogleアカウント」で行う（このスクリプトが紐づくブックと同一ユーザー）。
 * スクリプトプロパティ: GEMINI_API_KEY（既に設定済みならそのまま）
 */
const CONFIG = {
  LABEL_NAME: "請求書",
  ROOT_FOLDER_ID: "1f5c20L3Q0eXJGxWNuJcQl1YqHbbBVfMV",
  DETAIL_SPREADSHEET_ID: "1sDjP-35NPTOY2FERP8wawBHJMYNEqtKcgVd7Gz4NUPw",
  MASTER_SPREADSHEET_ID: "1PQANgRVfuWiyEfuwdKFJWcPLChaonuy8PyBN9XUx8Rs",
  DETAIL_SHEET_NAME: "請求書明細",
  MASTER_SHEET_NAME: "マスタ",
  GEMINI_MODEL: "gemini-2.5-flash",
  COL_COUNT: 19
};

function saveAttachmentsToDriveAndSheet() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    Logger.log("[請求書] 別実行中のためスキップ");
    return;
  }
  try {
  const raw =
    Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || "";
  const myEmail = String(raw).trim().toLowerCase();

  const detailSs = SpreadsheetApp.openById(CONFIG.DETAIL_SPREADSHEET_ID);
  const masterSs = SpreadsheetApp.openById(CONFIG.MASTER_SPREADSHEET_ID);
  const sheet =
    detailSs.getSheetByName(CONFIG.DETAIL_SHEET_NAME) || detailSs.getSheets()[0];
  const masterSheet =
    masterSs.getSheetByName(CONFIG.MASTER_SHEET_NAME) || masterSs.getSheets()[0];

  const label = GmailApp.getUserLabelByName(CONFIG.LABEL_NAME);
  if (!label) {
    throw new Error("Gmailラベル「" + CONFIG.LABEL_NAME + "」が見つかりません。");
  }

  const rootFolder = DriveApp.getFolderById(CONFIG.ROOT_FOLDER_ID);
  ensureHeaderRow_(sheet);

  const masterMap = getMasterMap_(masterSheet);
  const existingKeys = getExistingKeys_(sheet);
  const threads = label.getThreads();

  Logger.log("[請求書] myEmail=%s threads=%s", myEmail || "(空)", threads.length);

  threads.forEach(function (thread) {
    thread.getMessages().forEach(function (message) {
      const from = message.getFrom();
      const subject = (message.getSubject() || "").trim();
      const messageDate = message.getDate();
      const messageId = message.getId();
      const plainBody = message.getPlainBody() || "";

      if (shouldSkipMessage_(from, subject, myEmail)) {
        return;
      }

      const attachments = message.getAttachments({ includeInlineImages: false });
      const pdfFiles = attachments.filter(function (f) {
        return isPdfAttachment_(f.getName(), f.getContentType());
      });

      if (pdfFiles.length === 0) {
        if (isLikelyWebOrLoginInvoice_(subject, plainBody)) {
          const uniqueKey = [
            messageId,
            messageDate.getTime(),
            cleanFromName_(from),
            "WEB_OR_LOGIN_INVOICE"
          ].join("_");
          if (!existingKeys.has(uniqueKey)) {
            const row = buildRow_({
              now: new Date(),
              messageDate: messageDate,
              from: from,
              subject: subject,
              fileName: "",
              savedFileName: "",
              folderName: "",
              driveFileUrl: "",
              status: "×",
              uniqueKey: uniqueKey,
              supplier: cleanFromName_(from),
              invoiceDate: "",
              dueDate: "",
              amount: "",
              paymentMethod: "",
              category: "",
              storageMonth: Utilities.formatDate(messageDate, "Asia/Tokyo", "yyyy.MM"),
              checked: ""
            });
            insertRowAtTop_(sheet, row);
            existingKeys.add(uniqueKey);
            Logger.log("[Web/ログイン型] mid=%s", messageId);
          }
        }
        return;
      }

      pdfFiles.forEach(function (file) {
        const fileName = file.getName();
        const contentType = file.getContentType();

        const uniqueKey = [messageId, messageDate.getTime(), from, fileName, file.getSize()].join("_");
        if (existingKeys.has(uniqueKey)) {
          return;
        }

        const bytes = file.getBytes();
        const pdfBlob = Utilities.newBlob(bytes, "application/pdf", fileName);

        const supplierEarly = normalizeCompanyName_(cleanFromName_(from));
        const masterInfo0 = getMasterInfo_(masterMap, supplierEarly);
        const folderName0 =
          pickFolderName_(masterInfo0) ||
          resolveFolderName_(masterInfo0.category || "", masterInfo0.paymentMethod || "");

        let targetFolder = getOrCreateFolderByName_(rootFolder, folderName0);

        const provisional =
          Utilities.formatDate(messageDate, "Asia/Tokyo", "yyyy.MM.dd") +
          "_tmp_" +
          String(messageId).replace(/[^a-zA-Z0-9]/g, "").slice(-12) +
          ".pdf";

        let driveFile = null;
        let driveFileUrl = "";
        let savedFileName = provisional;
        let savedOk = false;

        try {
          driveFile = targetFolder.createFile(pdfBlob.copyBlob()).setName(provisional);
          driveFileUrl = driveFile.getUrl();
          savedOk = true;
          Logger.log("[Drive先保存OK] %s", provisional);
        } catch (e0) {
          Logger.log("[Drive先保存NG] %s", e0 && e0.message ? e0.message : e0);
        }

        let aiData = emptyAi_();
        try {
          aiData = extractInvoiceDataWithGemini_(pdfBlob, from, subject, messageId);
        } catch (e1) {
          Logger.log("[Gemini NG] mid=%s %s", messageId, e1 && e1.message ? e1.message : e1);
        }

        const supplier =
          normalizeCompanyName_(aiData.supplier_name) || cleanFromName_(from);
        const masterInfo = getMasterInfo_(masterMap, supplier);
        const category = masterInfo.category || "";
        const paymentMethod = masterInfo.paymentMethod || "";
        const folderName =
          pickFolderName_(masterInfo) || resolveFolderName_(category, paymentMethod);

        const invoiceDate = normalizeDateString_(aiData.invoice_date);
        const dueDate = normalizeDateString_(aiData.due_date);
        const amount = normalizeAmount_(aiData.amount);

        const storageMonth =
          buildStorageMonth_(invoiceDate) ||
          Utilities.formatDate(messageDate, "Asia/Tokyo", "yyyy.MM");

        if (folderName !== folderName0 && savedOk && driveFile) {
          try {
            const tf = getOrCreateFolderByName_(rootFolder, folderName);
            if (tf.getId() !== targetFolder.getId()) {
              driveFile.moveTo(tf);
              targetFolder = tf;
            }
          } catch (eM) {
            Logger.log("[moveTo失敗] %s", eM && eM.message ? eM.message : eM);
          }
        }

        const finalName = buildInvoiceFileName_(
          {
            invoice_date: invoiceDate,
            supplier_name: supplier,
            amount: amount
          },
          messageDate,
          from,
          fileName
        );

        if (savedOk && driveFile && finalName !== provisional) {
          try {
            driveFile.setName(finalName);
            savedFileName = finalName;
          } catch (eR) {
            Logger.log("[rename NG] %s", eR && eR.message ? eR.message : eR);
          }
        }

        const status = savedOk ? "○" : "×";
        const checked = invoiceDate || dueDate || amount ? "確認済み" : "";

        const row = buildRow_({
          now: new Date(),
          messageDate: messageDate,
          from: from,
          subject: subject,
          fileName: fileName,
          savedFileName: savedFileName,
          folderName: folderName,
          driveFileUrl: driveFileUrl,
          status: status,
          uniqueKey: uniqueKey,
          supplier: supplier,
          invoiceDate: invoiceDate,
          dueDate: dueDate,
          amount: amount,
          paymentMethod: paymentMethod,
          category: category,
          storageMonth: storageMonth,
          checked: checked
        });

        insertRowAtTop_(sheet, row);
        existingKeys.add(uniqueKey);
      });
    });
  });
  SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
}

function isLikelyWebOrLoginInvoice_(subject, plainBody) {
  const t = (String(subject || "") + "\n" + String(plainBody || "")).toLowerCase();
  const hints = [
    "ログイン",
    "login",
    "マイページ",
    "mypage",
    "ダウンロード",
    "download",
    "請求書はこちら",
    "請求書をダウンロード",
    "web請求",
    "電子請求",
    "リンクから",
    "下記url",
    "https://",
    "http://",
    "会員サイト",
    "ポータル",
    "invoice"
  ];
  for (let i = 0; i < hints.length; i++) {
    if (t.indexOf(hints[i].toLowerCase()) !== -1) {
      return true;
    }
  }
  return false;
}

function pickFolderName_(masterInfo) {
  const f = masterInfo && masterInfo.folderName ? String(masterInfo.folderName).trim() : "";
  return f || "";
}

function emptyAi_() {
  return {
    supplier_name: "",
    client_name: "",
    invoice_date: "",
    due_date: "",
    amount: ""
  };
}

function buildRow_(p) {
  const n = CONFIG.COL_COUNT;
  const row = new Array(n).fill("");
  row[0] = formatDateTime_(p.now);
  row[1] = formatDateTime_(p.messageDate);
  row[2] = cleanFromName_(p.from);
  row[3] = cleanSubject_(p.subject);
  row[4] = p.fileName || "";
  row[5] = p.savedFileName || "";
  row[6] = p.folderName || "";
  row[7] = p.driveFileUrl || "";
  row[8] = p.status === "○" || p.status === "×" ? p.status : "×";
  row[9] = p.uniqueKey || "";
  row[10] = p.supplier || "";
  row[11] = p.invoiceDate || "";
  row[12] = p.dueDate || "";
  row[13] = p.amount || "";
  row[14] = p.paymentMethod || "";
  row[15] = p.category || "";
  row[16] = p.storageMonth || "";
  row[17] = p.checked || "";
  row[18] = "";
  return row;
}

function insertRowAtTop_(sheet, row) {
  const n = CONFIG.COL_COUNT;
  if (row.length !== n) {
    throw new Error("列数不一致");
  }
  if (sheet.getLastRow() < 1) {
    ensureHeaderRow_(sheet);
  }
  sheet.insertRowAfter(1);
  sheet.getRange(2, 1, 1, n).setValues([row]);
}

function shouldSkipMessage_(from, subject, myEmail) {
  const lowerSubject = String(subject || "").toLowerCase();
  const lowerFrom = String(from || "").toLowerCase();
  const em = String(myEmail || "").trim().toLowerCase();
  if (em.indexOf("@") !== -1 && lowerFrom.indexOf(em) !== -1) {
    return true;
  }
  if (/^(re|fw|fwd):/i.test(subject || "")) {
    return true;
  }
  if (
    lowerSubject.indexOf("receipt") !== -1 ||
    lowerSubject.indexOf("領収書") !== -1 ||
    lowerSubject.indexOf("納品書") !== -1
  ) {
    return true;
  }
  return false;
}

function isPdfAttachment_(fileName, contentType) {
  const n = String(fileName || "").toLowerCase();
  const t = String(contentType || "").toLowerCase();
  return n.endsWith(".pdf") || t === "application/pdf";
}

function extractInvoiceDataWithGemini_(pdfBlob, from, subject, messageId) {
  const apiKey = PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY 未設定");
  }

  const model = CONFIG.GEMINI_MODEL || "gemini-2.5-flash";
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    model +
    ":generateContent?key=" +
    encodeURIComponent(apiKey);

  const base64Data = Utilities.base64Encode(pdfBlob.getBytes());
  const fullPrompt = buildFullExtractionPrompt_(from, subject);

  let parsed = geminiParseInvoiceJson_(url, fullPrompt, base64Data, false);
  if (!parsed) {
    Logger.log("[Gemini] schema付き再試行 mid=%s", messageId);
    parsed = geminiParseInvoiceJson_(url, fullPrompt, base64Data, true);
  }
  if (!parsed) {
    throw new Error("Gemini JSON 失敗");
  }

  let out = mapGeminiParsedToAi_(parsed);
  let amt = normalizeAmount_(out.amount);

  if (!amt) {
    const only = geminiFetchAmountOnly_(url, base64Data, messageId);
    amt = normalizeAmount_(only);
    if (amt) {
      out.amount = only;
    }
  }

  return out;
}

function buildFullExtractionPrompt_(from, subject) {
  return (
    "添付PDFは日本の請求書です。次のキーだけのJSONを1つ返す。説明文・マークダウン禁止。\n\n" +
    "supplier_name: 発行元・請求元の会社名（請求先・自社名は入れない）\n" +
    "client_name: 請求先（不要なら空）\n" +
    "invoice_date: 請求日または発行日。YYYY.MM.DD（和暦は西暦）\n" +
    "due_date: 支払期日。YYYY.MM.DD（無ければ空）\n" +
    "amount: この請求で支払う税込の最終合計に相当する金額。\n" +
    "ラベル表記は同義: 御請求金額／ご請求額／御請求額／請求金額／今回ご請求額／税込合計／合計／お支払い金額 など。\n" +
    "複数ある場合は振込総額・請求総額として最も妥当な1つ。半角数字のみ（カンマ円は除去した桁）。\n\n" +
    "差出人(参考): " +
    from +
    "\n件名(参考): " +
    subject
  );
}

function geminiResponseSchema_() {
  return {
    type: "object",
    properties: {
      supplier_name: { type: "string" },
      client_name: { type: "string" },
      invoice_date: { type: "string" },
      due_date: { type: "string" },
      amount: { type: "string" }
    },
    required: ["supplier_name", "client_name", "invoice_date", "due_date", "amount"]
  };
}

function geminiParseInvoiceJson_(url, promptText, base64Data, useSchema) {
  const gen = {
    temperature: 0,
    responseMimeType: "application/json"
  };
  if (useSchema) {
    gen.responseSchema = geminiResponseSchema_();
  }

  const payload = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inlineData: { mimeType: "application/pdf", data: base64Data } }
        ]
      }
    ],
    generationConfig: gen
  };

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText() || "";
  if (code < 200 || code >= 300) {
    Logger.log("[Gemini] HTTP %s %s", code, body.slice(0, 400));
    return null;
  }

  let text = "";
  try {
    const json = JSON.parse(body);
    const cand = json.candidates && json.candidates[0];
    text =
      cand &&
      cand.content &&
      cand.content.parts &&
      cand.content.parts[0] &&
      cand.content.parts[0].text
        ? cand.content.parts[0].text
        : "";
  } catch (e) {
    return null;
  }

  if (!text) {
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (e1) {
    try {
      const m = text.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    } catch (e2) {
      return null;
    }
  }
  return parsed;
}

function mapGeminiParsedToAi_(parsed) {
  const a = parsed && parsed.amount;
  const amountStr = a == null ? "" : String(a);
  return {
    supplier_name: normalizeCompanyName_(parsed.supplier_name || ""),
    client_name: normalizeCompanyName_(parsed.client_name || ""),
    invoice_date: parsed.invoice_date || "",
    due_date: parsed.due_date || "",
    amount: amountStr
  };
}

function geminiFetchAmountOnly_(url, base64Data, messageId) {
  const prompt =
    "この請求書PDFから、支払う税込の請求合計（最終額）に相当する金額を1つだけ選ぶ。\n" +
    "御請求金額・ご請求額・税込合計・合計など、どの表記でもよい。\n" +
    "答えは JSON のみ: {\"amount\":\"半角数字のみ\"} 。分からなければ {\"amount\":\"\"}。";

  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inlineData: { mimeType: "application/pdf", data: base64Data } }
        ]
      }
    ],
    generationConfig: {
      temperature: 0,
      responseMimeType: "application/json"
    }
  };

  const res = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const body = res.getContentText() || "";
  if (code < 200 || code >= 300) {
    Logger.log("[Gemini金額のみ] HTTP %s mid=%s", code, messageId);
    return "";
  }

  try {
    const json = JSON.parse(body);
    const cand = json.candidates && json.candidates[0];
    const text =
      cand &&
      cand.content &&
      cand.content.parts &&
      cand.content.parts[0] &&
      cand.content.parts[0].text
        ? cand.content.parts[0].text
        : "";
    if (!text) {
      return "";
    }
    const p = JSON.parse(text.replace(/```json|```/g, "").trim());
    return p.amount != null ? String(p.amount) : "";
  } catch (e) {
    Logger.log("[Gemini金額のみ] parse失敗 mid=%s", messageId);
    return "";
  }
}

function buildInvoiceFileName_(aiData, messageDate, from, originalFileName) {
  let dateStr = normalizeDateString_(aiData.invoice_date);
  if (!dateStr) {
    dateStr = Utilities.formatDate(messageDate, "Asia/Tokyo", "yyyy.MM.dd");
  }
  let supplier = normalizeCompanyName_(aiData.supplier_name);
  if (!supplier) {
    supplier = cleanFromName_(from);
  }
  supplier = sanitizeFileName_(supplier);
  let amount = normalizeAmount_(aiData.amount);
  if (!amount) {
    amount = "0";
  }
  const ext = getExtensionFromFileName_(originalFileName);
  return dateStr + "_" + supplier + "-" + amount + "." + ext;
}

function resolveFolderName_(category, paymentMethod) {
  const c = String(category || "").trim();
  const p = String(paymentMethod || "").trim();
  if (p.indexOf("カード") !== -1) {
    return "6.カード明細";
  }
  if (p.indexOf("引き落とし") !== -1 || p.indexOf("引落") !== -1) {
    return "8.引き落とし";
  }
  if (c.indexOf("外注") !== -1) {
    return "7.外注";
  }
  if (
    c.indexOf("仕入れ") !== -1 ||
    c.indexOf("仕入") !== -1 ||
    c.indexOf("材料") !== -1 ||
    c.indexOf("建築レンタル") !== -1 ||
    c.indexOf("レンタル") !== -1
  ) {
    return "3.仕入れ・材料・建築レンタル";
  }
  return "4.そのほか支払い(振込)";
}

function getOrCreateFolderByName_(parentFolder, folderName) {
  const safeName = sanitizeFolderName_(String(folderName || "未分類").trim() || "未分類");
  const it = parentFolder.getFoldersByName(safeName);
  if (it.hasNext()) {
    return it.next();
  }
  return parentFolder.createFolder(safeName);
}

function getMasterMap_(masterSheet) {
  const lastRow = masterSheet.getLastRow();
  const lastCol = masterSheet.getLastColumn();
  if (lastRow < 2) {
    return {};
  }
  const values = masterSheet.getRange(2, 1, lastRow - 1, Math.min(lastCol, 4)).getValues();
  const map = {};
  values.forEach(function (row) {
    const supplier = normalizeCompanyName_(row[0] || "");
    if (!supplier) {
      return;
    }
    map[supplier] = {
      category: String(row[1] || "").trim(),
      paymentMethod: String(row[2] || "").trim(),
      folderName: String(row[3] || "").trim()
    };
  });
  return map;
}

function getMasterInfo_(masterMap, supplierName) {
  const normalized = normalizeCompanyName_(supplierName || "");
  if (!normalized) {
    return { category: "", paymentMethod: "", folderName: "" };
  }
  if (masterMap[normalized]) {
    return masterMap[normalized];
  }
  const keys = Object.keys(masterMap);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (normalized.indexOf(key) !== -1 || key.indexOf(normalized) !== -1) {
      return masterMap[key];
    }
  }
  return { category: "", paymentMethod: "", folderName: "" };
}

function buildStorageMonth_(invoiceDateStr) {
  const s = String(invoiceDateStr || "").trim();
  const m = s.match(/(\d{4})\.(\d{2})/);
  return m ? m[1] + "." + m[2] : "";
}

function getExistingKeys_(sheet) {
  const lastRow = sheet.getLastRow();
  const set = new Set();
  if (lastRow < 2) {
    return set;
  }
  const numRows = lastRow - 1;
  sheet.getRange(2, 10, numRows, 1).getValues().forEach(function (r) {
    if (r[0]) {
      set.add(String(r[0]));
    }
  });
  return set;
}

function ensureHeaderRow_(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }
  sheet.getRange(1, 1, 1, CONFIG.COL_COUNT).setValues([
    [
      "処理日時",
      "メール日時",
      "差出人",
      "件名",
      "元ファイル名",
      "保存ファイル名",
      "保存先フォルダ",
      "Drive URL",
      "ステータス",
      "uniqueKey",
      "取引先",
      "請求日",
      "支払期日",
      "金額",
      "支払方法",
      "分類",
      "格納月",
      "確認済み",
      "詳細理由"
    ]
  ]);
}

function getExtensionFromFileName_(fileName) {
  const m = String(fileName || "").match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : "pdf";
}

function toHalfWidthDigits_(s) {
  return String(s || "").replace(/[０-９]/g, function (ch) {
    return String.fromCharCode(ch.charCodeAt(0) - 0xfee0);
  });
}

function normalizeCompanyName_(name) {
  return String(name || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateString_(value) {
  let s = toHalfWidthDigits_(String(value || "").trim());
  if (!s) {
    return "";
  }
  let m = s.match(/(20\d{2}|19\d{2})[\/\.\-年]\s*(\d{1,2})[\/\.\-月]\s*(\d{1,2})(?:日)?/);
  if (m) {
    return m[1] + "." + ("0" + m[2]).slice(-2) + "." + ("0" + m[3]).slice(-2);
  }
  m = s.match(/(20\d{2}|19\d{2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) {
    return m[1] + "." + ("0" + m[2]).slice(-2) + "." + ("0" + m[3]).slice(-2);
  }
  m = s.match(/令和\s*(\d{1,2})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) {
    const y = 2018 + parseInt(m[1], 10);
    return y + "." + ("0" + m[2]).slice(-2) + "." + ("0" + m[3]).slice(-2);
  }
  m = s.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (m) {
    return m[1] + "." + m[2] + "." + m[3];
  }
  return "";
}

function normalizeAmount_(value) {
  const s = toHalfWidthDigits_(String(value || ""));
  return s.replace(/[^\d]/g, "");
}

function sanitizeFileName_(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
}

function sanitizeFolderName_(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
}

function cleanFromName_(from) {
  return String(from || "")
    .replace(/<.*?>/g, "")
    .replace(/"/g, "")
    .trim();
}

function cleanSubject_(subject) {
  return String(subject || "").trim();
}

function formatDateTime_(date) {
  return Utilities.formatDate(date, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
}
