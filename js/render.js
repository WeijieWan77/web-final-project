// render.js - 视图渲染逻辑
// 负责将数据模型转换为 HTML 字符串，并提供插入 DOM 的辅助方法

(function (window, DataStore) {
  if (!DataStore) return;

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

  function renderPostCard(post, author, currentUser) {
    author = author || DataStore.getUserById(post.authorId) || { nickname: '未知用户', avatar: '' };
    var isLiked = false; // 点赞状态可以在将来扩展为 per-user，这里暂用样式占位

    return (
      '<article class="card post-card" data-post-id="' +
      escapeHTML(post.id) +
      '">' +
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
      '<div class="post-card__content" data-role="post-content" data-full="0">' +
      escapeHTML(post.content) +
      '</div>' +
      buildImagesGrid(post) +
      renderPostTags(post.tags) +
      '<footer class="post-card__footer">' +
      '<div class="post-card__actions">' +
      '<button type="button" class="post-card__action post-card__action--like' +
      (isLiked ? ' is-liked' : '') +
      '" data-action="like" aria-label="点赞">' +
      '<span>❤</span><span>' + (post.likes || 0) + '</span>' +
      '</button>' +
      '<button type="button" class="post-card__action" data-action="comment" aria-label="评论">' +
      '<span>💬</span><span>评论</span>' +
      '</button>' +
      '</div>' +
      '<button type="button" class="link-button" data-action="open-detail">查看详情 &gt;</button>' +
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
    author = author || DataStore.getUserById(post.authorId) || { nickname: '未知用户', avatar: '' };
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
      '<div class="post-card__content post-detail__content">' + escapeHTML(post.content) + '</div>' +
      buildImagesGrid(post) +
      renderPostTags(post.tags)
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

  window.Render = {
    escapeHTML: escapeHTML,
    formatTimeAgo: formatTimeAgo,
    // 动态
    renderPostCard: renderPostCard,
    renderPostList: renderPostList,
    renderPostDetail: renderPostDetail,
    // 评论
    renderCommentItem: renderCommentItem,
    renderCommentList: renderCommentList,
    // 侧边栏
    renderHotTopics: renderHotTopics,
    renderActiveUsersList: renderActiveUsersList,
    // Emoji
    renderEmojiPicker: renderEmojiPicker,
    // DOM helper
    setHTMLById: setHTMLById,
  };
})(window, window.DataStore);
