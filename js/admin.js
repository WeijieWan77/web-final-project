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
    var initials = (nickname || 'CL')
      .trim()
      .slice(0, 2)
      .toUpperCase();
    return 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(initials);
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
        window.alert('已重置头像');
      } else if (action === 'toggle-ban') {
        var isBanned = !user.isBanned;
        DataStore.updateUser(userId, { isBanned: isBanned });
        window.alert(isBanned ? '已封禁该用户' : '已解封该用户');
      }
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

  document.addEventListener('DOMContentLoaded', function () {
    if (getPageKey() !== 'admin') return;

    // 路由保护：非管理员直接重定向
    Auth.requireAdmin({ redirectTo: 'index.html' });

    renderUserTable();
    renderPostAuditList();
    initUserTableEvents();
    initPostAuditEvents();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
