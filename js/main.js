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
    var btn = qs('#themeToggleBtn');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.body.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        var next = current === 'dark' ? 'light' : 'dark';
        if (next === 'dark') {
          document.body.setAttribute('data-theme', 'dark');
        } else {
          document.body.removeAttribute('data-theme');
        }
        DataStore.setSavedTheme(next === 'dark' ? 'dark' : 'light');
      });
    }
  }

  // --- 导航栏 & 用户菜单 ---

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
      posts.forEach(function (p) {
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
      posts.forEach(function (p) {
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

    var allPosts = posts.slice().sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    var currentTab = 'recommend';
    var currentKeyword = '';

    function filterPosts() {
      var filtered = allPosts;
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
      listEl.innerHTML = Render.renderPostList(filtered, users, currentUser);
    }

    renderFeed();

    var hotTopics = computeHotTopics();
    var hotTopicsList = qs('#hotTopicsList');
    if (hotTopicsList) {
      hotTopicsList.innerHTML = Render.renderHotTopics(hotTopics);
    }

    var activeUsers = computeActiveUsers();
    var activeUsersList = qs('#activeUsersList');
    if (activeUsersList) {
      activeUsersList.innerHTML = Render.renderActiveUsersList(activeUsers);
      activeUsersList.addEventListener('click', function (e) {
        var li = e.target.closest('.active-user-item');
        if (li) {
          var userId = li.getAttribute('data-user-id');
          if (userId) {
            window.location.href = 'profile.html?userId=' + encodeURIComponent(userId);
          }
        }
      });
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
        renderFeed();
      });
    });

    var searchForm = qs('.navbar__search');
    var searchInput = qs('#globalSearchInput');
    if (searchForm && searchInput) {
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
            actionBtn.classList.add('is-liked');
          }
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
        var newPost = DataStore.addPost({
          authorId: user.id,
          content: content,
          images: images,
          tags: tags,
          visibility: visibility,
        });
        closeModal('postModal');
        document.getElementById('postForm').reset();
        allPosts.unshift(newPost);
        renderFeed();
      });
    }
  }

  // --- 登录页 login.html ---

  function initLoginPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'login') return;

    var remembered = Auth.getRememberedStudentId();
    var studentInput = qs('#loginStudentId');
    if (studentInput && remembered) {
      studentInput.value = remembered;
    }

    var toggleBtn = qs('#togglePasswordVisibilityBtn');
    var passwordInput = qs('#loginPassword');
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', function () {
        var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        toggleBtn.textContent = type === 'password' ? '显示' : '隐藏';
      });
    }

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
    var container = qs('#postDetailContainer');
    if (!container) return;

    if (!post) {
      container.innerHTML = '<p>未找到该动态，可能已被删除。</p>';
      return;
    }

    var author = DataStore.getUserById(post.authorId);
    container.innerHTML = Render.renderPostDetail(post, author);

    var currentUser = Auth.getCurrentUser();
    var ownerActions = qs('#postOwnerActions');
    if (ownerActions && currentUser && currentUser.id === post.authorId) {
      ownerActions.hidden = false;
      var editBtn = qs('#editPostBtn');
      var deleteBtn = qs('#deletePostBtn');

      if (editBtn) {
        editBtn.addEventListener('click', function () {
          var contentInput = qs('#editPostContentInput');
          var imagesInput = qs('#editPostImagesInput');
          if (contentInput) contentInput.value = post.content || '';
          if (imagesInput) imagesInput.value = (post.images || []).join('\n');
          openModal('editPostModal');
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
          if (window.confirm('确定要删除这条动态吗？删除后不可恢复。')) {
            DataStore.deletePost(post.id);
            window.location.href = 'index.html';
          }
        });
      }

      var editForm = qs('#editPostForm');
      if (editForm) {
        editForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var newContent = qs('#editPostContentInput').value.trim();
          var newImagesRaw = qs('#editPostImagesInput').value;
          if (!newContent) {
            window.alert('内容不能为空');
            return;
          }
          var newImages = newImagesRaw
            .split(/\n|,/)
            .map(function (s) {
              return s.trim();
            })
            .filter(Boolean);
          post = DataStore.updatePost(post.id, { content: newContent, images: newImages });
          container.innerHTML = Render.renderPostDetail(post, author);
          closeModal('editPostModal');
        });
      }
    }

    var emojiPicker = qs('#emojiPicker');
    if (emojiPicker) {
      var emojis = ['😀', '😂', '🥰', '👍', '👏', '🤔', '😭', '🔥'];
      emojiPicker.innerHTML = Render.renderEmojiPicker(emojis);
      emojiPicker.addEventListener('click', function (e) {
        var btn = e.target.closest('.emoji-picker__item');
        if (!btn) return;
        var emoji = btn.getAttribute('data-emoji');
        var textarea = qs('#commentContentInput');
        if (textarea) {
          textarea.value += emoji;
          textarea.focus();
        }
      });
    }

    var emojiToggleBtn = qs('#emojiToggleBtn');
    if (emojiToggleBtn && emojiPicker) {
      emojiToggleBtn.addEventListener('click', function () {
        var hidden = emojiPicker.hasAttribute('hidden');
        if (hidden) {
          emojiPicker.removeAttribute('hidden');
        } else {
          emojiPicker.setAttribute('hidden', 'hidden');
        }
      });
    }

    function refreshComments() {
      var comments = DataStore.getCommentsByPostId(post.id);
      var users = DataStore.getUsers();
      var listEl = qs('#commentList');
      if (!listEl) return;
      listEl.innerHTML = Render.renderCommentList(comments, users);
    }

    refreshComments();

    var commentForm = qs('#commentForm');
    if (commentForm) {
      commentForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var user = Auth.getCurrentUser();
        if (!user) {
          window.alert('请先登录再发表评论');
          window.location.href = 'login.html';
          return;
        }
        var content = qs('#commentContentInput').value.trim();
        if (!content) {
          window.alert('评论内容不能为空');
          return;
        }
        DataStore.addComment({
          postId: post.id,
          userId: user.id,
          content: content,
        });
        qs('#commentContentInput').value = '';
        refreshComments();
      });
    }
  }

  // --- 初始化入口 ---

  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initNavbarAuthState();
    initModalTriggers();

    initHomePage();
    initLoginPage();
    initRegisterPage();
    initDetailPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
