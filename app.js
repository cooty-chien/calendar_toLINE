// ===== 最大查詢天數 =====
const MAX_QUERY_DAYS = 30;

// ===== 變更查詢類型 =====
function changeDateType() {
  const type = document.getElementById('dateType').value;
  const customDate = document.getElementById('customDate');

  if (type === 'custom') {
    customDate.classList.remove('hidden');

    const today = new Date();
    const todayText = formatInputDate(today);

    if (!document.getElementById('startDate').value) {
      document.getElementById('startDate').value = todayText;
    }

    if (!document.getElementById('endDate').value) {
      document.getElementById('endDate').value = todayText;
    }
  } else {
    customDate.classList.add('hidden');
  }

  updateDateRange();
}

// ===== 驗證自訂日期 =====
function validateDateRange() {
  updateDateRange();
}

// ===== 更新日期區間 =====
function updateDateRange() {
  const type = document.getElementById('dateType').value;
  const error = document.getElementById('dateError');
  const searchBtn = document.getElementById('searchBtn');
  const actualRange = document.getElementById('actualDateRange');

  error.classList.add('hidden');
  error.textContent = '';

  let range;

  try {
    range = getQueryDateRange(type);
  } catch (e) {
    searchBtn.disabled = true;
    error.textContent = e.message;
    error.classList.remove('hidden');
    actualRange.textContent = '查詢日期：尚未設定';
    return;
  }

  const start = range.start;
  const end = range.end;

  const days = calculateDays(start, end);

  actualRange.textContent =
    '查詢日期：' +
    formatDisplayDate(start) +
    ' ～ ' +
    formatDisplayDate(addDays(end, -1)) +
    '（共 ' +
    days +
    ' 天）';

  if (days > MAX_QUERY_DAYS) {
    error.textContent =
      '查詢區間最多 ' +
      MAX_QUERY_DAYS +
      ' 天，目前為 ' +
      days +
      ' 天。';

    error.classList.remove('hidden');
    searchBtn.disabled = true;
    return;
  }

  if (days <= 0) {
    error.textContent = '結束日期必須晚於或等於開始日期。';
    error.classList.remove('hidden');
    searchBtn.disabled = true;
    return;
  }

  searchBtn.disabled = false;
}

// ===== 取得查詢日期 =====
function getQueryDateRange(type) {
  const today = startOfDay(new Date());

  switch (type) {
    case 'today':
      return {
        start: today,
        end: addDays(today, 1)
      };

    case 'tomorrow':
      return {
        start: addDays(today, 1),
        end: addDays(today, 2)
      };

    case 'week': {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = addDays(today, mondayOffset);

      return {
        start: monday,
        end: addDays(monday, 7)
      };
    }

    case 'nextWeek': {
      const day = today.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const nextMonday = addDays(today, mondayOffset + 7);

      return {
        start: nextMonday,
        end: addDays(nextMonday, 7)
      };
    }

    case 'custom': {
      const startValue = document.getElementById('startDate').value;
      const endValue = document.getElementById('endDate').value;

      if (!startValue || !endValue) {
        throw new Error('請選擇開始日期與結束日期。');
      }

      const start = parseInputDate(startValue);
      const end = addDays(parseInputDate(endValue), 1);

      if (end <= start) {
        throw new Error('結束日期必須晚於或等於開始日期。');
      }

      return {
        start: start,
        end: end
      };
    }

    default:
      throw new Error('無效的查詢日期。');
  }
}

// ===== 計算日期天數 =====
function calculateDays(start, end) {
  const milliseconds = end.getTime() - start.getTime();
  return Math.round(milliseconds / 86400000);
}

// ===== 日期加減 =====
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ===== 取得當天 00:00 =====
function startOfDay(date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

// ===== input date → Date =====
function parseInputDate(value) {
  const parts = value.split('-');

  return new Date(
    Number(parts[0]),
    Number(parts[1]) - 1,
    Number(parts[2])
  );
}

// ===== Date → input date =====
function formatInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return year + '-' + month + '-' + day;
}

// ===== 顯示日期 =====
function formatDisplayDate(date) {
  const weekNames = [
    '日',
    '一',
    '二',
    '三',
    '四',
    '五',
    '六'
  ];

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return (
    month +
    '/' +
    day +
    ' (' +
    weekNames[date.getDay()] +
    ')'
  );
}
