// checkin.js - 打卡签到逻辑

(function (window, document, DataStore, Auth, Render) {
  if (!DataStore || !Auth) return;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function getPageKey() {
    var body = document.body;
    return body ? body.getAttribute('data-page') : '';
  }

  function formatDate(timestamp) {
    var date = new Date(timestamp);
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, '0');
    var day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function formatTime(timestamp) {
    var date = new Date(timestamp);
    var hours = String(date.getHours()).padStart(2, '0');
    var minutes = String(date.getMinutes()).padStart(2, '0');
    return hours + ':' + minutes;
  }

  function getDateKey(ts) {
    var d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }

  function renderCheckinHistory(checkins) {
    var listEl = qs('#checkinHistoryList');
    if (!listEl) return;
    
    if (checkins.length === 0) {
      listEl.innerHTML = '<p class="checkin-history-empty">还没有签到记录</p>';
      return;
    }
    
    var html = checkins.slice(0, 30).map(function (checkin) {
      return (
        '<div class="checkin-history-item">' +
        '<div class="checkin-history-item__date">' +
        '<span class="checkin-history-item__day">' + formatDate(checkin.timestamp) + '</span>' +
        '<span class="checkin-history-item__time">' + formatTime(checkin.timestamp) + '</span>' +
        '</div>' +
        (checkin.content ? '<div class="checkin-history-item__content">' + Render.escapeHTML(checkin.content) + '</div>' : '') +
        '</div>'
      );
    }).join('');
    
    listEl.innerHTML = html;
  }

  function renderStreakHeader(checkins) {
    var consecutiveDays = DataStore.calculateConsecutiveDays(checkins);
    var consecutiveEl = qs('#consecutiveDays');
    var totalEl = qs('#totalCheckins');
    var monthEl = qs('#monthCheckins');
    var lastTextEl = qs('#lastCheckinText');
    var streakMsg = qs('#streakMessage');

    if (consecutiveEl) consecutiveEl.textContent = consecutiveDays;
    if (totalEl) totalEl.textContent = checkins.length;

    var now = new Date();
    var currentMonth = now.getMonth();
    var monthCount = checkins.filter(function (c) {
      var d = new Date(c.timestamp);
      return d.getMonth() === currentMonth && d.getFullYear() === now.getFullYear();
    }).length;
    if (monthEl) monthEl.textContent = monthCount;

    if (checkins.length > 0 && lastTextEl) {
      var last = checkins[0];
      lastTextEl.textContent = formatDate(last.timestamp);
    } else if (lastTextEl) {
      lastTextEl.textContent = '未签到';
    }

    if (streakMsg) {
      if (consecutiveDays >= 10) streakMsg.textContent = '势不可挡！你已经连续坚持了 ' + consecutiveDays + ' 天！';
      else if (consecutiveDays >= 5) streakMsg.textContent = '保持节奏，前方还有更多惊喜！';
      else streakMsg.textContent = '坚持从今天开始，打卡赢下一次成长！';
    }
  }

  function renderCalendar(checkins) {
    var calendarEl = qs('#checkinCalendar');
    var monthLabel = qs('#calendarMonthLabel');
    if (!calendarEl) return;

    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth();

    var firstDay = new Date(year, month, 1);
    var startWeekday = firstDay.getDay(); // 0-6
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // 建立一个哈希表，标记当月哪些天签到
    var checkinSet = {};
    checkins.forEach(function (c) {
      var d = new Date(c.timestamp);
      if (d.getMonth() === month && d.getFullYear() === year) {
        checkinSet[d.getDate()] = true;
      }
    });

    var cells = [];
    // 前导空白
    for (var i = 0; i < startWeekday; i++) {
      cells.push('<div class="calendar-day calendar-day--empty" aria-hidden="true"></div>');
    }

    for (var day = 1; day <= daysInMonth; day++) {
      var isToday = day === now.getDate();
      var isDone = !!checkinSet[day];
      var cls = 'calendar-day';
      if (isDone) cls += ' calendar-day--done';
      else cls += ' calendar-day--miss';
      if (isToday) cls += ' calendar-day--today';
      cells.push('<div class="' + cls + '" aria-label="日期 ' + day + '">' + day + '</div>');
    }

    calendarEl.innerHTML = cells.join('');

    if (monthLabel) {
      monthLabel.textContent = year + ' 年 ' + (month + 1) + ' 月';
    }
  }

  function renderAll(userId) {
    var checkins = DataStore.getUserCheckins(userId);
    // 按时间倒序
    checkins.sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    renderStreakHeader(checkins);
    renderCalendar(checkins);
    renderCheckinHistory(checkins);
  }

  function initCheckinPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'checkin') return;
    
    var currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      window.alert('请先登录后再进行打卡签到');
      window.location.href = 'login.html';
      return;
    }
    
    // 显示当前日期
    var dateEl = qs('#checkinDate');
    if (dateEl) {
      var today = new Date();
      var weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      dateEl.textContent = formatDate(today.getTime()) + ' ' + weekdays[today.getDay()];
    }
    
    // 渲染数据
    renderAll(currentUser.id);
    
    // 签到表单
    var form = qs('#checkinForm');
    var btn = qs('#checkinBtn');
    if (form && btn) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        if (DataStore.hasCheckedInToday(currentUser.id)) {
          window.alert('今天已经签到过了');
          return;
        }
        
        var content = qs('#checkinContentInput').value.trim();
        var result = DataStore.addCheckin(currentUser.id, content);
        
        if (result.success) {
          // 按钮动画反馈
          btn.classList.add('is-success');
          btn.textContent = '✓ 已签到';
          setTimeout(function () {
            btn.classList.remove('is-success');
            btn.textContent = '立即签到';
          }, 1200);

          qs('#checkinContentInput').value = '';
          renderAll(currentUser.id);
          DataStore.updateUserLastActiveTime(currentUser.id);
        } else {
          window.alert(result.message || '签到失败');
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    initCheckinPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
