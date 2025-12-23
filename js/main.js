// main.js - 主业务逻辑
// 负责各页面的事件绑定与交互（以 index.html 与 detail.html 为主）

(function (window, document, DataStore, Auth, Render) {
  if (!DataStore || !Auth) return;

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function getPageKey() {
    var body = document.body;
    return body ? body.getAttribute('data-page') : '';
  }

  // --- 主题切换 ---

  function initTheme() {
    var saved = DataStore.getSavedTheme();
    if (saved) {
      document.body.setAttribute('data-theme', saved);
    }
    
    function updateThemeIcons() {
      var isDark = document.body.getAttribute('data-theme') === 'dark';
      var icons = qsa('.theme-toggle-icon');
      icons.forEach(function(icon) {
        icon.textContent = isDark ? '☀️' : '🌙';
      });
      
      // 更新 Dock 栏按钮的 label
      var dockBtnLabel = qs('#themeToggleBtnDock .app-dock__label');
      if (dockBtnLabel) {
        dockBtnLabel.textContent = isDark ? '日间模式' : '夜间模式';
      }
    }

    // 初始化图标状态
    updateThemeIcons();

    var btns = qsa('.js-theme-toggle');
    btns.forEach(function(btn) {
      btn.addEventListener('click', function () {
        var current = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        if (next === 'dark') {
          document.body.setAttribute('data-theme', 'dark');
        } else {
          document.body.removeAttribute('data-theme');
        }
        DataStore.setSavedTheme(next === 'dark' ? 'dark' : 'light');
        updateThemeIcons();
      });
    });
  }

  // --- 毛玻璃效果切换 ---

  function initGlassEffect() {
    var saved = DataStore.getSavedGlassEffect();
    if (saved === false) {
      document.body.classList.add('no-glass-effect');
    }
    
    function updateButtonState() {
      var isEnabled = !document.body.classList.contains('no-glass-effect');
      var iconNavbar = qs('#glassEffectToggleBtn .glass-effect-icon');
      var iconDock = qs('#glassEffectToggleBtnDock .app-dock__icon');
      
      if (iconNavbar) {
        iconNavbar.textContent = isEnabled ? '✨' : '🔲';
      }
      if (iconDock) {
        iconDock.textContent = isEnabled ? '✨' : '🔲';
      }
    }
    
    function toggleGlassEffect() {
      var isEnabled = !document.body.classList.contains('no-glass-effect');
      if (isEnabled) {
        document.body.classList.add('no-glass-effect');
        DataStore.setSavedGlassEffect(false);
      } else {
        document.body.classList.remove('no-glass-effect');
        DataStore.setSavedGlassEffect(true);
      }
      updateButtonState();
    }

    // 顶部导航栏按钮
    var btnNavbar = qs('#glassEffectToggleBtn');
    if (btnNavbar) {
      btnNavbar.addEventListener('click', toggleGlassEffect);
    }

    // 左侧 Dock 按钮
    var btnDock = qs('#glassEffectToggleBtnDock');
    if (btnDock) {
      btnDock.addEventListener('click', toggleGlassEffect);
    }
    
    // 初始化按钮状态
    updateButtonState();
  }

  // --- 卡片透明度切换 ---

  function initCardOpacity() {
    var saved = DataStore.getSavedCardOpacity();
    if (saved === false) {
      document.body.classList.add('no-opacity');
    }
    
    function updateButtonState() {
      var isTransparent = !document.body.classList.contains('no-opacity');
      var iconNavbar = qs('#opacityToggleBtn .opacity-toggle-icon');
      var iconDock = qs('#opacityToggleBtnDock .app-dock__icon');
      
      if (iconNavbar) {
        iconNavbar.textContent = isTransparent ? '👁️' : '🔲';
      }
      if (iconDock) {
        iconDock.textContent = isTransparent ? '👁️' : '🔲';
      }
    }
    
    function toggleCardOpacity() {
      var isTransparent = !document.body.classList.contains('no-opacity');
      if (isTransparent) {
        document.body.classList.add('no-opacity');
        DataStore.setSavedCardOpacity(false);
      } else {
        document.body.classList.remove('no-opacity');
        DataStore.setSavedCardOpacity(true);
      }
      updateButtonState();
    }

    // 顶部导航栏按钮
    var btnNavbar = qs('#opacityToggleBtn');
    if (btnNavbar) {
      btnNavbar.addEventListener('click', toggleCardOpacity);
    }

    // 左侧 Dock 按钮
    var btnDock = qs('#opacityToggleBtnDock');
    if (btnDock) {
      btnDock.addEventListener('click', toggleCardOpacity);
    }
    
    // 初始化按钮状态
    updateButtonState();
  }

  // --- 导航栏 & 用户菜单 ---

  // 导航栏滚动隐藏/显示（主要在首页使用）
  function initNavbarScroll() {
    var navbar = qs('.navbar');
    if (!navbar) {
      console.warn('导航栏元素未找到');
      return;
    }

    var pageKey = getPageKey();
    // 只在首页启用滚动隐藏/显示功能
    if (pageKey !== 'index') {
      // 其他页面保持导航栏始终可见
      navbar.classList.add('navbar--visible');
      navbar.classList.remove('navbar--hidden');
      return;
    }

    var lastScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollThreshold = 5; // 滚动阈值，避免微小滚动触发
    var ticking = false;
    var animationCompleted = false;

    // 等待动画完成后启用滚动控制
    setTimeout(function() {
      animationCompleted = true;
      // 确保初始状态正确
      navbar.classList.add('navbar--visible');
      navbar.classList.remove('navbar--hidden');
      // 移除动画，避免干扰后续的滚动控制
      navbar.style.animation = 'none';
    }, 650); // 动画时长 0.6s + 50ms 缓冲

    function handleScroll() {
      // 如果动画还没完成，不处理滚动
      if (!animationCompleted) {
        return;
      }

      if (ticking) return;
      ticking = true;

      requestAnimationFrame(function () {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        var scrollDelta = scrollTop - lastScrollTop;

        // 在页面顶部时始终显示
        if (scrollTop <= 20) {
          navbar.classList.remove('navbar--hidden');
          navbar.classList.add('navbar--visible');
          lastScrollTop = scrollTop;
          ticking = false;
          return;
        }

        // 如果滚动距离很小，不处理
        if (Math.abs(scrollDelta) < scrollThreshold) {
          ticking = false;
          return;
        }

        if (scrollDelta > 0) {
          // 向下滚动 - 隐藏导航栏
          navbar.classList.remove('navbar--visible');
          navbar.classList.add('navbar--hidden');
        } else if (scrollDelta < 0) {
          // 向上滚动 - 显示导航栏
          navbar.classList.remove('navbar--hidden');
          navbar.classList.add('navbar--visible');
        }

        lastScrollTop = scrollTop;
        ticking = false;
      });
    }

    // 立即绑定滚动事件，但会在函数内部检查动画是否完成
    window.addEventListener('scroll', handleScroll, { passive: true });
  }

  function initNavbarAuthState() {
    var currentUser = Auth.getCurrentUser();
    var avatarImg = qs('#navbarAvatarImg');
    if (avatarImg) {
      if (currentUser && currentUser.avatar) {
        avatarImg.src = currentUser.avatar;
      } else {
        avatarImg.src = 'https://api.dicebear.com/7.x/initials/svg?seed=CL';
      }
    }

    if (currentUser) {
      var menuName = qs('#menuUserName');
      var menuId = qs('#menuUserId');
      if (menuName) menuName.textContent = currentUser.nickname || currentUser.username || '同学';
      if (menuId) menuId.textContent = '@' + (currentUser.username || currentUser.id || 'user');
    }

    qsa('[data-auth-visible]').forEach(function (el) {
      var vis = el.getAttribute('data-auth-visible');
      var show = false;
      if (vis === 'guest') {
        show = !currentUser;
      } else if (vis === 'user') {
        show = !!currentUser;
      } else if (vis === 'admin') {
        show = !!currentUser && currentUser.role === 'admin';
      }
      el.style.display = show ? '' : 'none';
    });

    var userMenuToggle = qs('#userMenuToggle');
    var userDropdownMenu = qs('#userDropdownMenu');
    if (userMenuToggle && userDropdownMenu) {
      userMenuToggle.addEventListener('click', function () {
        var isOpen = userDropdownMenu.classList.contains('is-open');
        userDropdownMenu.classList.toggle('is-open', !isOpen);
        userMenuToggle.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
      });
      document.addEventListener('click', function (e) {
        if (!userDropdownMenu.classList.contains('is-open')) return;
        if (!userDropdownMenu.contains(e.target) && e.target !== userMenuToggle) {
          userDropdownMenu.classList.remove('is-open');
          userMenuToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

    var logoutBtn = qs('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function () {
        Auth.logout();
        window.location.href = 'index.html';
      });
    }
  }

  // --- 通用模态框管理 ---

  function openModal(id) {
    var modal = qs('#' + id);
    if (modal) {
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeModal(id) {
    var modal = qs('#' + id);
    if (modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function initModalTriggers() {
    qsa('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', function () {
        var id = el.getAttribute('data-close-modal');
        if (id) closeModal(id);
      });
    });
  }

  // --- 首页逻辑 index.html ---

  function initHomePage() {
    var pageKey = getPageKey();
    if (pageKey !== 'index') return;

    var posts = DataStore.getPosts();
    var users = DataStore.getUsers();
    var currentUser = Auth.getCurrentUser();

    function computeHotTopics() {
      var counter = {};
      // 排除群组动态
      posts.filter(function (p) { return !p.groupId; }).forEach(function (p) {
        (p.tags || []).forEach(function (tag) {
          counter[tag] = (counter[tag] || 0) + 1;
        });
      });
      var arr = Object.keys(counter).map(function (tag) {
        return { tag: tag, count: counter[tag] };
      });
      arr.sort(function (a, b) {
        return b.count - a.count;
      });
      return arr;
    }

    function computeActiveUsers() {
      var countByUser = {};
      // 排除群组动态
      posts.filter(function (p) { return !p.groupId; }).forEach(function (p) {
        countByUser[p.authorId] = (countByUser[p.authorId] || 0) + 1;
      });
      var active = users
        .filter(function (u) {
          return u.role !== 'admin';
        })
        .sort(function (a, b) {
          return (countByUser[b.id] || 0) - (countByUser[a.id] || 0);
        });
      return active;
    }

    // 初始化时排除群组动态（群组动态只在群组页面显示）
    var allPosts = posts.filter(function (p) {
      return !p.groupId;
    }).sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    var currentTab = 'recommend';
    var currentKeyword = '';

    function filterPosts() {
      var filtered = allPosts; // allPosts已经在初始化时排除了群组动态
      
      if (currentTab === 'following' && currentUser) {
        var ids = currentUser.following || [];
        filtered = filtered.filter(function (p) {
          return ids.indexOf(p.authorId) !== -1;
        });
      } else if (currentTab === 'following' && !currentUser) {
        filtered = [];
      }

      if (currentKeyword) {
        filtered = filtered.filter(function (p) {
          return (
            (p.content && p.content.indexOf(currentKeyword) !== -1) ||
            (Array.isArray(p.tags) && p.tags.join(' ').indexOf(currentKeyword) !== -1)
          );
        });
      }
      // 推荐 tab 默认显示所有公开动态；关注 tab 仅显示可见的（已在上面过滤）
      if (currentTab === 'recommend') {
        filtered = filtered.filter(function (p) {
          return p.visibility === 'public';
        });
      }
      return filtered;
    }

    function renderFeed() {
      var listEl = qs('#postFeedContainer');
      if (!listEl) return;
      var filtered = filterPosts();
      if (!filtered.length) {
        listEl.innerHTML = '<p style="padding: 12px; color: #999;">暂时没有可展示的动态。</p>';
        return;
      }
      // 显示骨架屏
      listEl.innerHTML = '<div class="feed-skeleton">' +
        Array(3).fill(0).map(function() {
          return '<div class="skeleton-post-card">' +
            '<div class="skeleton-post-card__header">' +
            '<div class="skeleton-avatar"></div>' +
            '<div class="skeleton-text" style="width: 120px; height: 16px;"></div>' +
            '</div>' +
            '<div class="skeleton-text" style="width: 100%; height: 60px; margin-top: 12px;"></div>' +
            '<div class="skeleton-image" style="width: 100%; height: 200px; margin-top: 12px;"></div>' +
            '</div>';
        }).join('') +
        '</div>';
      // 延迟渲染真实内容，模拟加载
      setTimeout(function() {
        listEl.innerHTML = Render.renderPostList(filtered, users, currentUser);
        // 添加鼠标跟随光斑效果
        initCardGlowEffect();
      }, 300);
    }
    
    // 鼠标跟随光斑效果
    function initCardGlowEffect() {
      var cards = qsa('.card');
      cards.forEach(function(card) {
        card.addEventListener('mousemove', function(e) {
          var rect = card.getBoundingClientRect();
          var x = ((e.clientX - rect.left) / rect.width) * 100;
          var y = ((e.clientY - rect.top) / rect.height) * 100;
          card.style.setProperty('--mouse-x', x + '%');
          card.style.setProperty('--mouse-y', y + '%');
        });
        
        card.addEventListener('mouseleave', function() {
          // 鼠标离开时，光斑淡出
          card.style.setProperty('--mouse-x', '50%');
          card.style.setProperty('--mouse-y', '50%');
        });
      });
    }

    renderFeed();

    var hotTopics = computeHotTopics();
    var hotTopicsList = qs('#hotTopicsList');
    if (hotTopicsList) {
      hotTopicsList.innerHTML = Render.renderHotTopics(hotTopics);
      // 点击话题标签进行搜索
      hotTopicsList.addEventListener('click', function (e) {
        var chip = e.target.closest('.hot-topic-chip');
        if (chip) {
          var topic = chip.getAttribute('data-topic');
          if (topic && searchInput) {
            searchInput.value = topic.replace('#', '');
            currentKeyword = topic.replace('#', '');
            renderFeed();
          }
        }
      });
    }

    var activeUsers = computeActiveUsers();
    // 为活跃用户添加 postCount 属性
    activeUsers.forEach(function(user) {
      var count = 0;
      allPosts.forEach(function(p) {
        if (p.authorId === user.id) count++;
      });
      user.postCount = count;
    });
    var activeUsersList = qs('#activeUsersList');
    if (activeUsersList) {
      activeUsersList.innerHTML = Render.renderActiveUsersList(activeUsers);
      activeUsersList.addEventListener('click', function (e) {
        var item = e.target.closest('.active-user-rank-item');
        if (item) {
          var userId = item.getAttribute('data-user-id');
          if (userId) {
            window.location.href = 'profile.html?userId=' + encodeURIComponent(userId);
          }
        }
      });
    }

    // Tab 切换逻辑 - 添加流动背景效果
    var tabsContainer = qs('.tabs');
    var tabsPill = tabsContainer && tabsContainer.classList.contains('tabs--pill') ? tabsContainer : null;
    
    function updateTabBackground(activeBtn) {
      if (!tabsPill) return;
      var tabs = qsa('.tab', tabsPill);
      var activeIndex = tabs.indexOf(activeBtn);
      if (activeIndex === -1) return;
      
      var tabWidth = activeBtn.offsetWidth;
      var tabLeft = activeBtn.offsetLeft;
      var background = tabsPill.querySelector('::before');
      
      // 使用 CSS 变量动态调整背景位置
      tabsPill.style.setProperty('--active-tab-left', tabLeft + 'px');
      tabsPill.style.setProperty('--active-tab-width', tabWidth + 'px');
    }
    
    qsa('.tabs [data-feed-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-feed-tab');
        if (tab === 'following' && !currentUser) {
          window.alert('请先登录后查看关注动态');
          return;
        }
        currentTab = tab;
        qsa('.tabs .tab').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        updateTabBackground(btn);
        renderFeed();
      });
    });
    
    // 初始化时设置第一个tab的背景位置
    var firstActiveTab = qs('.tabs .tab.is-active');
    if (firstActiveTab && tabsPill) {
      updateTabBackground(firstActiveTab);
    }

    var searchForm = qs('.navbar__search');
    var searchInput = qs('#globalSearchInput');
    if (searchForm && searchInput) {
      // Real-time search
      searchInput.addEventListener('input', function() {
        currentKeyword = searchInput.value.trim();
        renderFeed();
      });

      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        currentKeyword = searchInput.value.trim();
        renderFeed();
      });
    }

    var feedContainer = qs('#postFeedContainer');
    if (feedContainer) {
      feedContainer.addEventListener('click', function (e) {
        var actionBtn = e.target.closest('[data-action]');
        if (!actionBtn) return;
        var action = actionBtn.getAttribute('data-action');
        var card = e.target.closest('.post-card');
        if (!card) return;
        var postId = card.getAttribute('data-post-id');
        if (!postId) return;

        if (action === 'like') {
          if (!Auth.isLoggedIn()) {
            window.alert('游客暂不能点赞，请先登录～');
            window.location.href = 'login.html';
            return;
          }
          var updated = DataStore.toggleLike(postId, 1);
          if (updated) {
            var span = actionBtn.querySelector('span:nth-child(2)');
            if (span) span.textContent = updated.likes;
            // 添加点赞动画
            actionBtn.classList.add('is-liked');
            // 触发动画
            var icon = actionBtn.querySelector('span:first-child');
            if (icon) {
              icon.style.animation = 'none';
              setTimeout(function() {
                icon.style.animation = 'likeBounce 0.5s ease';
              }, 10);
            }
          }
        } else if (action === 'favorite') {
          if (!Auth.isLoggedIn()) {
            window.alert('请先登录后再收藏动态');
            window.location.href = 'login.html';
            return;
          }
          var user = Auth.getCurrentUser();
          var isFavorited = DataStore.toggleFavorite(user.id, postId);
          if (isFavorited) {
            actionBtn.classList.add('is-favorited');
            actionBtn.querySelector('span:first-child').textContent = '⭐';
          } else {
            actionBtn.classList.remove('is-favorited');
            actionBtn.querySelector('span:first-child').textContent = '☆';
          }
        } else if (action === 'repost') {
          if (!Auth.isLoggedIn()) {
            window.alert('请先登录后再转发动态');
            window.location.href = 'login.html';
            return;
          }
          var post = DataStore.getPostById(postId);
          if (!post) return;
          var author = DataStore.getUserById(post.authorId);
          var originalContentEl = qs('#repostOriginalContent');
          if (originalContentEl) {
            originalContentEl.innerHTML = 
              '<div class="repost-original__header">' +
              '<img src="' + Render.escapeHTML(author.avatar || '') + '" alt="头像" class="repost-original__avatar" />' +
              '<span class="repost-original__author">' + Render.escapeHTML(author.nickname || '未知用户') + '</span>' +
              '</div>' +
              '<div class="repost-original__content">' + Render.escapeHTML(post.content || '') + '</div>';
          }
          qs('#repostContentInput').value = '';
          qs('#repostForm').setAttribute('data-original-post-id', postId);
          openModal('repostModal');
        } else if (action === 'comment' || action === 'open-detail') {
          window.location.href = 'detail.html?id=' + encodeURIComponent(postId);
        }
      });
    }

    var openPostModalBtn = qs('#openPostModalBtn');
    if (openPostModalBtn) {
      openPostModalBtn.addEventListener('click', function () {
        if (!Auth.isLoggedIn()) {
          window.alert('请先登录后再发布动态');
          window.location.href = 'login.html';
          return;
        }
        // 加载用户群组列表
        var user = Auth.getCurrentUser();
        var groups = DataStore.getUserGroups(user.id);
        var groupSelect = qs('#postGroupSelect');
        if (groupSelect) {
          var html = '<option value="">不发布到群组</option>';
          groups.forEach(function (group) {
            html += '<option value="' + Render.escapeHTML(group.id) + '">' + Render.escapeHTML(group.name) + '</option>';
          });
          groupSelect.innerHTML = html;
        }
        openModal('postModal');
      });
    }

    var postForm = qs('#postForm');
    if (postForm) {
      postForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = Auth.getCurrentUser();
        if (!user) {
          window.alert('请先登录');
          window.location.href = 'login.html';
          return;
        }
        var content = qs('#postContentInput').value.trim();
        var imagesRaw = qs('#postImagesInput').value;
        var visibility = qs('#postVisibilitySelect').value || 'public';
        var groupId = qs('#postGroupSelect').value || '';
        if (!content) {
          window.alert('内容不能为空');
          return;
        }
        var images = imagesRaw
          .split(/\n|,/)
          .map(function (s) {
            return s.trim();
          })
          .filter(Boolean);
        var tags = (content.match(/#[^#\s]+/g) || []).slice(0, 5);
        var postData = {
          authorId: user.id,
          content: content,
          images: images,
          tags: tags,
          visibility: visibility,
        };
        if (groupId) {
          postData.groupId = groupId;
        }
        var newPost = DataStore.addPost(postData);
        // 更新用户活跃时间
        DataStore.updateUserLastActiveTime(user.id);
        closeModal('postModal');
        document.getElementById('postForm').reset();
        // 只有非群组动态才添加到allPosts（群组动态只在群组页面显示）
        if (!newPost.groupId) {
          allPosts.unshift(newPost);
        }
        renderFeed();
      });
    }

    // 转发表单处理
    var repostForm = qs('#repostForm');
    if (repostForm) {
      repostForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = Auth.getCurrentUser();
        if (!user) {
          window.alert('请先登录');
          window.location.href = 'login.html';
          return;
        }
        var originalPostId = repostForm.getAttribute('data-original-post-id');
        if (!originalPostId) return;
        var content = qs('#repostContentInput').value.trim();
        var result = DataStore.addRepost(user.id, originalPostId, content);
        if (result && result.post) {
          DataStore.updateUserLastActiveTime(user.id);
          closeModal('repostModal');
          allPosts.unshift(result.post);
          renderFeed();
          window.alert('转发成功！');
        }
      });
    }
  }

  // --- 登录页 login.html ---

  // --- 通用浮动标签与输入框逻辑 ---
  function initFloatingLabels() {
    qsa('.input-field-wrapper').forEach(function(wrapper) {
      var input = qs('input', wrapper);
      var label = qs('label', wrapper);

      function checkInput() {
        if (input.value.trim() !== '') {
          wrapper.classList.add('is-active');
        } else {
          wrapper.classList.remove('is-active');
        }
      }

      // 初始化时检查
      checkInput();

      input.addEventListener('focus', function() {
        wrapper.classList.add('is-active');
      });

      input.addEventListener('blur', function() {
        checkInput();
      });
    });
  }

  // --- 密码可见性切换函数 ---
  function setupPasswordToggle(toggleBtnId, passwordInputId) {
    var toggleBtn = qs(toggleBtnId);
    var passwordInput = qs(passwordInputId);

    if (toggleBtn && passwordInput) {
      // 初始状态为隐藏
      passwordInput.setAttribute('type', 'password');
      toggleBtn.classList.add('icon-eye-off'); // 默认显示闭眼图标

      toggleBtn.addEventListener('click', function () {
        var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleBtn.classList.toggle('icon-eye');
        toggleBtn.classList.toggle('icon-eye-off');
        toggleBtn.setAttribute('aria-label', type === 'password' ? '显示密码' : '隐藏密码');
      });
    }
  }

  // --- 登录页 login.html ---

  function initLoginPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'login') return;

    initFloatingLabels(); // 初始化浮动标签

    var remembered = Auth.getRememberedStudentId();
    var studentInput = qs('#loginStudentId');
    if (studentInput && remembered) {
      studentInput.value = remembered;
      studentInput.closest('.input-field-wrapper')?.classList.add('is-active'); // 记住我时也激活浮动标签
    }
    
    setupPasswordToggle('#togglePasswordVisibilityBtn', '#loginPassword');

    var forgotBtn = qs('#forgotPasswordBtn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', function () {
        window.alert('忘记密码请联系管理员（admin），或发送邮件至 admin@campuslife.local');
      });
    }

    var form = qs('#loginForm');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var studentId = qs('#loginStudentId').value.trim();
        var password = qs('#loginPassword').value;
        var rememberMe = !!qs('#rememberMe').checked;
        var res = Auth.login({ studentId: studentId, password: password, rememberMe: rememberMe });
        if (!res.success) {
          window.alert(res.message || '登录失败');
          return;
        }
        window.location.href = 'index.html';
      });
    }
  }

  // --- 注册页 register.html ---

  function initRegisterPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'register') return;

    initFloatingLabels(); // 初始化浮动标签
    setupPasswordToggle('#togglePasswordVisibilityBtn', '#regPassword');
    setupPasswordToggle('#toggleConfirmPasswordVisibilityBtn', '#regConfirmPassword');


    var step1Form = qs('#registerForm');
    var step2Section = qs('#registerStep2');

    var interestTagsPreset = ['#考研', '#期末周', '#运动', '#跑步', '#摄影', '#美食', '#动漫', '#游戏', '#社团', '#音乐'];
    var avatarPresets = [
      'https://api.dicebear.com/7.x/initials/svg?seed=CL-A',
      'https://api.dicebear.com/7.x/initials/svg?seed=CL-B',
      'https://api.dicebear.com/7.x/initials/svg?seed=CL-C',
      'https://api.dicebear.com/7.x/initials/svg?seed=CL-D',
    ];

    var selectedTags = [];
    var selectedAvatar = '';

    function renderInterestOptions() {
      var container = qs('#interestTagOptions');
      if (!container) return;
      container.innerHTML = interestTagsPreset
        .map(function (tag) {
          return '<button type="button" class="tag-option" data-tag="' + Render.escapeHTML(tag) + '">' + tag + '</button>';
        })
        .join('');
      container.addEventListener('click', function (e) {
        var btn = e.target.closest('.tag-option');
        if (!btn) return;
        var tag = btn.getAttribute('data-tag');
        var idx = selectedTags.indexOf(tag);
        if (idx === -1) {
          selectedTags.push(tag);
          btn.classList.add('is-selected');
        } else {
          selectedTags.splice(idx, 1);
          btn.classList.remove('is-selected');
        }
      });
    }

    function renderAvatarOptions() {
      var container = qs('#avatarOptions');
      if (!container) return;
      container.innerHTML = avatarPresets
        .map(function (url, index) {
          return (
            '<button type="button" class="avatar-option" data-avatar="' +
            Render.escapeHTML(url) +
            '"><img src="' +
            Render.escapeHTML(url) +
            '" alt="头像' +
            (index + 1) +
            '" /></button>'
          );
        })
        .join('');
      container.addEventListener('click', function (e) {
        var btn = e.target.closest('.avatar-option');
        if (!btn) return;
        selectedAvatar = btn.getAttribute('data-avatar');
        qsa('.avatar-option', container).forEach(function (el) {
          el.classList.toggle('is-selected', el === btn);
        });
      });
    }

    if (step1Form) {
      step1Form.addEventListener('submit', function (e) {
        e.preventDefault();
        var studentId = qs('#regStudentId').value.trim();
        var nickname = qs('#regNickname').value.trim();
        var password = qs('#regPassword').value;
        var confirmPassword = qs('#regConfirmPassword').value;
        var res = Auth.registerBasic({
          studentId: studentId,
          password: password,
          confirmPassword: confirmPassword,
          nickname: nickname,
        });
        if (!res.success) {
          window.alert(res.message || '注册失败');
          return;
        }
        step1Form.hidden = true;
        if (step2Section) step2Section.hidden = false;
        renderInterestOptions();
        renderAvatarOptions();
      });
    }

    var backBtn = qs('#registerBackToStep1Btn');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        if (step2Section) step2Section.hidden = true;
        if (step1Form) step1Form.hidden = false;
      });
    }

    var completeBtn = qs('#registerCompleteBtn');
    if (completeBtn) {
      completeBtn.addEventListener('click', function () {
        if (selectedTags.length < 3) {
          window.alert('请至少选择 3 个兴趣标签');
          return;
        }
        var res = Auth.completeRegistration({ tags: selectedTags, avatar: selectedAvatar });
        if (!res.success) {
          window.alert(res.message || '注册失败');
          return;
        }
        window.alert('注册成功，已自动登录！');
        window.location.href = 'index.html';
      });
    }
  }

  // --- 详情页 detail.html ---

  function getQueryParam(name) {
    var params = window.location.search.substring(1).split('&');
    for (var i = 0; i < params.length; i++) {
      var pair = params[i].split('=');
      if (decodeURIComponent(pair[0]) === name) {
        return decodeURIComponent(pair[1] || '');
      }
    }
    return '';
  }

  function initDetailPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'detail') return;

    var postId = getQueryParam('id');
    var post = postId ? DataStore.getPostById(postId) : null;

    // =========== [新增代码开始] ===========
    // 如果没有找到动态（或者刷新后数据丢了），自动造一条新的，并跳转过去
    if (!post) {
      console.log("检测到无数据，正在自动生成测试动态...");
      var currentUser = Auth.getCurrentUser();
      // 这里的 DataStore.addPost 会把数据存入 localStorage (如果你的 DataStore 支持的话)
      // 即使不支持，它也会在当前页面生命周期内创建一条
      var newPost = DataStore.addPost({
        authorId: currentUser ? currentUser.id : 'user_1',
        content: "这是一条自动生成的测试动态！\n用于测试详情页的左右分栏效果。\n无论你怎么刷新，我都会在这里。",
        images: ["https://picsum.photos/800/800", "https://picsum.photos/600/800"], // 随机图
        tags: ["测试", "自动生成", "UI调试"]
      });
      
      // 强制跳转到这条新动态的 ID
      window.location.href = 'detail.html?id=' + newPost.id;
      return; 
    }
    // =========== [新增代码结束] ===========
    
    // 1. 处理找不到动态的情况 (适配新布局)
    if (!post) {
      var scrollArea = qs('#detailScrollArea');
      if (scrollArea) {
         scrollArea.innerHTML = '<div style="padding:40px;text-align:center;color:#999;">未找到该动态，可能已被删除。</div>';
      }
      return;
    }

    var author = DataStore.getUserById(post.authorId);
    var currentUser = Auth.getCurrentUser();

    // 2. 调用新版 Render 函数渲染四个区域
    // 对应 detail.html 中的四个 ID 容器
    if (Render.setHTMLById) {
        Render.setHTMLById('detailMedia', Render.renderDetailMedia(post));
        Render.setHTMLById('detailHeader', Render.renderDetailHeader(author, currentUser));
        Render.setHTMLById('detailContent', Render.renderDetailContent(post));
        Render.setHTMLById('detailActions', Render.renderDetailActions(post, currentUser));
    }
    // =========== [新增代码开始：鼠标拖拽与按钮控制] ===========
    const carousel = qs('#detailMediaCarousel');
    const indicators = qsa('.indicator-dot');
    const prevBtn = qs('#carouselPrevBtn');
    const nextBtn = qs('#carouselNextBtn');

    if (carousel && indicators.length > 0) {
      
      // --- A. 鼠标拖拽逻辑 (Drag to Scroll) ---
      let isDown = false;
      let startX;
      let scrollLeft;

      carousel.addEventListener('mousedown', (e) => {
        isDown = true;
        carousel.classList.add('is-dragging'); // 改变鼠标样式
        startX = e.pageX - carousel.offsetLeft;
        scrollLeft = carousel.scrollLeft;
      });

      carousel.addEventListener('mouseleave', () => {
        isDown = false;
        carousel.classList.remove('is-dragging');
      });

      carousel.addEventListener('mouseup', () => {
        isDown = false;
        carousel.classList.remove('is-dragging');
        // 拖拽结束后，让 CSS scroll-snap 自动吸附到最近的一张
      });

      carousel.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault(); // 防止选中文字或图片
        const x = e.pageX - carousel.offsetLeft;
        const walk = (x - startX) * 2; // *2 是为了让滑动更灵敏
        carousel.scrollLeft = scrollLeft - walk;
      });

      // --- B. 按钮点击切换逻辑 ---
      const itemWidth = carousel.offsetWidth; // 获取容器宽度（即一张图的宽）

      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          carousel.scrollBy({ left: -itemWidth, behavior: 'smooth' });
        });
      }

      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          carousel.scrollBy({ left: itemWidth, behavior: 'smooth' });
        });
      }

      // --- C. 滚动监听更新指示器 (保持之前的逻辑，稍微优化) ---
      carousel.addEventListener('scroll', () => {
        // 使用防抖或简单的计算
        const currentScroll = carousel.scrollLeft;
        const index = Math.round(currentScroll / carousel.offsetWidth);
        
        indicators.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === index);
        });
      }, { passive: true });
    }
    // =========== [新增代码结束] ===========
    

    // 3. 绑定底部操作栏事件 (使用事件委托)
    // 因为 Like/Favorite/Repost 按钮是动态渲染的，没有固定ID，所以监听父容器 #detailActions
    var actionsContainer = qs('#detailActions');
    if (actionsContainer) {
      actionsContainer.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-action]');
        if (!btn) return;
        var action = btn.getAttribute('data-action');

        if (action === 'like') {
           if (!Auth.isLoggedIn()) {
             window.alert('请先登录');
             return;
           }
           var updated = DataStore.toggleLike(post.id, 1);
           if (updated) {
             btn.classList.toggle('is-active'); // 切换红色爱心样式
           }
        } 
        else if (action === 'favorite') {
           if (!Auth.isLoggedIn()) {
             window.alert('请先登录');
             return;
           }
           var isFav = DataStore.toggleFavorite(Auth.getCurrentUser().id, post.id);
           btn.classList.toggle('is-starred', isFav); // 切换黄色星星样式
        } 
        else if (action === 'repost') {
           if (!Auth.isLoggedIn()) {
             window.alert('请先登录');
             return;
           }
           // 填充并打开转发模态框 (复用原有逻辑)
           var originalContentEl = qs('#repostOriginalContent');
           if (originalContentEl) {
             originalContentEl.innerHTML = 
               '<div class="repost-original__header">' +
               '<img src="' + Render.escapeHTML(author.avatar || '') + '" alt="头像" class="repost-original__avatar" />' +
               '<span class="repost-original__author">' + Render.escapeHTML(author.nickname || '未知用户') + '</span>' +
               '</div>' +
               '<div class="repost-original__content">' + Render.escapeHTML(post.content || '') + '</div>';
           }
           qs('#repostContentInput').value = '';
           qs('#repostForm').setAttribute('data-original-post-id', post.id);
           openModal('repostModal');
        }
      });
    }

    // 4. 评论区逻辑 (复用原有逻辑，ID 保持为 #commentList)
    function refreshComments() {
      var comments = DataStore.getCommentsByPostId(post.id);
      var users = DataStore.getUsers();
      var listEl = qs('#commentList');
      if (listEl) {
        listEl.innerHTML = Render.renderCommentList(comments, users);
      }
    }
    refreshComments();

    // 评论表单提交
    var commentForm = qs('#commentForm');
    if (commentForm) {
      commentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = Auth.getCurrentUser();
        if (!user) {
           window.alert('请先登录再发表评论');
           // window.location.href = 'login.html'; // 可选：跳转登录
           return;
        }
        var content = qs('#commentContentInput').value.trim();
        if (!content) {
           window.alert('评论内容不能为空');
           return;
        }
        DataStore.addComment({ postId: post.id, userId: user.id, content: content });
        DataStore.updateUserLastActiveTime(user.id);
        
        // 清空输入框并刷新
        qs('#commentContentInput').value = '';
        refreshComments();
        
        // 体验优化：发布后自动滚动到评论区底部
        var scrollArea = qs('#detailScrollArea');
        if(scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
      });
    }

    // 5. Emoji 表情功能 (增强版)
    var emojiPicker = qs('#emojiPicker');
    var emojiBtn = qs('#emojiToggleBtn');

    if (emojiPicker && emojiBtn) {
       var emojis = ['😀', '😂', '🥰', '👍', '👏', '🤔', '😭', '🔥'];
       emojiPicker.innerHTML = Render.renderEmojiPicker(emojis);

       // 1. 点击表情：输入并关闭
       emojiPicker.addEventListener('click', function(e){
          var btn = e.target.closest('.emoji-picker__item');
          if(!btn) return;
          var emoji = btn.getAttribute('data-emoji');
          var input = qs('#commentContentInput');
          if(input) {
            input.value += emoji;
            input.focus();
            // 选完表情后自动关闭，体验更好
            emojiPicker.setAttribute('hidden', 'hidden'); 
          }
       });

       // 2. 点击按钮：切换开关
       emojiBtn.addEventListener('click', function(e){
          // 阻止冒泡，防止触发下面的 document 点击事件
          e.stopPropagation(); 
          var hidden = emojiPicker.hasAttribute('hidden');
          if(hidden) emojiPicker.removeAttribute('hidden');
          else emojiPicker.setAttribute('hidden', 'hidden');
       });

       // 3. [新增] 点击页面空白处：自动关闭
       document.addEventListener('click', function(e) {
          // 如果点击的不是表情框内部，也不是表情按钮，就关掉它
          if (!emojiPicker.contains(e.target) && e.target !== emojiBtn) {
             emojiPicker.setAttribute('hidden', 'hidden');
          }
       });
       
       // 防止点击表情框本身时把自己关掉
       emojiPicker.addEventListener('click', function(e){
           e.stopPropagation();
       });
    }

    // 6. 模态框内的转发表单提交逻辑 (复用)
    var repostForm = qs('#repostForm');
    if (repostForm) {
      // 移除可能重复绑定的监听器 (虽然 initDetailPage 只跑一次，但为了保险)
      var newRepostForm = repostForm.cloneNode(true);
      repostForm.parentNode.replaceChild(newRepostForm, repostForm);
      
      newRepostForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = Auth.getCurrentUser();
        if (!user) return;
        var originalPostId = newRepostForm.getAttribute('data-original-post-id');
        if (!originalPostId) return;
        var content = qs('#repostContentInput').value.trim();
        var result = DataStore.addRepost(user.id, originalPostId, content);
        if (result && result.post) {
          DataStore.updateUserLastActiveTime(user.id);
          closeModal('repostModal');
          window.alert('转发成功！');
          window.location.href = 'index.html';
        }
      });
    }
  }

  // --- 初始化入口 ---

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initGlassEffect();
    initCardOpacity();
    initNavbarScroll();
    initNavbarAuthState();
    initModalTriggers();

    initHomePage();
    initLoginPage();
    initRegisterPage();
    initDetailPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
