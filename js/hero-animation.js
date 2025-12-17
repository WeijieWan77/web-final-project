// hero-animation.js - 首屏 Bento Grid 动效与滚动爆炸
(function () {
  var grid = document.getElementById('heroBentoGrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-hero-card]'));
  var headline = grid.querySelector('.hero__card--headline');
  var exploreBtn = document.getElementById('heroExploreBtn');
  var ticking = false;
  // 调大 explodeTrigger 让 Bento 动效随滚动变化更「慢」一些
  var explodeTrigger = 1000; // 基准滚动距离，用于计算爆炸进度

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function update() {
    // 原逻辑：progress 被 clamp 到 0~1，滚到一定距离后就不再变化
    // 新逻辑：位移随滚动持续增加，透明度在一定范围内渐隐直至消失
    var raw = window.scrollY / explodeTrigger;
    var moveProgress = Math.min(raw, 3); // 限制最大位移倍数，避免过于夸张
    var fadeProgress = clamp01(raw * 1.2); // 稍快一点淡出

    cards.forEach(function (card) {
      var dx = Number(card.getAttribute('data-offset-x') || 0);
      var dy = Number(card.getAttribute('data-offset-y') || 0);
      var translateX = dx * moveProgress;
      var translateY = dy * moveProgress;
      var scale = 1 - clamp01(raw) * 0.06;
      var opacity = 1 - fadeProgress * 1.0;

      card.style.transform = 'translate3d(' + translateX + 'px,' + translateY + 'px, 0) scale(' + scale + ')';
      card.style.opacity = opacity;
    });

    if (headline) {
      var headlineScale = 1 - clamp01(raw) * 0.08;
      headline.style.transform =
        'translate3d(0,' + -30 * clamp01(raw) + 'px,0) scale(' + headlineScale + ')';
      headline.style.opacity = 1 - clamp01(raw) * 0.6;
    }

    // 轻微调整整体倾斜，增强层次感
    var tilt = 8 - clamp01(raw) * 5;
    grid.style.transform = 'rotate3d(1, -0.5, 0, ' + tilt + 'deg)';
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        update();
        ticking = false;
      });
    }
  }

  if (exploreBtn) {
    exploreBtn.addEventListener('click', function () {
      var feed = document.getElementById('postFeedContainer');
      if (feed) {
        feed.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  update();
})();
