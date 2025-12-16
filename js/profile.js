// profile.js - 个人主页逻辑
// 负责：加载个人信息、粉丝/关注/获赞统计、关注/取关、资料编辑、内容 Tab（动态/收藏/相册/资料）

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

  // --- 辅助函数：计算统计数据 ---
  function computeStats(profileUser) {
    var users = DataStore.getUsers();
    var posts = DataStore.getPosts();

    var followers = users.filter(function (u) {
      return Array.isArray(u.following) && u.following.indexOf(profileUser.id) !== -1;
    });
    var followingCount = Array.isArray(profileUser.following) ? profileUser.following.length : 0;
    
    // 过滤掉群组动态，群组动态不计入个人获赞
    var myPosts = posts.filter(function (p) {
      return p.authorId === profileUser.id && !p.groupId;
    });
    var likesCount = myPosts.reduce(function (sum, p) {
      return sum + (p.likes || 0);
    }, 0);

    return {
      followersCount: followers.length,
      followingCount: followingCount,
      likesCount: likesCount,
      myPosts: myPosts,
    };
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

  // --- 渲染顶部沉浸式个人形象区 (Hero Section) ---
  function renderProfileHero(profileUser, currentUser, stats) {
    var isSelf = currentUser && currentUser.id === profileUser.id;

    // 封面图 (可根据用户设置自定义，这里暂时用随机图或默认)
    var coverEl = qs('#profileCover');
    if (coverEl) {
      coverEl.style.backgroundImage = `url(${Render.escapeHTML(profileUser.cover || 'https://picsum.photos/seed/profile-cover-' + profileUser.id + '/1200/300')})`;
    }

    // 头像
    var avatarEl = qs('#profileAvatar');
    if (avatarEl) {
      avatarEl.src = profileUser.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=CL';
    }

    // 昵称与签名
    var nicknameEl = qs('#profileNickname');
    if (nicknameEl) nicknameEl.textContent = profileUser.nickname || '未命名';
    var bioEl = qs('#profileBio');
    if (bioEl) bioEl.textContent = profileUser.bio || '这个人很神秘，还没有写简介~';

    // 兴趣标签
    var tagsContainer = qs('#profileTags');
    if (tagsContainer) {
      var tagsHtml = '';
      (profileUser.tags || []).forEach(function (tag) {
        tagsHtml += `<span class="tag tag--sm">${Render.escapeHTML(tag)}</span>`;
      });
      tagsContainer.innerHTML = tagsHtml;
    }

    // 数据仪表盘
    var followingCountEl = qs('#profileFollowingCount');
    var followersCountEl = qs('#profileFollowersCount');
    var likesCountEl = qs('#profileLikesCount');
    if (followingCountEl) followingCountEl.textContent = stats.followingCount;
    if (followersCountEl) followersCountEl.textContent = stats.followersCount;
    if (likesCountEl) likesCountEl.textContent = stats.likesCount;

    // 点击数字展示列表 (简化：目前只做 alert)
    qs('#statFollowing')?.addEventListener('click', () => {
      if (stats.followingCount > 0) {
        window.alert(`TA 关注了 ${stats.followingCount} 个人`);
      } else {
        window.alert('TA 还没有关注任何人');
      }
    });
    qs('#statFollowers')?.addEventListener('click', () => {
      if (stats.followersCount > 0) {
        window.alert(`有 ${stats.followersCount} 人关注了 TA`);
      } else {
        window.alert('TA 还没有粉丝');
      }
    });
    qs('#statLikes')?.addEventListener('click', () => {
      if (stats.likesCount > 0) {
        window.alert(`TA 的动态共获得了 ${stats.likesCount} 个赞`);
      } else {
        window.alert('TA 的动态还没有获得赞');
      }
    });

    // 操作栏
    var actionsContainer = qs('#profileHero .profile-hero__actions');
    if (actionsContainer) {
      let actionsHtml = '';
      if (isSelf) {
        actionsHtml = `
          <button type="button" id="editProfileBtn" class="btn btn-secondary btn--sm">编辑资料</button>
          <button type="button" id="logoutBtn" class="btn btn-secondary btn--sm">退出登录</button>
        `;
      } else {
        // 判断当前用户是否已关注此用户
        var currentUserFollowing = currentUser ? (currentUser.following || []) : [];
        var isFollowing = currentUser ? currentUserFollowing.indexOf(profileUser.id) !== -1 : false;
        actionsHtml = `
          <button type="button" id="followToggleBtn" class="btn ${isFollowing ? 'btn-secondary' : 'btn-primary'} btn--sm">
            ${isFollowing ? '✅ 已关注' : '+ 关注'}
          </button>
          <button type="button" id="messageBtn" class="btn btn-secondary btn--sm">💬 私信</button>
        `;
      }
      actionsContainer.innerHTML = actionsHtml;

      // 绑定事件
      if (isSelf) {
        qs('#editProfileBtn')?.addEventListener('click', () => openModal('editProfileModal'));
        qs('#logoutBtn')?.addEventListener('click', () => {
          Auth.logout();
          window.location.href = 'index.html';
        });
      } else {
        qs('#followToggleBtn')?.addEventListener('click', () => {
          if (!Auth.isLoggedIn()) {
            window.alert('请先登录后再关注其他同学');
            window.location.href = 'login.html';
            return;
          }
          if (isFollowing) {
            DataStore.unfollowUser(currentUser.id, profileUser.id);
            window.alert('已取消关注');
          } else {
            DataStore.followUser(currentUser.id, profileUser.id);
            window.alert('关注成功');
          }
          // 重新渲染 Hero Section 以更新关注按钮状态和粉丝数
          var updatedStats = computeStats(profileUser);
          renderProfileHero(profileUser, currentUser, updatedStats);
          renderAboutTab(profileUser, currentUser, updatedStats); // 更新个人资料Tab的关注/粉丝数
        });
        qs('#messageBtn')?.addEventListener('click', () => {
          if (!Auth.isLoggedIn()) {
            window.alert('请先登录后再发送私信');
            window.location.href = 'login.html';
            return;
          }
          openMessageModal(profileUser);
        });
      }
    }
  }

  // --- 通用模态框管理 (与 main.js 保持一致) ---
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

  function openMessageModal(profileUser) {
    var userInfoEl = qs('#messageUserInfo');
    if (userInfoEl) {
      userInfoEl.innerHTML =
        `<div class="message-user-info__avatar">
          <img src="${Render.escapeHTML(profileUser.avatar || '')}" alt="头像" />
         </div>
         <div class="message-user-info__name">${Render.escapeHTML(profileUser.nickname || '未知用户')}</div>`;
    }
    // 启用消息输入和发送按钮
    qs('#messageInput').disabled = false;
    qs('#messageForm button[type="submit"]').disabled = false;
    openModal('messageModal');
  }

  // --- Tab 内容渲染 ---

  // 渲染“我的动态” Tab
  function renderPostsTab(profileUser, currentUser, posts) {
    var postsContainer = qs('#profilePostsContainer');
    if (!postsContainer) return;
    
    // 过滤掉群组动态
    var userPosts = posts.filter(p => p.authorId === profileUser.id && !p.groupId)
                          .sort((a, b) => b.timestamp - a.timestamp);

    if (userPosts.length === 0) {
      postsContainer.innerHTML = '<p class="empty-state">TA 还没有发布过动态。</p>';
    } else {
      postsContainer.innerHTML = Render.renderPostList(userPosts, DataStore.getUsers(), currentUser);
    }
  }

  // 渲染“我的收藏” Tab
  function renderFavoritesTab(profileUser, currentUser) {
    var favoritesContainer = qs('#profileFavoritesContainer');
    if (!favoritesContainer) return;

    var favoritePostIds = DataStore.getUserFavorites(profileUser.id);
    var favoritePosts = DataStore.getPosts().filter(function (p) {
      return favoritePostIds.indexOf(p.id) !== -1;
    }).sort(function (a, b) {
      return b.timestamp - a.timestamp;
    });

    if (favoritePosts.length === 0) {
      favoritesContainer.innerHTML = '<p class="empty-state">TA 还没有收藏过动态。</p>';
    } else {
      favoritesContainer.innerHTML = Render.renderPostList(favoritePosts, DataStore.getUsers(), currentUser);
    }
  }

  // 渲染“我的相册” Tab (瀑布流图片墙)
  function renderPhotosTab(profileUser) {
    var photosGrid = qs('#profilePhotosGrid');
    var photosEmpty = qs('#profilePhotosEmpty');
    if (!photosGrid) return;

    var postsWithImages = DataStore.getPosts().filter(function (p) {
      return p.authorId === profileUser.id && Array.isArray(p.images) && p.images.length > 0;
    });

    var allImages = [];
    postsWithImages.forEach(function (post) {
      post.images.forEach(function (imgUrl) {
        if (imgUrl && imgUrl.trim()) {
          allImages.push({ url: imgUrl.trim(), postId: post.id });
        }
      });
    });

    if (allImages.length === 0) {
      photosGrid.innerHTML = '';
      photosEmpty.hidden = false;
      return;
    }

    photosEmpty.hidden = true;
    
    // 最多显示50张图片，避免一次性加载过多
    var displayImages = allImages.slice(0, 50);
    var html = displayImages.map(function (item, index) {
      // 使用 masonry-item 和 image-wrapper 来适配瀑布流布局
      return `
        <div class="masonry-item">
          <div class="image-wrapper" data-post-id="${Render.escapeHTML(item.postId)}">
            <img src="${Render.escapeHTML(item.url)}" alt="相册图片 ${index + 1}" loading="lazy" />
          </div>
        </div>
      `;
    }).join('');
    
    photosGrid.innerHTML = html;

    // 绑定点击事件，点击图片跳转到对应的动态详情页
    photosGrid.addEventListener('click', function (e) {
      var wrapper = e.target.closest('.image-wrapper');
      if (wrapper) {
        var postId = wrapper.getAttribute('data-post-id');
        if (postId) {
          window.location.href = `detail.html?id=${encodeURIComponent(postId)}`;
        }
      }
    });
  }

  // 渲染“个人资料” Tab
  function renderAboutTab(profileUser, currentUser, stats) {
    var aboutContainer = qs('#profileAboutContainer');
    if (!aboutContainer) return;

    qs('#aboutStudentId').textContent = profileUser.studentId;
    qs('#aboutNickname').textContent = profileUser.nickname;
    qs('#aboutBio').textContent = profileUser.bio || '暂无';
    
    var tagsHtml = (profileUser.tags || []).map(tag => `<span class="tag tag--sm">${Render.escapeHTML(tag)}</span>`).join(' ');
    qs('#aboutTags').innerHTML = tagsHtml || '暂无';

    qs('#aboutJoinDate').textContent = new Date(profileUser.joinDate).toLocaleDateString();
    qs('#aboutLastActive').textContent = formatTimeAgo(DataStore.getUserLastActiveTime(profileUser.id));
    qs('#aboutRole').textContent = profileUser.role === 'admin' ? '管理员' : '普通用户';

    // 使用传入的 stats 对象更新数据
    qs('#aboutFollowingCount').textContent = stats.followingCount;
    qs('#aboutFollowersCount').textContent = stats.followersCount;
    qs('#aboutLikesCount').textContent = stats.likesCount;
  }

  // --- 初始化所有 Tab 及其内容 ---
  function initProfileTabs(profileUser, currentUser) {
    var tabs = qsa('.tabs .tab');
    var panels = qsa('.profile-content__panel');
    var allPosts = DataStore.getPosts(); // 获取所有动态一次

    function activateTab(tabKey) {
      tabs.forEach(function (tab) {
        var isActive = tab.getAttribute('data-profile-tab') === tabKey;
        tab.classList.toggle('is-active', isActive);
        // 如果是“我的收藏”且不是自己，则禁用
        if (tabKey === 'favorites' && tab.hasAttribute('data-profile-self-only') && (!currentUser || currentUser.id !== profileUser.id)) {
          tab.disabled = true;
          tab.title = '仅自己可见';
        } else {
          tab.disabled = false;
          tab.title = '';
        }
      });
      panels.forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-profile-panel') !== tabKey;
      });

      // 根据 Tab Key 渲染内容
      var stats = computeStats(profileUser); // 每次切换Tab重新计算，确保数据最新
      if (tabKey === 'posts') {
        renderPostsTab(profileUser, currentUser, allPosts);
      } else if (tabKey === 'favorites') {
        if (currentUser && currentUser.id === profileUser.id) {
          renderFavoritesTab(profileUser, currentUser);
        } else {
          qs('#profileFavoritesContainer').innerHTML = '<p class="empty-state">此内容仅主人可见。</p>';
        }
      } else if (tabKey === 'photos') {
        renderPhotosTab(profileUser);
      } else if (tabKey === 'about') {
        renderAboutTab(profileUser, currentUser, stats);
      }
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var tabKey = tab.getAttribute('data-profile-tab');
        // 如果是“我的收藏”且不是自己，阻止切换
        if (tabKey === 'favorites' && tab.hasAttribute('data-profile-self-only') && (!currentUser || currentUser.id !== profileUser.id)) {
          window.alert('抱歉，此内容仅主人可见！');
          return;
        }
        activateTab(tabKey);
      });
    });

    // 默认激活“我的动态” Tab
    activateTab('posts');
  }

  // --- 编辑资料模态框提交逻辑 (更新后的) ---
  function initEditProfileModal(profileUser, currentUser) {
    var editForm = qs('#editProfileForm');
    if (editForm) {
      // 填充现有数据
      qs('#editNicknameInput').value = profileUser.nickname || '';
      qs('#editBioInput').value = profileUser.bio || '';
      qs('#editAvatarInput').value = profileUser.avatar || '';

      editForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var nickname = qs('#editNicknameInput').value.trim();
        var bio = qs('#editBioInput').value.trim();
        var avatar = qs('#editAvatarInput').value.trim();
        if (!nickname) {
          window.alert('昵称不能为空');
          return;
        }
        
        var updatedProfileUser = DataStore.updateUser(profileUser.id, {
          nickname: nickname,
          bio: bio,
          avatar: avatar,
        });

        // 如果是当前用户更新，Auth 模块也要同步更新
        if (currentUser && currentUser.id === updatedProfileUser.id) {
            Auth.setCurrentUser(updatedProfileUser);
        }

        DataStore.updateUserLastActiveTime(updatedProfileUser.id);
        
        closeModal('editProfileModal');
        window.alert('资料更新成功！');
        // 刷新页面以显示最新数据
        window.location.reload();
      });
    }
  }

  // --- 初始化入口 ---
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
      qs('.main--profile').innerHTML = '<p class="empty-state">该用户不存在或已被删除。</p>';
      return;
    }

    // 记录访问量（如果不是自己访问自己的主页）
    if (!currentUser || currentUser.id !== profileUser.id) {
      DataStore.incrementUserVisitCount(profileUser.id);
    }
    // 获取最新的用户访问量
    var visitCount = DataStore.getUserVisitCount(profileUser.id); 

    var stats = computeStats(profileUser);
    renderProfileHero(profileUser, currentUser, stats);
    // 这里不再需要 updateStatsUI, updateMetricsUI, updateLastActiveUI, renderGallery，因为它们都被整合或由 Tab 渲染负责了。

    initProfileTabs(profileUser, currentUser);
    initModalTriggers(); // 确保模态框关闭功能可用
    initEditProfileModal(profileUser, currentUser); // 编辑资料模态框的逻辑
    // initNewPostShortcut() 可以在 main.js 中处理，这里不需要
  });
})(window, document, window.DataStore, window.Auth, window.Render);