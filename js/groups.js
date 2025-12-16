// groups.js - 群组管理逻辑

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

  // 根据群组名称/简介粗略推断类别（如果后续扩展到数据层可直接使用 group.category）
  function getGroupCategory(group) {
    if (group.category) return group.category;
    var text = (group.name + ' ' + (group.description || '')).toLowerCase();
    if (/[考研|学习|学术|实验|竞赛]/.test(text)) return 'academic';
    if (/[跑步|篮球|足球|羽毛球|运动]/.test(text)) return 'sports';
    if (/[音乐|吉他|舞蹈|话剧|艺术|绘画]/.test(text)) return 'arts';
    if (/[游戏|开黑|电竞|桌游]/.test(text)) return 'games';
    if (/[生活|美食|摄影|日常|兴趣]/.test(text)) return 'life';
    return 'other';
  }

  function renderGroupCard(group, currentUser) {
    var isMember = currentUser && group.members.indexOf(currentUser.id) !== -1;
    var membersCount = group.members.length;
    var creator = DataStore.getUserById(group.creatorId);
    var category = getGroupCategory(group);

    var coverClass = 'group-card__cover';
    if (category === 'academic') coverClass += ' group-card__cover--academic';
    else if (category === 'sports') coverClass += ' group-card__cover--sports';
    else if (category === 'arts') coverClass += ' group-card__cover--arts';
    else if (category === 'games') coverClass += ' group-card__cover--games';
    else if (category === 'life') coverClass += ' group-card__cover--life';
    
    var actionHtml;
    if (isMember) {
      actionHtml =
        '<button type="button" class="btn-secondary group-card__btn group-card__btn--ghost" data-action="leave">退出</button>' +
        '<button type="button" class="btn-primary group-card__btn group-card__btn--primary" data-action="view">进入</button>';
    } else {
      actionHtml =
        '<button type="button" class="btn-primary group-card__btn group-card__btn--primary" data-action="join">加入</button>';
    }

    return (
      '<article class="group-card" data-group-id="' + Render.escapeHTML(group.id) + '" data-group-category="' + Render.escapeHTML(category) + '">' +
      '<div class="' + coverClass + '"></div>' +
      '<div class="group-card__logo">' +
      '<img src="' + Render.escapeHTML(group.avatar || '') + '" alt="群组头像" />' +
      '</div>' +
      '<div class="group-card__body">' +
      '<h3 class="group-card__name">' + Render.escapeHTML(group.name) + '</h3>' +
      '<p class="group-card__description">' + Render.escapeHTML(group.description || '暂无简介') + '</p>' +
      '<div class="group-card__meta">' +
      '<span><span>👥</span><span>' + membersCount + ' 人</span></span>' +
      '<span><span>👑</span><span>' + Render.escapeHTML(creator ? creator.nickname : '未知') + '</span></span>' +
      '</div>' +
      '</div>' +
      '<div class="group-card__actions">' +
      actionHtml +
      '</div>' +
      '</article>'
    );
  }

  function renderGroupsList(groups, currentUser) {
    var container = qs('#groupsContainer');
    var emptyEl = qs('#groupsEmpty');
    
    if (!container) return;
    
    if (groups.length === 0) {
      container.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }
    
    if (emptyEl) emptyEl.hidden = true;
    
    container.innerHTML = groups.map(function (group) {
      return renderGroupCard(group, currentUser);
    }).join('');
    
    // 确保只绑定一次点击事件
    container.onclick = function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var card = btn.closest('.group-card');
      if (!card) return;
      var groupId = card.getAttribute('data-group-id');
      var group = DataStore.getGroupById(groupId);
      if (!group) return;
      
      if (action === 'join') {
        if (!Auth.isLoggedIn()) {
          window.alert('请先登录后再加入群组');
          window.location.href = 'login.html';
          return;
        }
        var user = Auth.getCurrentUser();
        // 加入按钮加载动效
        btn.classList.add('is-loading');
        btn.textContent = '加入中...';
        setTimeout(function () {
          DataStore.joinGroup(user.id, groupId);
          btn.classList.remove('is-loading');
          btn.textContent = '✓ 已加入';
          setTimeout(function () {
            renderGroups();
          }, 400);
        }, 500);
      } else if (action === 'leave') {
        if (window.confirm('确定要退出这个群组吗？')) {
          var user = Auth.getCurrentUser();
          DataStore.leaveGroup(user.id, groupId);
          renderGroups();
          window.alert('已退出群组');
        }
      } else if (action === 'view') {
        viewGroupDetail(group);
      }
    };
  }

  function viewGroupDetail(group) {
    var modal = qs('#groupDetailModal');
    var content = qs('#groupDetailContent');
    var title = qs('#groupDetailModalTitle');
    
    if (!modal || !content) return;
    
    if (title) title.textContent = group.name;
    
    var members = group.members.map(function (userId) {
      var user = DataStore.getUserById(userId);
      return user;
    }).filter(Boolean);
    
    var posts = DataStore.getGroupPosts(group.id);
    var currentUser = Auth.getCurrentUser();
    
    var membersHtml = members.map(function (user) {
      return (
        '<div class="group-member-item">' +
        '<img src="' + Render.escapeHTML(user.avatar || '') + '" alt="头像" class="group-member-item__avatar" />' +
        '<span class="group-member-item__name">' + Render.escapeHTML(user.nickname || '') + '</span>' +
        '</div>'
      );
    }).join('');
    
    var postsHtml = '';
    if (posts.length === 0) {
      postsHtml = '<p class="group-posts-empty">群组中还没有动态</p>';
    } else {
      postsHtml = Render.renderPostList(posts, DataStore.getUsers(), currentUser);
    }
    
    content.innerHTML = 
      '<div class="group-detail-header">' +
      '<img src="' + Render.escapeHTML(group.avatar || '') + '" alt="群组头像" class="group-detail-header__avatar" />' +
      '<div class="group-detail-header__info">' +
      '<h3>' + Render.escapeHTML(group.name) + '</h3>' +
      '<p>' + Render.escapeHTML(group.description || '暂无简介') + '</p>' +
      '</div>' +
      '</div>' +
      '<div class="group-detail-section">' +
      '<h4>成员 (' + members.length + ')</h4>' +
      '<div class="group-members-list">' + membersHtml + '</div>' +
      '</div>' +
      '<div class="group-detail-section">' +
      '<h4>群组动态</h4>' +
      '<div class="group-posts-list">' + postsHtml + '</div>' +
      '</div>';
    
    openModal('groupDetailModal');
  }

  var currentCategory = 'all';
  var currentSearchKeyword = '';

  function renderGroups() {
    var currentUser = Auth.getCurrentUser();
    var currentTab = qs('.tabs .tab.is-active');
    var tabKey = currentTab ? currentTab.getAttribute('data-groups-tab') : 'my';
    
    var groups = [];
    if (tabKey === 'my') {
      if (currentUser) {
        groups = DataStore.getUserGroups(currentUser.id);
      }
    } else {
      groups = DataStore.getGroups();
    }
    
    // 分类过滤
    if (currentCategory && currentCategory !== 'all') {
      groups = groups.filter(function (g) {
        return getGroupCategory(g) === currentCategory;
      });
    }

    // 关键字搜索
    if (currentSearchKeyword) {
      var kw = currentSearchKeyword.toLowerCase();
      groups = groups.filter(function (g) {
        var txt = (g.name + ' ' + (g.description || '')).toLowerCase();
        return txt.indexOf(kw) !== -1;
      });
    }

    renderGroupsList(groups, currentUser);
  }

  function initGroupsPage() {
    var pageKey = getPageKey();
    if (pageKey !== 'groups') return;
    
    var currentUser = Auth.getCurrentUser();
    if (!currentUser) {
      window.alert('请先登录后再查看群组');
      window.location.href = 'login.html';
      return;
    }
    
    // 我的 / 全部 标签切换
    qsa('.tabs .tab[data-groups-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        qsa('.tabs .tab').forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
        });
        renderGroups();
      });
    });

    // 分类 pill 筛选
    qsa('.groups-filter-pill').forEach(function (pill) {
      pill.addEventListener('click', function () {
        var category = pill.getAttribute('data-group-category') || 'all';
        currentCategory = category;
        qsa('.groups-filter-pill').forEach(function (p) {
          p.classList.toggle('is-active', p === pill);
        });
        renderGroups();
      });
    });

    // 顶部搜索框
    var searchInput = qs('#groupSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        currentSearchKeyword = searchInput.value.trim();
        renderGroups();
      });
    }
    
    // 创建群组按钮
    var createBtn = qs('#createGroupBtn');
    if (createBtn) {
      createBtn.addEventListener('click', function () {
        openModal('createGroupModal');
      });
    }
    
    // 创建群组表单
    var createForm = qs('#createGroupForm');
    if (createForm) {
      createForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = qs('#groupNameInput').value.trim();
        var description = qs('#groupDescriptionInput').value.trim();
        var avatar = qs('#groupAvatarInput').value.trim();
        
        if (!name) {
          window.alert('群组名称不能为空');
          return;
        }
        
        var group = DataStore.createGroup(currentUser.id, name, description, avatar);
        closeModal('createGroupModal');
        createForm.reset();
        renderGroups();
        window.alert('群组创建成功！');
      });
    }
    
    // 模态框关闭
    qsa('[data-close-modal]').forEach(function (el) {
      el.addEventListener('click', function () {
        var modalId = el.getAttribute('data-close-modal');
        if (modalId) closeModal(modalId);
      });
    });
    
    renderGroups();
  }

  document.addEventListener('DOMContentLoaded', function () {
    initGroupsPage();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
