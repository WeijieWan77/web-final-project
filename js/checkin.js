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

  function renderCheckinStatus(hasCheckedIn, consecutiveDays) {
    var statusEl = qs('#checkinStatus');
    if (!statusEl) return;
    
    if (hasCheckedIn) {
      statusEl.innerHTML = 
        '<div class="checkin-status checkin-status--success">' +
        '<span class="checkin-status__icon">✓</span>' +
        '<span class="checkin-status__text">今日已签到</span>' +
        '<span class="checkin-status__consecutive">连续 ' + consecutiveDays + ' 天</span>' +
        '</div>';
      var form = qs('#checkinForm');
      var btn = qs('#checkinBtn');
      if (form) form.style.display = 'none';
      if (btn) btn.disabled = true;
    } else {
      statusEl.innerHTML = 
        '<div class="checkin-status checkin-status--pending">' +
        '<span class="checkin-status__icon">📅</span>' +
        '<span class="checkin-status__text">今日未签到</span>' +
        '</div>';
      var form = qs('#checkinForm');
      var btn = qs('#checkinBtn');
      if (form) form.style.display = '';
      if (btn) btn.disabled = false;
    }
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

  function updateStats(userId) {
    var checkins = DataStore.getUserCheckins(userId);
    var consecutiveDays = DataStore.calculateConsecutiveDays(checkins);
    
    var consecutiveEl = qs('#consecutiveDays');
    var totalEl = qs('#totalCheckins');
    
    if (consecutiveEl) consecutiveEl.textContent = consecutiveDays;
    if (totalEl) totalEl.textContent = checkins.length;
    
    var hasCheckedIn = DataStore.hasCheckedInToday(userId);
    renderCheckinStatus(hasCheckedIn, consecutiveDays);
    
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
    
    // 更新统计数据
    updateStats(currentUser.id);
    
    // 签到表单
    var form = qs('#checkinForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        
        if (DataStore.hasCheckedInToday(currentUser.id)) {
          window.alert('今天已经签到过了');
          return;
        }
        
        var content = qs('#checkinContentInput').value.trim();
        var result = DataStore.addCheckin(currentUser.id, content);
        
        if (result.success) {
          window.alert('签到成功！连续签到 ' + result.consecutiveDays + ' 天');
          qs('#checkinContentInput').value = '';
          updateStats(currentUser.id);
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
