// render.js - 视图渲染逻辑
// 负责将数据模型转换为 HTML 字符串，并提供插入 DOM 的辅助方法

(function (window, DataStore) {
  if (!DataStore) return;

  // --- 基础辅助函数 ---

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTimeAgo(timestamp) {
    const diff = Date.now() - timestamp;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return '刚刚';
    const min = Math.floor(sec / 60);
    if (min < 60) return min + ' 分钟前';
    const hour = Math.floor(min / 60);
    if (hour < 24) return hour + ' 小时前';
    const day = Math.floor(hour / 24);
    if (day < 7) return day + ' 天前';
    const date = new Date(timestamp);
    return (
      date.getFullYear() +
      '-' +
      String(date.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(date.getDate()).padStart(2, '0')
    );
  }

  // --- 新增：详情页专用渲染函数 ---


  function renderDetailMedia(post) {
    const images = Array.isArray(post.images) ? post.images : [];
    if (images.length === 0) {
      return '<div class="detail-media-empty">无图片内容</div>';
    }

    // 1. 构建轮播图容器
    let html = '<div class="detail-media-carousel" id="detailMediaCarousel">';
    images.forEach((url, index) => {
      html += `<div class="carousel-item">
                 <img src="${escapeHTML(url)}" alt="动态图片 ${index + 1}" class="carousel-img">
                 <div class="carousel-image-blur" style="background-image: url('${escapeHTML(url)}')"></div>
               </div>`;
    });
    html += '</div>';

    // 2. 构建指示器和切换按钮（只有多张图时才显示）
    if (images.length > 1) {
      // 指示器
      html += '<div class="carousel-indicators" id="carouselIndicators">';
      images.forEach((_, index) => {
        html += `<span class="indicator-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>`;
      });
      html += '</div>';

      // --- [新增] 左右切换按钮 ---
      html += `
        <button class="carousel-control prev" id="carouselPrevBtn" aria-label="上一张">❮</button>
        <button class="carousel-control next" id="carouselNextBtn" aria-label="下一张">❯</button>
      `;
    }

    return html;
  }

  function renderDetailHeader(author) {
     return '<div class="detail-user-card">' +
            '<a href="profile.html?userId=' + escapeHTML(author.id) + '">' +
            '<img src="' + escapeHTML(author.avatar) + '" class="detail-user-avatar">' +
            '</a>' +
            '<div class="detail-user-info">' +
            '<a href="profile.html?userId=' + escapeHTML(author.id) + '" class="detail-user-name">' + escapeHTML(author.nickname) + '</a>' +
            '<span class="detail-location">深圳大学</span>' +
            '</div>' +
            '</div>' +
            '<button class="btn-follow">关注</button>';
  }

  function renderDetailContent(post) {
    var tagsHtml = '';
    if (post.tags && post.tags.length) {
        tagsHtml = '<div class="post-card__tags" style="margin-top:8px;">' +
        post.tags.map(function(t){ return '<span class="tag">#'+escapeHTML(t)+'</span>'; }).join('') +
        '</div>';
    }
    return '<div style="margin-bottom:8px;">' + escapeHTML(post.content).replace(/\n/g, '<br>') + '</div>' + 
           tagsHtml + 
           '<div style="font-size:12px; color:#999; margin-top:12px;">' + formatTimeAgo(post.timestamp) + '</div>';
  }

  function renderDetailActions(post, currentUser) {
    var isLiked = false; // 此处需对接真实数据
    var isFavorited = currentUser && DataStore.isFavorite(currentUser.id, post.id);
    return '<div class="detail-actions-left">' +
           '<button class="action-icon-btn ' + (isLiked ? 'is-active' : '') + '" data-action="like">❤</button>' +
           '<button class="action-icon-btn" onclick="document.getElementById(\'commentContentInput\').focus()">💬</button>' +
           '<button class="action-icon-btn" data-action="repost">🔁</button>' +
           '</div>' +
           '<button class="action-icon-btn ' + (isFavorited ? 'is-starred' : '') + '" data-action="favorite">⭐</button>';
  }

  // --- 原有组件渲染函数 ---

  function buildImagesGrid(post) {
    const images = Array.isArray(post.images) ? post.images : [];
    if (!images.length) return '';
    const gridClass = images.length === 1 ? 'post-card__images-grid--single' : 'post-card__images-grid--multi';
    const imgs = images
      .slice(0, 9)
      .map(
        function (url, idx) {
          return (
            '<div class="post-card__image-wrapper" data-index="' + idx + '">' +
            '<img src="' + escapeHTML(url) + '" alt="动态图片" />' +
            '</div>'
          );
        }
      )
      .join('');
    return '<div class="post-card__images-grid ' + gridClass + '">' + imgs + '</div>';
  }

  function renderPostTags(tags) {
    if (!Array.isArray(tags) || !tags.length) return '';
    return (
      '<div class="post-card__tags">' +
      tags
        .slice(0, 5)
        .map(function (tag) {
          return '<span class="tag">' + escapeHTML(tag) + '</span>';
        })
        .join('') +
      '</div>'
    );
  }

  // !!! 修改后的 renderPostCard：添加了点击跳转逻辑 !!!
  function renderPostCard(post, author, currentUser) {
    author = author || DataStore.getUserById(post.authorId) || { nickname: '未知用户', avatar: '' };
    var isLiked = false; 
    var isFavorited = currentUser && DataStore.isFavorite(currentUser.id, post.id);
    var repostCount = DataStore.getRepostCount(post.id);
    
    var repostInfo = '';
    if (post.isRepost && post.repostedFrom) {
      var originalPost = DataStore.getPostById(post.repostedFrom);
      if (originalPost) {
        var originalAuthor = DataStore.getUserById(originalPost.authorId) || { nickname: '未知用户' };
        repostInfo = '<div class="post-card__repost-info">' +
                     '<span class="post-card__repost-label">🔁 转发自</span>' +
                     '<span class="post-card__repost-author">' + escapeHTML(originalAuthor.nickname) + '</span>' +
                     '</div>';
      }
    }

    // 生成详情页链接
    var detailUrl = 'detail.html?id=' + escapeHTML(post.id);

    return (
      '<article class="card post-card' + (post.isRepost ? ' post-card--repost' : '') + '" data-post-id="' + escapeHTML(post.id) + '">' +
      
      // 头部
      '<header class="post-card__meta">' +
      '<a class="post-card__avatar" href="profile.html?userId=' + escapeHTML(author.id || '') + '" onclick="event.stopPropagation()">' +
      '<img src="' + escapeHTML(author.avatar || '') + '" alt="头像" />' +
      '</a>' +
      '<div class="post-card__info" onclick="location.href=\'' + detailUrl + '\'" style="cursor:pointer;">' +
      '<div class="post-card__author">' + escapeHTML(author.nickname || '未知用户') + '</div>' +
      '<div class="post-card__time">' + formatTimeAgo(post.timestamp) + '</div>' +
      '</div>' +
      '</header>' +
      
      repostInfo +
      
      // 内容区域（点击跳转）
      '<div class="post-card__content" onclick="location.href=\'' + detailUrl + '\'" style="cursor:pointer;" data-role="post-content" data-full="0">' +
      escapeHTML(post.content) +
      '</div>' +
      
      // 图片区域（点击跳转）
      '<div onclick="location.href=\'' + detailUrl + '\'" style="cursor:pointer;">' +
      buildImagesGrid(post) +
      '</div>' +
      
      renderPostTags(post.tags) +
      
      // 底部操作栏
      '<footer class="post-card__footer">' +
      '<div class="post-card__actions">' +
      
      // 点赞（阻止冒泡，不跳转）
      '<button type="button" class="post-card__action post-card__action--like' +
      (isLiked ? ' is-liked' : '') +
      '" data-action="like" aria-label="点赞">' +
      '<span>❤</span><span>' + (post.likes || 0) + '</span>' +
      '</button>' +
      
      // 评论（点击跳转）
      '<button type="button" class="post-card__action" onclick="location.href=\'' + detailUrl + '\'" aria-label="评论">' +
      '<span>💬</span><span>评论</span>' +
      '</button>' +
      
      // 转发
      '<button type="button" class="post-card__action post-card__action--repost' +
      (post.isRepost ? ' is-reposted' : '') +
      '" data-action="repost" aria-label="转发">' +
      '<span>🔁</span><span>' + repostCount + '</span>' +
      '</button>' +
      
      // 收藏
      '<button type="button" class="post-card__action post-card__action--favorite' +
      (isFavorited ? ' is-favorited' : '') +
      '" data-action="favorite" aria-label="收藏">' +
      '<span>' + (isFavorited ? '⭐' : '☆') + '</span><span>收藏</span>' +
      '</button>' +
      '</div>' +
      
      // 查看详情链接
      '<a href="' + detailUrl + '" class="link-button">查看详情 &gt;</a>' +
      '</footer>' +
      '</article>'
    );
  }

  function renderPostList(posts, users, currentUser) {
    users = users || DataStore.getUsers();
    var userMap = {};
    users.forEach(function (u) {
      userMap[u.id] = u;
    });
    return posts
      .map(function (post) {
        return renderPostCard(post, userMap[post.authorId], currentUser);
      })
      .join('');
  }

  function renderCommentItem(comment, user) {
    user = user || DataStore.getUserById(comment.userId) || { nickname: '匿名', avatar: '' };
    return (
      '<li class="comment-item" data-comment-id="' +
      escapeHTML(comment.id) +
      '">' +
      '<div class="comment-item__avatar">' +
      '<img src="' + escapeHTML(user.avatar || '') + '" alt="头像" />' +
      '</div>' +
      '<div class="comment-item__body">' +
      '<div class="comment-item__meta">' +
      '<span>' + escapeHTML(user.nickname || '匿名') + '</span>' +
      '<span>' + formatTimeAgo(comment.timestamp) + '</span>' +
      '</div>' +
      '<div class="comment-item__content">' + escapeHTML(comment.content) + '</div>' +
      '</div>' +
      '</li>'
    );
  }

  function renderCommentList(comments, users) {
    users = users || DataStore.getUsers();
    var userMap = {};
    users.forEach(function (u) {
      userMap[u.id] = u;
    });
    return comments
      .map(function (c) {
        return renderCommentItem(c, userMap[c.userId]);
      })
      .join('');
  }

  function renderHotTopics(topics) {
    return topics
      .slice(0, 10)
      .map(function (t, index) {
        return (
          '<li class="hot-topic-item" data-topic="' +
          escapeHTML(t.tag) +
          '">' +
          '<span class="hot-topic-item__rank">#' +
          (index + 1) +
          '</span>' +
          '<span class="hot-topic-item__name">' +
          escapeHTML(t.tag) +
          '</span>' +
          '<span class="hot-topic-item__count">' +
          t.count +
          '</span>' +
          '</li>'
        );
      })
      .join('');
  }

  function renderActiveUsersList(users) {
    return users
      .slice(0, 8)
      .map(function (u) {
        return (
          '<li class="active-user-item" data-user-id="' +
          escapeHTML(u.id) +
          '">' +
          '<div class="active-user-item__avatar">' +
          '<img src="' + escapeHTML(u.avatar || '') + '" alt="头像" />' +
          '</div>' +
          '<div class="active-user-item__info">' +
          '<div class="active-user-item__name">' + escapeHTML(u.nickname || '') + '</div>' +
          '<div class="active-user-item__tags">' +
          (Array.isArray(u.tags) ? u.tags.slice(0, 2).map(escapeHTML).join(' ') : '') +
          '</div>' +
          '</div>' +
          '</li>'
        );
      })
      .join('');
  }

  function renderPostDetail(post, author) {
    // 兼容旧逻辑，防止报错
    author = author || DataStore.getUserById(post.authorId) || { nickname: '未知用户', avatar: '' };
    
    var repostInfo = '';
    var originalContent = '';
    if (post.isRepost && post.repostedFrom) {
      var originalPost = DataStore.getPostById(post.repostedFrom);
      if (originalPost) {
        var originalAuthor = DataStore.getUserById(originalPost.authorId) || { nickname: '未知用户', avatar: '' };
        repostInfo = '<div class="post-card__repost-info">' +
                     '<span class="post-card__repost-label">🔁 转发自</span>' +
                     '<a href="profile.html?userId=' + escapeHTML(originalAuthor.id || '') + '" class="post-card__repost-author">' + 
                     escapeHTML(originalAuthor.nickname) + '</a>' +
                     '</div>';
        originalContent = 
          '<div class="post-card--repost post-card" style="margin-top: 12px; padding: 12px; background-color: var(--color-surface-soft); border-radius: var(--radius-md);">' +
          '<header class="post-card__meta">' +
          '<a class="post-card__avatar" href="profile.html?userId=' + escapeHTML(originalAuthor.id || '') + '">' +
          '<img src="' + escapeHTML(originalAuthor.avatar || '') + '" alt="头像" />' +
          '</a>' +
          '<div class="post-card__info">' +
          '<div class="post-card__author">' + escapeHTML(originalAuthor.nickname || '未知用户') + '</div>' +
          '<div class="post-card__time">' + formatTimeAgo(originalPost.timestamp) + '</div>' +
          '</div>' +
          '</header>' +
          '<div class="post-card__content">' + escapeHTML(originalPost.content || '') + '</div>' +
          buildImagesGrid(originalPost) +
          renderPostTags(originalPost.tags) +
          '</div>';
      }
    }
    
    return (
      '<header class="post-card__meta">' +
      '<a class="post-card__avatar" href="profile.html?userId=' +
      escapeHTML(author.id || '') +
      '">' +
      '<img src="' + escapeHTML(author.avatar || '') + '" alt="头像" />' +
      '</a>' +
      '<div class="post-card__info">' +
      '<div class="post-card__author">' + escapeHTML(author.nickname || '未知用户') + '</div>' +
      '<div class="post-card__time">' + formatTimeAgo(post.timestamp) + '</div>' +
      '</div>' +
      '</header>' +
      repostInfo +
      '<div class="post-card__content post-detail__content">' + escapeHTML(post.content) + '</div>' +
      buildImagesGrid(post) +
      renderPostTags(post.tags) +
      originalContent
    );
  }

  function renderEmojiPicker(emojis) {
    return emojis
      .map(function (e) {
        return (
          '<button type="button" class="emoji-picker__item" data-emoji="' +
          escapeHTML(e) +
          '">' +
          e +
          '</button>'
        );
      })
      .join('');
  }

  function setHTMLById(id, html) {
    var el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  // --- 导出全局对象 ---

  window.Render = {
    escapeHTML: escapeHTML,
    formatTimeAgo: formatTimeAgo,
    renderPostCard: renderPostCard,
    renderPostList: renderPostList,
    
    // 详情页新函数 (已正确包含在作用域内)
    renderDetailMedia: renderDetailMedia,
    renderDetailHeader: renderDetailHeader,
    renderDetailContent: renderDetailContent,
    renderDetailActions: renderDetailActions,
    
    renderCommentItem: renderCommentItem,
    renderCommentList: renderCommentList,
    renderHotTopics: renderHotTopics,
    renderActiveUsersList: renderActiveUsersList,
    renderPostDetail: renderPostDetail, // 兼容导出
    renderEmojiPicker: renderEmojiPicker,
    setHTMLById: setHTMLById,
  };

})(window, window.DataStore);