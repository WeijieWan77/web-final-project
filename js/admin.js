// admin.js - 管理员后台逻辑
// 负责：路由保护、用户管理（封禁/解封、重置头像）、动态审核与强制删除

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

  function formatRole(user) {
    return user.role === 'admin' ? '管理员' : '普通用户';
  }

  function formatStatus(user) {
    return user.isBanned ? '已封禁' : '正常';
  }

  function defaultAvatarForNickname(nickname) {
    // 改为随机使用本地头像
    var localAvatars = [
      'img/user picture/adventurer-1766570006973.jpg',
      'img/user picture/adventurer-1766570011526.jpg',
      'img/user picture/adventurer-1766570014487.jpg',
      'img/user picture/adventurer-1766570016794.jpg',
      'img/user picture/adventurer-1766570021937.jpg',
      'img/user picture/adventurer-1766570024612.jpg',
      'img/user picture/adventurer-1766570026574.jpg',
      'img/user picture/adventurer-1766570028745.jpg'
    ];
    return localAvatars[Math.floor(Math.random() * localAvatars.length)];
  }

  function renderUserTable() {
    var tbody = qs('#adminUserTableBody');
    if (!tbody) return;
    var users = DataStore.getUsers();
    var rows = users
      .map(function (u) {
        return (
          '<tr data-user-id="' +
          u.id +
          '">' +
          '<td>' +
          (u.studentId || '') +
          '</td>' +
          '<td>' +
          (u.nickname || '') +
          '</td>' +
          '<td>' +
          formatRole(u) +
          '</td>' +
          '<td>' +
          formatStatus(u) +
          '</td>' +
          '<td>' +
          '<button type="button" class="btn-secondary" data-action="reset-avatar">重置头像</button> ' +
          '<button type="button" class="btn-danger" data-action="toggle-ban">' +
          (u.isBanned ? '解封' : '封禁') +
          '</button>' +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
    tbody.innerHTML = rows;
  }

  function renderPostAuditList() {
    var container = qs('#adminPostList');
    if (!container) return;
    var posts = DataStore.getPosts().slice().sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });
    var users = DataStore.getUsers();
    var userMap = {};
    users.forEach(function (u) {
      userMap[u.id] = u;
    });
    if (!posts.length) {
      container.innerHTML = '<p style="padding: 10px; color: #999;">暂无动态。</p>';
      return;
    }

    var html = posts
      .map(function (p) {
        var author = userMap[p.authorId] || { nickname: '未知用户' };
        return (
          '<div class="admin-post-item" data-post-id="' +
          p.id +
          '">' +
          '<div class="admin-post-item__main">' +
          '<div class="admin-post-item__title">' +
          (p.content || '').slice(0, 40) +
          (p.content && p.content.length > 40 ? '...' : '') +
          '</div>' +
          '<div class="admin-post-item__meta">' +
          '<span>' +
          (author.nickname || '未知用户') +
          '</span>' +
          '<span> · </span>' +
          '<span>👍 ' +
          (p.likes || 0) +
          '</span>' +
          '</div>' +
          '</div>' +
          '<button type="button" class="btn-danger" data-action="force-delete">强制删除</button>' +
          '</div>'
        );
      })
      .join('');
    container.innerHTML = html;
  }

  function initUserTableEvents() {
    var tbody = qs('#adminUserTableBody');
    if (!tbody) return;
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var tr = btn.closest('tr[data-user-id]');
      if (!tr) return;
      var userId = tr.getAttribute('data-user-id');
      var users = DataStore.getUsers();
      var user = users.find(function (u) {
        return u.id === userId;
      });
      if (!user) return;

      if (action === 'reset-avatar') {
        var newAvatar = defaultAvatarForNickname(user.nickname);
        DataStore.updateUser(userId, { avatar: newAvatar });
        window.alert('已重置该用户头像');
      } else if (action === 'toggle-ban') {
        var isBanned = !user.isBanned;
        DataStore.updateUser(userId, { isBanned: isBanned });
        window.alert(isBanned ? '已封禁该用户' : '已解封该用户');
      }
      // 重新获取最新数据并渲染，确保状态同步
      renderUserTable();
    });
  }

  function initPostAuditEvents() {
    var container = qs('#adminPostList');
    if (!container) return;
    container.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action="force-delete"]');
      if (!btn) return;
      var item = btn.closest('.admin-post-item');
      if (!item) return;
      var postId = item.getAttribute('data-post-id');
      if (!postId) return;
      if (window.confirm('确定要强制删除该动态吗？此操作不可恢复。')) {
        DataStore.deletePost(postId);
        renderPostAuditList();
      }
    });
  }

  function initAdminPage() {
    // 1. 权限检查
    Auth.requireAdmin();

    var currentUser = Auth.getCurrentUser();

    // 2. 初始化导航栏用户信息 (复用 main.js 逻辑)
    // 管理员页没有引入 main.js，需单独处理
    var avatarImg = document.getElementById('navbarAvatarImg');
    if (avatarImg && currentUser) {
      avatarImg.src = currentUser.avatar || 'img/user picture/adventurer-1766570006973.jpg';
    }
    var menuName = document.getElementById('menuUserName');
    var menuId = document.getElementById('menuUserId');
    if (menuName && currentUser) menuName.textContent = currentUser.nickname || '管理员';
    if (menuId && currentUser) menuId.textContent = '@' + currentUser.id;

    // 用户菜单交互
    var userMenuToggle = document.getElementById('userMenuToggle');
    var userDropdownMenu = document.getElementById('userDropdownMenu');
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

    // 3. 处理菜单项显示/隐藏 (data-auth-visible)
    qsa('[data-auth-visible]').forEach(function (el) {
      var vis = el.getAttribute('data-auth-visible');
      var show = false;
      if (vis === 'guest') {
        show = !currentUser;
      } else if (vis === 'user') {
        show = !!currentUser;
      } else if (vis === 'admin') {
        // 在管理员后台页面，不需要再显示“管理员后台”链接
        if (el.getAttribute('href') === 'admin.html') {
            show = false;
        } else {
            show = !!currentUser && currentUser.role === 'admin';
        }
      }
      el.style.display = show ? '' : 'none';
    });

    // 登出逻辑
    var logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            Auth.logout();
            window.location.href = 'index.html';
        });
    }

    renderUserTable();
    renderPostAuditList();
    initUserTableEvents();
    initPostAuditEvents();
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (getPageKey() !== 'admin') return;
    initAdminPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
