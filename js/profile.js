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

  function updateStatsUI(stats, visitCount) {
    var followersEl = qs('#profileFollowersCount');
    var followingEl = qs('#profileFollowingCount');
    var likesEl = qs('#profileLikesCount');
    var visitEl = qs('#profileVisitCount');
    if (followersEl) followersEl.textContent = stats.followersCount;
    if (followingEl) followingEl.textContent = stats.followingCount;
    if (likesEl) likesEl.textContent = stats.likesCount;
    if (visitEl) visitEl.textContent = visitCount || 0;
  }

  function formatTimeAgo(timestamp) {
    if (!timestamp) return '从未活跃';
    var diff = Date.now() - timestamp;
    var sec = Math.floor(diff / 1000);
    if (sec < 60) return '刚刚活跃';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + ' 分钟前';
    var hour = Math.floor(min / 60);
    if (hour < 24) return hour + ' 小时前';
    var day = Math.floor(hour / 24);
    if (day < 7) return day + ' 天前';
    var date = new Date(timestamp);
    return date.getFullYear() + '-' + 
           String(date.getMonth() + 1).padStart(2, '0') + '-' + 
           String(date.getDate()).padStart(2, '0');
  }

  function updateLastActiveUI(profileUser) {
    var lastActiveTime = DataStore.getUserLastActiveTime(profileUser.id);
    var lastActiveEl = qs('#profileLastActive');
    if (lastActiveEl) {
      lastActiveEl.textContent = formatTimeAgo(lastActiveTime);
    }
  }

  function renderGallery(profileUser) {
    var posts = DataStore.getPosts();
    var userPosts = posts.filter(function (p) {
      return p.authorId === profileUser.id && Array.isArray(p.images) && p.images.length > 0;
    });
    
    var allImages = [];
    userPosts.forEach(function (post) {
      post.images.forEach(function (imgUrl) {
        if (imgUrl && imgUrl.trim()) {
          allImages.push(imgUrl.trim());
        }
      });
    });

    var galleryGrid = qs('#profileGalleryGrid');
    var galleryEmpty = qs('#profileGalleryEmpty');
    
    if (!galleryGrid) return;

    if (allImages.length === 0) {
      if (galleryGrid) galleryGrid.innerHTML = '';
      if (galleryEmpty) galleryEmpty.hidden = false;
      return;
    }

    if (galleryEmpty) galleryEmpty.hidden = true;
    
    // 最多显示12张图片
    var displayImages = allImages.slice(0, 12);
    var html = displayImages.map(function (imgUrl, index) {
      return '<div class="profile-gallery-item" data-index="' + index + '">' +
             '<img src="' + Render.escapeHTML(imgUrl) + '" alt="相册图片 ' + (index + 1) + '" loading="lazy" />' +
             '</div>';
    }).join('');
    
    galleryGrid.innerHTML = html;
    
    // 点击图片可以查看大图（简单实现：跳转到包含该图片的动态）
    galleryGrid.addEventListener('click', function (e) {
      var item = e.target.closest('.profile-gallery-item');
      if (!item) return;
      var index = parseInt(item.getAttribute('data-index'), 10);
      var imgUrl = displayImages[index];
      // 找到包含该图片的动态
      var targetPost = null;
      for (var i = 0; i < userPosts.length; i++) {
        if (userPosts[i].images.indexOf(imgUrl) !== -1) {
          targetPost = userPosts[i];
          break;
        }
      }
      if (targetPost) {
        window.location.href = 'detail.html?id=' + encodeURIComponent(targetPost.id);
      }
    });
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
      var favoritePostIds = DataStore.getUserFavorites(profileUser.id);
      var favoritePosts = DataStore.getPosts().filter(function (p) {
        return favoritePostIds.indexOf(p.id) !== -1;
      }).sort(function (a, b) {
        return b.timestamp - a.timestamp;
      });
      if (!favoritePosts.length) {
        favoritesPanel.innerHTML = '<p style="padding: 10px; color: #999;">还没有收藏过动态。</p>';
      } else {
        favoritesPanel.innerHTML = Render.renderPostList(favoritePosts, users, Auth.getCurrentUser());
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
    var messageBtn = qs('#messageBtn');

    if (isSelf) {
      if (editBtn) editBtn.style.display = '';
      if (followBtn) followBtn.style.display = 'none';
      if (messageBtn) messageBtn.style.display = 'none';
    } else {
      if (editBtn) editBtn.style.display = 'none';
      if (followBtn) followBtn.style.display = '';
      if (messageBtn) messageBtn.style.display = '';
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
        var visitCount = DataStore.getUserVisitCount(profileUser.id);
        updateStatsUI(stats, visitCount);
        updateMetricsUI(profileUser, stats);
        refreshFollowBtn();
      });

      refreshFollowBtn();
    }

    if (messageBtn) {
      messageBtn.addEventListener('click', function () {
        if (!Auth.isLoggedIn()) {
          window.alert('请先登录后再发送私信');
          window.location.href = 'login.html';
          return;
        }
        var userInfoEl = qs('#messageUserInfo');
        if (userInfoEl) {
          userInfoEl.innerHTML = 
            '<div class="message-user-info__avatar">' +
            '<img src="' + Render.escapeHTML(profileUser.avatar || '') + '" alt="头像" />' +
            '</div>' +
            '<div class="message-user-info__name">' + Render.escapeHTML(profileUser.nickname || '未知用户') + '</div>';
        }
        var modal = qs('#messageModal');
        if (modal) {
          modal.classList.add('is-open');
          modal.setAttribute('aria-hidden', 'false');
        }
      });
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
          // 更新活跃时间
          DataStore.updateUserLastActiveTime(profileUser.id);
          renderProfileBasic(profileUser);
          var stats = computeStats(profileUser);
          var visitCount = DataStore.getUserVisitCount(profileUser.id);
          updateStatsUI(stats, visitCount);
          updateMetricsUI(profileUser, stats);
          updateLastActiveUI(profileUser);
          renderGallery(profileUser);
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

    // 记录访问量（如果不是自己访问自己的主页）
    if (!currentUser || currentUser.id !== profileUser.id) {
      DataStore.incrementUserVisitCount(profileUser.id);
    }

    renderProfileBasic(profileUser);
    var stats = computeStats(profileUser);
    var visitCount = DataStore.getUserVisitCount(profileUser.id);
    updateStatsUI(stats, visitCount);
    updateMetricsUI(profileUser, stats);
    updateLastActiveUI(profileUser);
    renderGallery(profileUser);
    renderTabsContent(profileUser, stats);
    initTabs();
    initFollowAndEdit(profileUser);
    initNewPostShortcut();
  });
})(window, document, window.DataStore, window.Auth, window.Render);
