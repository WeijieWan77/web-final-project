// profile.js - 个人主页逻辑
// 负责：加载个人信息、粉丝/关注/获赞统计、关注/取关、资料编辑、内容 Tab（动态/收藏）

(function (window, document, DataStore, Auth, Render) {
  if (!DataStore || !Render) return;

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

  function computeStats(profileUser) {
    var users = DataStore.getUsers();
    var posts = DataStore.getPosts();
    var followers = users.filter(function (u) {
      return Array.isArray(u.following) && u.following.indexOf(profileUser.id) !== -1;
    });
    var followingCount = Array.isArray(profileUser.following) ? profileUser.following.length : 0;
    var myPosts = posts.filter(function (p) {
      return p.authorId === profileUser.id;
    });
    var likes = myPosts.reduce(function (sum, p) {
      return sum + (p.likes || 0);
    }, 0);
    return {
      followersCount: followers.length,
      followingCount: followingCount,
      likesCount: likes,
      myPosts: myPosts,
    };
  }

  function updateStatsUI(stats) {
    var followersEl = qs('#profileFollowersCount');
    var followingEl = qs('#profileFollowingCount');
    var likesEl = qs('#profileLikesCount');
    if (followersEl) followersEl.textContent = stats.followersCount;
    if (followingEl) followingEl.textContent = stats.followingCount;
    if (likesEl) likesEl.textContent = stats.likesCount;
  }

  function computeCompletion(profileUser) {
    var score = 0;
    var total = 4;
    if (profileUser.avatar) score++;
    if (profileUser.bio) score++;
    if (Array.isArray(profileUser.tags) && profileUser.tags.length >= 3) score++;
    if (Array.isArray(profileUser.following) && profileUser.following.length > 0) score++;
    return Math.round((score / total) * 100);
  }

  function computeActivity(stats) {
    var base = 0;
    base += Math.min(5, stats.myPosts.length) * 15;
    base += Math.min(10, stats.followersCount) * 5;
    var score = Math.max(10, Math.min(100, base));
    return score;
  }

  function updateMetricsUI(profileUser, stats) {
    var completion = computeCompletion(profileUser);
    var activity = computeActivity(stats);

    var completionBar = qs('#profileCompletionBar');
    var completionLabel = qs('#profileCompletionLabel');
    if (completionBar) completionBar.style.width = completion + '%';
    if (completionLabel) completionLabel.textContent = completion + '%';

    var activityBar = qs('#profileActivityBar');
    var activityLabel = qs('#profileActivityLabel');
    if (activityBar) activityBar.style.width = activity + '%';
    if (activityLabel) activityLabel.textContent = activity + '%';
  }

  function renderProfileBasic(profileUser) {
    var avatarEl = qs('#profileAvatar');
    var nicknameEl = qs('#profileNickname');
    var bioEl = qs('#profileBio');
    var tagsContainer = qs('#profileTags');

    if (avatarEl) avatarEl.src = profileUser.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=CL';
    if (nicknameEl) nicknameEl.textContent = profileUser.nickname || '未命名';
    if (bioEl) bioEl.textContent = profileUser.bio || '这个人很神秘，还没有写简介~';

    if (tagsContainer) {
      var tagsHtml = '';
      (profileUser.tags || []).forEach(function (tag) {
        tagsHtml += '<span class="tag">' + Render.escapeHTML(tag) + '</span>';
      });
      tagsContainer.innerHTML = tagsHtml;
    }
  }

  function renderTabsContent(profileUser, stats) {
    var postsPanel = qs('#profilePostsContainer');
    var favoritesPanel = qs('#profileFavoritesContainer');
    var users = DataStore.getUsers();

    if (postsPanel) {
      if (!stats.myPosts.length) {
        postsPanel.innerHTML = '<p style="padding: 10px; color: #999;">TA 还没有发布过动态。</p>';
      } else {
        postsPanel.innerHTML = Render.renderPostList(stats.myPosts, users, Auth.getCurrentUser());
      }
    }

    if (favoritesPanel) {
      var comments = DataStore.getComments().filter(function (c) {
        return c.userId === profileUser.id;
      });
      var postIdSet = {};
      comments.forEach(function (c) {
        postIdSet[c.postId] = true;
      });
      var posts = DataStore.getPosts().filter(function (p) {
        return postIdSet[p.id];
      });
      if (!posts.length) {
        favoritesPanel.innerHTML = '<p style="padding: 10px; color: #999;">暂时还没有收藏/互动过的动态。</p>';
      } else {
        favoritesPanel.innerHTML = Render.renderPostList(posts, users, Auth.getCurrentUser());
      }
    }
  }

  function initTabs() {
    var tabs = qsa('.tabs .tab');
    var panels = qsa('.profile-content__panel');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.getAttribute('data-profile-tab');
        tabs.forEach(function (t) {
          t.classList.toggle('is-active', t === tab);
        });
        panels.forEach(function (panel) {
          var isMatch = panel.getAttribute('data-profile-panel') === key;
          panel.hidden = !isMatch;
        });
      });
    });
  }

  function initFollowAndEdit(profileUser) {
    var currentUser = Auth.getCurrentUser();
    var isSelf = currentUser && currentUser.id === profileUser.id;

    var editBtn = qs('#editProfileBtn');
    var followBtn = qs('#followToggleBtn');

    if (isSelf) {
      if (editBtn) editBtn.style.display = '';
      if (followBtn) followBtn.style.display = 'none';
    } else {
      if (editBtn) editBtn.style.display = 'none';
      if (followBtn) followBtn.style.display = '';
    }

    if (followBtn) {
      function refreshFollowBtn() {
        var me = Auth.getCurrentUser();
        var following = (me && me.following) || [];
        var isFollowing = me && following.indexOf(profileUser.id) !== -1;
        followBtn.textContent = isFollowing ? '取消关注' : '关注';
      }

      followBtn.addEventListener('click', function () {
        var me = Auth.getCurrentUser();
        if (!me) {
          window.alert('请先登录后再关注其他同学');
          window.location.href = 'login.html';
          return;
        }
        var following = me.following || [];
        var isFollowing = following.indexOf(profileUser.id) !== -1;
        if (isFollowing) {
          DataStore.unfollowUser(me.id, profileUser.id);
        } else {
          DataStore.followUser(me.id, profileUser.id);
        }
        var stats = computeStats(profileUser);
        updateStatsUI(stats);
        updateMetricsUI(profileUser, stats);
        refreshFollowBtn();
      });

      refreshFollowBtn();
    }

    if (editBtn) {
      editBtn.addEventListener('click', function () {
        var nicknameInput = qs('#editNicknameInput');
        var bioInput = qs('#editBioInput');
        var avatarInput = qs('#editAvatarInput');
        if (nicknameInput) nicknameInput.value = profileUser.nickname || '';
        if (bioInput) bioInput.value = profileUser.bio || '';
        if (avatarInput) avatarInput.value = profileUser.avatar || '';
        var modal = qs('#editProfileModal');
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
      });

      var editForm = qs('#editProfileForm');
      if (editForm) {
        editForm.addEventListener('submit', function (e) {
          e.preventDefault();
          var nickname = qs('#editNicknameInput').value.trim();
          var bio = qs('#editBioInput').value.trim();
          var avatar = qs('#editAvatarInput').value.trim();
          if (!nickname) {
            window.alert('昵称不能为空');
            return;
          }
          profileUser = DataStore.updateUser(profileUser.id, {
            nickname: nickname,
            bio: bio,
            avatar: avatar,
          });
          renderProfileBasic(profileUser);
          var stats = computeStats(profileUser);
          updateMetricsUI(profileUser, stats);
          var modal = qs('#editProfileModal');
          if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
          }
        });
      }
    }
  }

  function initNewPostShortcut() {
    var btn = qs('#openPostModalFromProfileBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (!Auth.isLoggedIn()) {
        window.alert('请先登录后再发布动态');
        window.location.href = 'login.html';
        return;
      }
      // 简化处理：跳转到首页并在提示后由用户点击发布
      window.location.href = 'index.html';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (getPageKey() !== 'profile') return;

    var currentUser = Auth.getCurrentUser();
    var queryUserId = getQueryParam('userId');
    var targetUserId = queryUserId || (currentUser && currentUser.id);
    if (!targetUserId) {
      window.alert('未找到用户信息，请先登录或检查链接');
      window.location.href = 'login.html';
      return;
    }

    var profileUser = DataStore.getUserById(targetUserId);
    if (!profileUser) {
      qs('.main--profile').innerHTML = '<p style="padding: 12px;">该用户不存在或已被删除。</p>';
      return;
    }

    renderProfileBasic(profileUser);
    var stats = computeStats(profileUser);
    updateStatsUI(stats);
    updateMetricsUI(profileUser, stats);
    renderTabsContent(profileUser, stats);
    initTabs();
    initFollowAndEdit(profileUser);
    initNewPostShortcut();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
