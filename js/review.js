// review.js - 年度回顾逻辑

(function (window, document, DataStore, Auth, Render) {
  if (!DataStore || !Auth) return;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function getPageKey() {
    var body = document.body;
    return body ? body.getAttribute('data-page') : '';
  }

  function getMonthName(month) {
    var months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    return months[month] || '';
  }

  function renderYearSelect(currentYear) {
    var selectEl = qs('#yearSelect');
    if (!selectEl) return;
    
    var current = new Date().getFullYear();
    var html = '';
    for (var year = current; year >= current - 2; year--) {
      html += '<option value="' + year + '"' + (year === currentYear ? ' selected' : '') + '>' + year + '年</option>';
    }
    selectEl.innerHTML = html;
    
    selectEl.addEventListener('change', function () {
      var year = parseInt(selectEl.value, 10);
      renderReview(year);
    });
  }

  function renderReview(year) {
    var currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      window.alert('请先登录后再查看年度回顾');
      window.location.href = 'login.html';
      return;
    }
    
    var stats = DataStore.getUserYearStats(currentUser.id, year);
    var contentEl = qs('#reviewContent');
    var yearEl = qs('#reviewYear');
    
    if (yearEl) yearEl.textContent = year;
    
    if (!contentEl) return;
    
    var html = '';
    
    // 总体统计
    html += '<div class="review-section review-section--hero">' +
            '<div class="review-hero">' +
            '<div class="review-hero__title">这一年，你发布了</div>' +
            '<div class="review-hero__number">' + stats.postsCount + '</div>' +
            '<div class="review-hero__subtitle">条动态</div>' +
            '</div>' +
            '<div class="review-stats-grid">' +
            '<div class="review-stat-card">' +
            '<div class="review-stat-card__value">' + stats.commentsCount + '</div>' +
            '<div class="review-stat-card__label">评论数</div>' +
            '</div>' +
            '<div class="review-stat-card">' +
            '<div class="review-stat-card__value">' + stats.totalLikes + '</div>' +
            '<div class="review-stat-card__label">获赞数</div>' +
            '</div>' +
            '<div class="review-stat-card">' +
            '<div class="review-stat-card__value">' + stats.checkinsCount + '</div>' +
            '<div class="review-stat-card__label">签到天数</div>' +
            '</div>' +
            '</div>' +
            '</div>';
    
    // 热门标签
    if (stats.topTags && stats.topTags.length > 0) {
      html += '<div class="review-section">' +
              '<h2 class="review-section__title">🏷️ 你的热门标签</h2>' +
              '<div class="review-tags">' +
              stats.topTags.map(function (item) {
                return '<span class="review-tag">' + Render.escapeHTML(item.tag) + ' <span class="review-tag__count">' + item.count + '</span></span>';
              }).join('') +
              '</div>' +
              '</div>';
    }
    
    // 最活跃月份
    if (stats.mostActiveMonth !== null) {
      html += '<div class="review-section">' +
              '<h2 class="review-section__title">📅 最活跃的月份</h2>' +
              '<div class="review-month">' +
              '<div class="review-month__name">' + getMonthName(stats.mostActiveMonth) + '</div>' +
              '<div class="review-month__hint">这个月你发布了 ' + (stats.postsCount > 0 ? Math.round(stats.postsCount / 12) : 0) + ' 条动态</div>' +
              '</div>' +
              '</div>';
    }
    
    // 空状态
    if (stats.postsCount === 0 && stats.commentsCount === 0 && stats.checkinsCount === 0) {
      html = '<div class="review-empty">' +
             '<p class="review-empty__text">这一年还没有太多活动记录</p>' +
             '<p class="review-empty__hint">快去发布动态、评论互动、打卡签到吧！</p>' +
             '</div>';
    }
    
    contentEl.innerHTML = html;
  }

  function initReviewPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'review') return;
    
    var currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      window.alert('请先登录后再查看年度回顾');
      window.location.href = 'login.html';
      return;
    }
    
    var currentYear = new Date().getFullYear();
    renderYearSelect(currentYear);
    renderReview(currentYear);
  }

  document.addEventListener('DOMContentLoaded', function () {
    initReviewPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
