// ===== app.js =====
// LIFF 初始化、快速日期選擇、日期驗證、GAS API 呼叫

let lineUserId = '';
let isLiffReady = false;
let isSearching = false;

// ===== 頁面載入 =====
document.addEventListener('DOMContentLoaded', function() {
  setDefaultDates();
  initializeLiff();
});

// ===== 初始化 LIFF =====
async function initializeLiff() {
  const refreshBtn = document.getElementById('refreshBtn');

  try {
    setStatus('loading', 'LIFF 初始化中...');

    if (!CONFIG || !CONFIG.LIFF_ID || !CONFIG.GAS_URL) {
      throw new Error('config.js 設定不完整');
    }

    await liff.init({
      liffId: CONFIG.LIFF_ID
    });

    console.log('LIFF 初始化完成');

    if (!liff.isLoggedIn()) {
      setStatus('loading', '正在進行 LINE 登入...');
      liff.login();
      return;
    }

    const profile = await liff.getProfile();

    lineUserId = profile.userId || '';

    if (!lineUserId) {
      throw new Error('無法取得 LINE User ID');
    }

    console.log('LINE User ID：', lineUserId);

    isLiffReady = true;

    setStatus('success', 'LINE 已連線');

    refreshBtn.disabled = false;

    validateDateRange();

  } catch (error) {
    console.error('LIFF 初始化失敗：', error);

    isLiffReady = false;

    setStatus(
      'error',
      'LIFF 初始化失敗：' + getErrorMessage(error)
    );

    validateDateRange();
  }
}

// ===== 設定預設日期 =====
// 預設為「今天」
function setDefaultDates() {
  const dateType = document.getElementById('dateType');

  dateType.value = 'today';

  applyDateType('today');
}

// ===== 快速日期選擇 =====
function changeDateType() {
  const dateType = document.getElementById('dateType').value;

  applyDateType(dateType);
}

// ===== 套用快速日期 =====
function applyDateType(type) {
  const customDate = document.getElementById('customDate');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');

  const today = startOfDay(new Date());

  customDate.classList.add('hidden');

  if (type === 'custom') {
    customDate.classList.remove('hidden');

    if (!startDate.value) {
      startDate.value = formatDateInput(today);
    }

    if (!endDate.value) {
      const defaultEnd = addDays(today, 1);
      endDate.value = formatDateInput(defaultEnd);
    }

    validateDateRange();
    return;
  }

  let start = new Date(today);
  let end = new Date(today);

  switch (type) {
    // ===== 今天 =====
    case 'today':
      start = new Date(today);
      end = addDays(today, 1);
      break;

    // ===== 明天 =====
    case 'tomorrow':
      start = addDays(today, 1);
      end = addDays(today, 2);
      break;

    // ===== 後天 =====
    case 'dayAfterTomorrow':
      start = addDays(today, 2);
      end = addDays(today, 3);
      break;

    // ===== 未來 7 天 =====
    case '7':
      start = new Date(today);
      end = addDays(today, 7);
      break;

    // ===== 未來 30 天 =====
    case '30':
      start = new Date(today);
      end = addDays(today, 30);
      break;

    default:
      start = new Date(today);
      end = addDays(today, 1);
      break;
  }

  startDate.value = formatDateInput(start);
  endDate.value = formatDateInput(end);

  validateDateRange();
}

// ===== 日期區間驗證 =====
function validateDateRange() {
  const startInput = document.getElementById('startDate');
  const endInput = document.getElementById('endDate');
  const searchBtn = document.getElementById('searchBtn');
  const dateRangeInfo = document.getElementById('dateRangeInfo');
  const dateError = document.getElementById('dateError');

  const startValue = startInput.value;
  const endValue = endInput.value;

  dateError.classList.add('hidden');

  if (!startValue || !endValue) {
    dateRangeInfo.textContent = '查詢期間：尚未選擇';
    searchBtn.disabled = true;
    return false;
  }

  const start = parseDate(startValue);
  const end = parseDate(endValue);

  // ===== 結束日期不可早於開始日期 =====
  if (end < start) {
    dateRangeInfo.textContent = '查詢期間：日期錯誤';
    dateError.textContent = '結束日期不能早於開始日期。';
    dateError.classList.remove('hidden');
    searchBtn.disabled = true;
    return false;
  }

  // ===== 計算日期區間 =====
  const diff = end.getTime() - start.getTime();
  const days = Math.round(diff / 86400000);

  // ===== 不允許 0 天 =====
  if (days <= 0) {
    dateRangeInfo.textContent = '查詢期間：請選擇至少 1 天';
    dateError.textContent = '請選擇有效的查詢日期區間。';
    dateError.classList.remove('hidden');
    searchBtn.disabled = true;
    return false;
  }

  // ===== 最多 30 天 =====
  if (days > 30) {
    dateRangeInfo.textContent =
      '查詢期間：' +
      formatDisplayDate(start) +
      ' ～ ' +
      formatDisplayDate(end) +
      '，共 ' +
      days +
      ' 天';

    dateError.textContent =
      '查詢期間最多只能 30 天，目前為 ' +
      days +
      ' 天，無法查詢。';

    dateError.classList.remove('hidden');
    searchBtn.disabled = true;
    return false;
  }

  // ===== 正常日期 =====
  dateRangeInfo.textContent =
    '查詢期間：' +
    formatDisplayDate(start) +
    ' ～ ' +
    formatDisplayDate(end) +
    '，共 ' +
    days +
    ' 天';

  searchBtn.disabled = !isLiffReady || isSearching;

  return true;
}

// ===== 執行日曆查詢 =====
async function searchCalendar() {
  if (isSearching) {
    return;
  }

  if (!isLiffReady) {
    showResult(
      '查詢失敗',
      'LIFF 尚未初始化完成。'
    );
    return;
  }

  if (!validateDateRange()) {
    return;
  }

  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const searchBtn = document.getElementById('searchBtn');

  try {
    isSearching = true;

    searchBtn.disabled = true;
    searchBtn.innerHTML =
      '<span>⏳</span><span>查詢中...</span>';

    hideResult();

    const requestData = {
      action: 'searchCalendar',
      userId: lineUserId,
      startDate: startDate,
      endDate: endDate
    };

    console.log('送出資料：', requestData);

    const response = await fetch(CONFIG.GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestData)
    });

    const responseText = await response.text();

    console.log('HTTP Status：', response.status);
    console.log('GAS Response：', responseText);

    // ===== 顯示 API 回應 =====
    showDebug(responseText);

    if (!response.ok) {
      throw new Error(
        'GAS HTTP ' +
        response.status +
        '：' +
        responseText
      );
    }

    let result;

    try {
      result = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        'GAS 回傳內容不是 JSON：' +
        responseText
      );
    }

    if (!result.success) {
      throw new Error(
        result.message ||
        '日曆查詢失敗'
      );
    }

    showResult(
      '查詢完成',
      '已將 ' +
      formatDisplayDate(parseDate(startDate)) +
      ' ～ ' +
      formatDisplayDate(parseDate(endDate)) +
      ' 的行事曆結果推播到 LINE。'
    );

  } catch (error) {
    console.error('日曆查詢失敗：', error);

    showResult(
      '日曆查詢失敗',
      getErrorMessage(error)
    );

  } finally {
    isSearching = false;

    searchBtn.innerHTML =
      '<span class="search-icon">🔎</span><span>開始查詢</span>';

    validateDateRange();
  }
}

// ===== 重新整理 =====
function refreshPage() {
  window.location.reload();
}

// ===== 顯示 LIFF 狀態 =====
function setStatus(type, message) {
  const status = document.getElementById('status');
  const text = status.querySelector('.status-text');

  status.className = 'status';

  if (type === 'success') {
    status.classList.add('status-success');
  } else if (type === 'error') {
    status.classList.add('status-error');
  } else {
    status.classList.add('status-loading');
  }

  text.textContent = message;
}

// ===== 顯示查詢結果 =====
function showResult(title, message) {
  const panel = document.getElementById('resultPanel');
  const titleElement = document.getElementById('resultTitle');
  const messageElement = document.getElementById('resultMessage');

  titleElement.textContent = title;
  messageElement.textContent = message;

  panel.classList.remove('hidden');
}

// ===== 隱藏查詢結果 =====
function hideResult() {
  document.getElementById('resultPanel').classList.add('hidden');
}

// ===== 顯示 Debug =====
function showDebug(text) {
  const panel = document.getElementById('debugPanel');
  const debugText = document.getElementById('debugText');

  debugText.textContent = text;
  panel.classList.remove('hidden');
}

// ===== Debug 收合 =====
function toggleDebug() {
  const panel = document.getElementById('debugPanel');

  panel.classList.toggle('hidden');
}

// ===== yyyy-MM-dd → Date =====
function parseDate(value) {
  const parts = value.split('-');

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

// ===== Date → yyyy-MM-dd =====
function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0');
  const day = String(
    date.getDate()
  ).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

// ===== Date → MM/dd =====
function formatDisplayDate(date) {
  return String(
    date.getMonth() + 1
  ).padStart(2, '0') +
    '/' +
    String(
      date.getDate()
    ).padStart(2, '0');
}

// ===== 日期加減 =====
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===== 取得當天 00:00:00 =====
function startOfDay(date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

// ===== 取得錯誤訊息 =====
function getErrorMessage(error) {
  if (!error) {
    return '未知錯誤';
  }

  if (error.message) {
    return error.message;
  }

  return String(error);
}
