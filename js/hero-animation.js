// hero-animation.js - 首屏 Bento Grid 动效与滚动爆炸
(function () {
  var grid = document.getElementById('heroBentoGrid');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-hero-card]'));
  var headline = grid.querySelector('.hero__card--headline');
  var exploreBtn = document.getElementById('heroExploreBtn');
  var ticking = false;
  var explodeTrigger = 420; // 滚动距离触发爆炸强度

  function clamp01(v) {
    return Math.max(0, Math.min(1, v));
  }

  function update() {
    var progress = clamp01(window.scrollY / explodeTrigger);

    cards.forEach(function (card) {
      var dx = Number(card.getAttribute('data-offset-x') || 0);
      var dy = Number(card.getAttribute('data-offset-y') || 0);
      var translateX = dx * progress;
      var translateY = dy * progress;
      var scale = 1 - progress * 0.06;
      var opacity = 1 - progress * 0.8;

      card.style.transform = 'translate3d(' + translateX + 'px,' + translateY + 'px, 0) scale(' + scale + ')';
      card.style.opacity = opacity;
    });

    if (headline) {
      var headlineScale = 1 - progress * 0.08;
      headline.style.transform = 'translate3d(0,' + -30 * progress + 'px,0) scale(' + headlineScale + ')';
      headline.style.opacity = 1 - progress * 0.6;
    }

    // 轻微调整整体倾斜，增强层次感
    var tilt = 8 - progress * 5;
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
