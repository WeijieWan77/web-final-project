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

  function getYearCheckins(userId, year) {
    var all = DataStore.getUserCheckins(userId) || [];
    var start = new Date(year, 0, 1).getTime();
    var end = new Date(year + 1, 0, 1).getTime();
    return all.filter(function (c) {
      return c.timestamp >= start && c.timestamp < end;
    }).sort(function (a, b) { return a.timestamp - b.timestamp; });
  }

  function calculateLongestStreak(checkins) {
    if (!checkins.length) return 0;
    var streak = 1;
    var best = 1;
    for (var i = 1; i < checkins.length; i++) {
      var prev = new Date(checkins[i - 1].timestamp);
      var cur = new Date(checkins[i].timestamp);
      prev.setHours(0, 0, 0, 0);
      cur.setHours(0, 0, 0, 0);
      var diffDays = Math.round((cur - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        streak += 1;
        best = Math.max(best, streak);
      } else {
        streak = 1;
      }
    }
    return best;
  }

  function buildCards(stats, year) {
    var topTag = (stats.topTags && stats.topTags.length) ? stats.topTags[0].tag : '暂无';
    var activeMonth = stats.mostActiveMonth !== null ? getMonthName(stats.mostActiveMonth) : '暂无';
    var avgPosts = stats.postsCount ? Math.max(1, Math.round(stats.postsCount / 12)) : 0;

    return [
      { icon: '📜', label: '发布动态', value: stats.postsCount, desc: '这一年里，你的故事被记录' },
      { icon: '💬', label: '收到评论', value: stats.commentsCount, desc: '互动越多，连接越深' },
      { icon: '⭐', label: '累计获赞', value: stats.totalLikes, desc: '这些点赞属于你的高光' },
      { icon: '📅', label: '签到天数', value: stats.checkinsCount, desc: '坚持就是最好的证明' },
      { icon: '🏷️', label: '年度热词', value: topTag, desc: '最常被提及的标签' },
      { icon: '🔥', label: '最活跃月份', value: activeMonth, desc: '这一月你最活跃' },
      { icon: '📈', label: '月均动态', value: avgPosts, desc: '平均每月分享次数' },
      { icon: '🕒', label: '年份', value: year, desc: '让这一年的轨迹更清晰' },
    ];
  }

  function renderCards(stats, year) {
    var container = qs('#reviewCards');
    var skeleton = qs('#reviewSkeleton');
    if (!container) return;

    if (skeleton) skeleton.style.display = 'none';

    var cards = buildCards(stats, year);
    var html = cards.map(function (c) {
      return (
        '<article class="review-card">' +
        '<div class="review-card__icon">' + c.icon + '</div>' +
        '<div>' +
        '<div class="review-card__label">' + c.label + '</div>' +
        '<div class="review-card__value">' + Render.escapeHTML(String(c.value)) + '</div>' +
        '<div class="review-card__desc">' + c.desc + '</div>' +
        '</div>' +
        '</article>'
      );
    }).join('');

    container.innerHTML = html;
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
    var scrollerEl = qs('#reviewScroller'); // 新版滚屏容器
    var contentEl = qs('#reviewContent');   // 兼容旧容器（已不再使用）
    var yearEl = qs('#reviewYear');
    var heroSubtitle = qs('#reviewHeroSubtitle');
    
    if (yearEl) yearEl.textContent = year;
    
    if (!scrollerEl) return;
    
    // 更新头部副标题
    if (heroSubtitle) {
      if (stats.postsCount + stats.commentsCount + stats.checkinsCount === 0) {
        heroSubtitle.textContent = '这一年还没有太多活动，明年一起创造更多瞬间吧。';
      } else if (stats.postsCount > 20) {
        heroSubtitle.textContent = '高能创作者！你的分享点亮了校园动态。';
      } else {
        heroSubtitle.textContent = '每一次记录，都是成长的轨迹。';
      }
    }

    // 准备年度签到数据（用于高光/习惯等）
    var yearCheckins = getYearCheckins(currentUser.id, year);
    var longestStreak = calculateLongestStreak(yearCheckins);

    // 渲染卡片区
    renderCards(stats, year);

    // 构建滚屏叙事 HTML
    var html = '';
    var topTag = (stats.topTags && stats.topTags.length) ? stats.topTags[0].tag : '暂无';
    var activeMonth = stats.mostActiveMonth !== null ? getMonthName(stats.mostActiveMonth) : '暂无';

    html += `
      <section class="review-slide review-slide--intro" data-scene="intro">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>Annual Recap</div>
          <div class="review-slide__title" data-animate>这是你的 ${year}</div>
          <div class="review-slide__number" data-count="${stats.postsCount + stats.commentsCount + stats.checkinsCount}" data-animate>0</div>
          <p class="review-slide__subtitle" data-animate class="delay-2">这一年，数据会为你讲述故事。</p>
        </div>
      </section>

      <section class="review-slide review-slide--effort" data-scene="effort">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>勤奋篇</div>
          <div class="review-slide__title" data-animate>你比想象中更坚持</div>
          <div class="review-slide__grid">
            <div class="review-pill" data-animate>
              <div class="review-pill__label">签到天数</div>
              <div class="review-pill__value review-slide__number" data-count="${stats.checkinsCount}">0</div>
            </div>
            <div class="review-pill" data-animate class="delay-1">
              <div class="review-pill__label">动态发布</div>
              <div class="review-pill__value review-slide__number" data-count="${stats.postsCount}">0</div>
            </div>
          </div>
          <p class="review-slide__subtitle" data-animate class="delay-2">每一次坚持，都在积累你的成长曲线。</p>
        </div>
      </section>

      <section class="review-slide review-slide--achievement" data-scene="achievement">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>成就篇</div>
          <div class="review-slide__title" data-animate>每一分努力都算数</div>
          <div class="review-slide__grid">
            <div class="review-pill" data-animate>
              <div class="review-pill__label">获赞数</div>
              <div class="review-pill__value review-slide__number" data-count="${stats.totalLikes}">0</div>
            </div>
            <div class="review-pill" data-animate class="delay-1">
              <div class="review-pill__label">评论互动</div>
              <div class="review-pill__value review-slide__number" data-count="${stats.commentsCount}">0</div>
            </div>
          </div>
          <p class="review-slide__subtitle" data-animate class="delay-2">你的分享点亮了别人的校园时刻。</p>
        </div>
      </section>

      <section class="review-slide review-slide--habit" data-scene="habit">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>偏好篇</div>
          <div class="review-slide__title" data-animate>周三是你最活跃的一天</div>
          <div class="review-slide__grid">
            <div class="review-pill" data-animate>
              <div class="review-pill__label">年度热词</div>
              <div class="review-pill__value">${Render.escapeHTML(topTag)}</div>
            </div>
            <div class="review-pill" data-animate class="delay-1">
              <div class="review-pill__label">最活跃月份</div>
              <div class="review-pill__value">${Render.escapeHTML(activeMonth)}</div>
            </div>
          </div>
          <p class="review-slide__subtitle" data-animate class="delay-2">习惯在重复中生长，热爱在日常中出现。</p>
        </div>
      </section>

      <section class="review-slide review-slide--highlight" data-scene="highlight">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>高光时刻</div>
          <div class="review-slide__title" data-animate>最长连续签到</div>
          <div class="review-slide__number" data-count="${longestStreak}" data-animate>0</div>
          <p class="review-slide__subtitle" data-animate class="delay-2">这一段时间，你创造了属于自己的奇迹。</p>
        </div>
      </section>

      <section class="review-slide review-slide--summary" data-scene="summary">
        <div class="review-slide__inner">
          <div class="review-slide__eyebrow" data-animate>结语</div>
          <div class="review-slide__title" data-animate>把这一年收藏起来</div>
          <div class="review-slide__grid">
            <div class="review-pill" data-animate><div class="review-pill__label">动态</div><div class="review-pill__value">${stats.postsCount}</div></div>
            <div class="review-pill" data-animate class="delay-1"><div class="review-pill__label">评论</div><div class="review-pill__value">${stats.commentsCount}</div></div>
            <div class="review-pill" data-animate class="delay-2"><div class="review-pill__label">获赞</div><div class="review-pill__value">${stats.totalLikes}</div></div>
            <div class="review-pill" data-animate class="delay-3"><div class="review-pill__label">签到</div><div class="review-pill__value">${stats.checkinsCount}</div></div>
          </div>
          <p class="review-slide__subtitle" data-animate class="delay-4">感谢陪伴，下一年继续发光。</p>
        </div>
      </section>
    `;

    scrollerEl.innerHTML = html;

    // 隐藏 skeleton
    var skeleton = scrollerEl.querySelector('.review-scroll-skeleton');
    if (skeleton) skeleton.style.display = 'none';

    setupObserverAndCountUp();
  }

  // 计数动画
  function animateCount(el, target) {
    var duration = 1000;
    var start = 0;
    var startTime = null;
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var value = Math.floor(progress * target);
      el.textContent = value.toString();
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = target.toString();
      }
    }
    window.requestAnimationFrame(step);
  }

  function setupObserverAndCountUp() {
    var slides = document.querySelectorAll('.review-slide');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          // 触发计数动画
          entry.target.querySelectorAll('[data-count]').forEach(function (numEl) {
            if (!numEl.dataset.animated) {
              var target = parseInt(numEl.getAttribute('data-count'), 10) || 0;
              animateCount(numEl, target);
              numEl.dataset.animated = 'true';
            }
          });
        } else {
          entry.target.classList.remove('active');
        }
      });
    }, { threshold: 0.55 });

    slides.forEach(function (slide) {
      observer.observe(slide);
    });
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
