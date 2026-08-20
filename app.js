// ===== app.js =====
// 日曆 LIFF 前端程式

// LINE User ID
let userId = '';

// ===== 頁面初始化 =====

document.addEventListener('DOMContentLoaded', async function () {
  try {
    // 初始化 LINE LIFF
    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    // 尚未登入 LINE 時要求登入
    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    // 取得 LINE 使用者資料
    const profile = await liff.getProfile();
    userId = profile.userId;

    console.log('LINE User ID:', userId);

    // 預設選擇今天
    selectRange('today');
  } catch (error) {
    console.error('LIFF 初始化失敗：', error);
    showMessage('LIFF 初始化失敗，請重新開啟。');
    showDebug({
      error: error.message
    });
  }
});

// ===== 選擇查詢區間 =====

function selectRange(type) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let start;
  let end;

  switch (type) {
    // 今天
    case 'today':
      start = today;
      end = today;
      break;

    // 明天
    case 'tomorrow':
      start = addDays(today, 1);
      end = start;
      break;

    // 本週：星期一～星期日
    case 'thisWeek':
      start = getMonday(today);
      end = addDays(start, 6);
      break;

    // 下週：星期一～星期日
    case 'nextWeek':
      start = addDays(getMonday(today), 7);
      end = addDays(start, 6);
      break;

    // 自訂日期
    case 'custom':
      return;

    default:
      return;
  }

  // 設定開始與結束日期
  setDateValue('startDate', start);
  setDateValue('endDate', end);
  showMessage('');
}

// ===== 取得星期一 =====

function getMonday(date) {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  result.setDate(result.getDate() + diff);
  return result;
}

// ===== 日期加減 =====

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===== 設定日期輸入框 =====

function setDateValue(id, date) {
  const input = document.getElementById(id);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // input[type="date"] 使用 yyyy-MM-dd
  input.value = `${year}-${month}-${day}`;

  // 更新星期
  updateDateText(id);
}

// ===== 更新日期星期 =====

function updateDateText(id) {
  const input = document.getElementById(id);
  const text = document.getElementById(id + 'Text');

  if (!input.value) {
    text.textContent = '';
    return;
  }

  const date = new Date(input.value + 'T00:00:00');

  const weekNames = [
    '日',
    '一',
    '二',
    '三',
    '四',
    '五',
    '六'
  ];

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  // 顯示格式：2026/08/20 (四)
  text.textContent =
    `${year}/${month}/${day} (${weekNames[date.getDay()]})`;
}

// ===== 開始日期變更 =====

document.getElementById('startDate').addEventListener('change', function () {
  updateDateText('startDate');
});

// ===== 結束日期變更 =====

document.getElementById('endDate').addEventListener('change', function () {
  updateDateText('endDate');
});

// ===== 查詢日曆 =====

async function searchCalendar() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const searchButton = document.getElementById('searchButton');

  // 清除上一筆除錯資訊
  showDebug('');

  // 尚未取得 LINE User ID
  if (!userId) {
    showMessage('尚未取得 LINE User ID。');
    return;
  }

  // 未選擇日期
  if (!startDate || !endDate) {
    showMessage('請選擇日期。');
    return;
  }

  // 結束日期不可早於開始日期
  if (startDate > endDate) {
    showMessage('結束日期不能早於開始日期。');
    return;
  }

  // 顯示查詢中
  showMessage('查詢中...');

  // 防止重複點擊
  searchButton.disabled = true;

  try {
    // 建立送給 GAS 的資料
    const requestData = {
      action: 'searchCalendar',
      userId: userId,
      startDate: startDate,
      endDate: endDate
    };

    // 顯示送出的 JSON
    showDebug({
      request: requestData
    });

    console.log('GAS URL:', CONFIG.GAS_URL);
    console.log('Request:', requestData);

    // 呼叫 GAS
    // 使用 text/plain 避免 GitHub Pages → GAS 的 CORS preflight
    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestData)
    });

    console.log('HTTP Status:', response.status);

    // 先以文字取得 GAS 回應
    const responseText = await response.text();

    console.log('GAS Response:', responseText);

    // 顯示 GAS 原始回應
    showDebug({
      httpStatus: response.status,
      response: responseText
    });

    // HTTP 狀態錯誤
    if (!response.ok) {
      throw new Error(
        'HTTP ' + response.status + '：' + responseText
      );
    }

    let result;

    try {
      // 將 GAS 回應轉成 JSON
      result = JSON.parse(responseText);
    } catch (error) {
      // 目前 GAS 回傳 OK 時會進入這裡
      throw new Error(
        'GAS 回傳內容不是 JSON：' + responseText
      );
    }

    // 顯示解析後 JSON
    showDebug({
      httpStatus: response.status,
      result: result
    });

    console.log('GAS Result:', result);

    // GAS 回傳成功
    if (result.success) {
      showMessage(
        '✅ 查詢完成\n日曆結果已傳送到 LINE。'
      );
    } else {
      // GAS 回傳失敗
      showMessage(
        result.message || '查詢失敗。'
      );
    }
  } catch (error) {
    // 顯示實際錯誤
    console.error('日曆查詢失敗：', error);

    showMessage(
      '日曆查詢失敗：' + error.message
    );

    // 顯示錯誤資訊
    showDebug({
      error: error.message
    });
  } finally {
    // 恢復查詢按鈕
    searchButton.disabled = false;
  }
}

// ===== 顯示狀態訊息 =====

function showMessage(text) {
  document.getElementById('message').textContent = text;
}

// ===== 顯示 JSON 除錯資訊 =====

function showDebug(data) {
  const debugInfo = document.getElementById('debugInfo');

  if (!debugInfo) return;

  if (data === '') {
    debugInfo.textContent = '';
    return;
  }

  try {
    // JSON 格式化顯示
    debugInfo.textContent = JSON.stringify(data, null, 2);
  } catch (error) {
    // 無法轉 JSON 時直接顯示文字
    debugInfo.textContent = String(data);
  }
}
