// data-store.js - 核心数据层 & localStorage 封装
// 负责：
// 1. 初始化默认 Mock 数据（用户 / 动态 / 评论）
// 2. 统一封装 localStorage 存取
// 3. 提供对外数据操作 API：用户 / 动态 / 评论 / 点赞 / 关注

(function (window) {
  const STORAGE_KEYS = {
    users: 'campuslife_users',
    posts: 'campuslife_posts_v2',
    comments: 'campuslife_comments',
    currentUserId: 'campuslife_currentUserId',
    rememberedStudentId: 'campuslife_rememberedStudentId',
    theme: 'campuslife_theme',
    glassEffect: 'campuslife_glassEffect', // 毛玻璃效果偏好
    cardOpacity: 'campuslife_cardOpacity', // 卡片透明度偏好
    pendingRegistration: 'campuslife_pendingRegistration',
    userVisits: 'campuslife_userVisits', // 用户主页访问量
    favorites: 'campuslife_favorites', // 用户收藏的动态ID列表
    reposts: 'campuslife_reposts', // 转发记录
    groups: 'campuslife_groups', // 用户群组
    checkins: 'campuslife_checkins', // 打卡签到记录
  };

  function safeParse(json, fallback) {
    try {
      return json ? JSON.parse(json) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function getItemJSON(key, fallback) {
    const raw = window.localStorage.getItem(key);
    return safeParse(raw, fallback);
  }

  function setItemJSON(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 8);
  }

  function initMockDataIfNeeded() {
    const hasUsers = !!window.localStorage.getItem(STORAGE_KEYS.users);
    const hasPosts = !!window.localStorage.getItem(STORAGE_KEYS.posts);
    const hasComments = !!window.localStorage.getItem(STORAGE_KEYS.comments);

    // 强制更新头像为本地路径的迁移逻辑
    if (hasUsers) {
      const existingUsers = safeParse(window.localStorage.getItem(STORAGE_KEYS.users), []);
      let changed = false;
      const avatarMap = {
        'u_admin': 'img/user picture/adventurer-1766570006973.jpg',
        'u_10001': 'img/user picture/adventurer-1766570014487.jpg',
        'u_10002': 'img/user picture/adventurer-1766570021937.jpg'
      };

      existingUsers.forEach(u => {
        if (avatarMap[u.id] && u.avatar !== avatarMap[u.id]) {
          u.avatar = avatarMap[u.id];
          changed = true;
        } else if (u.avatar && u.avatar.includes('dicebear')) {
          // 如果是其他使用旧 dicebear 头像的用户，随机分配一个本地头像
          const localAvatars = [
            'img/user picture/adventurer-1766570006973.jpg',
            'img/user picture/adventurer-1766570011526.jpg',
            'img/user picture/adventurer-1766570014487.jpg',
            'img/user picture/adventurer-1766570016794.jpg',
            'img/user picture/adventurer-1766570021937.jpg',
            'img/user picture/adventurer-1766570024612.jpg',
            'img/user picture/adventurer-1766570026574.jpg',
            'img/user picture/adventurer-1766570028745.jpg'
          ];
          u.avatar = localAvatars[Math.floor(Math.random() * localAvatars.length)];
          changed = true;
        }
      });

      if (changed) {
        setItemJSON(STORAGE_KEYS.users, existingUsers);
      }
    }

    if (hasUsers && hasPosts && hasComments) return;

    const now = Date.now();

    const users = [
      {
        id: 'u_admin',
        studentId: 'admin',
        password: 'hashed_admin_123456', // 对应密码：123456（模拟加密后）
        avatar: 'img/user picture/adventurer-1766570006973.jpg',
        nickname: '校园管理员',
        bio: '维护校园社区秩序的小助手。',
        tags: ['#管理员', '#文明校园'],
        following: [],
        isBanned: false,
        role: 'admin',
      },
      {
        id: 'u_10001',
        studentId: '20230001',
        password: 'hashed_20230001_123456',
        avatar: 'img/user picture/adventurer-1766570014487.jpg',
        nickname: '图书馆的猫',
        bio: '常出没于自习室和图书馆的一只猫。',
        tags: ['#考研', '#早起打卡', '#学习分享'],
        following: ['u_10002'],
        isBanned: false,
        role: 'user',
      },
      {
        id: 'u_10002',
        studentId: '20230002',
        password: 'hashed_20230002_123456',
        avatar: 'img/user picture/adventurer-1766570021937.jpg',
        nickname: '操场跑者',
        bio: '日更三公里，欢迎一起夜跑。',
        tags: ['#运动', '#跑步', '#健康生活'],
        following: ['u_10001'],
        isBanned: false,
        role: 'user',
      },
    ];

    const posts = [
      {
        id: 'p_1',
        authorId: 'u_10001',
        content: '今晚图书馆自习到十点，有没有一起冲刺期末的？分享一下效率学习的小技巧~',
        images: [
          'img/Library night.jpg',
        ],
        likes: 8,
        timestamp: now - 1000 * 60 * 60 * 2,
        tags: ['#考研', '#自习室'],
        visibility: 'public',
      },
      {
        id: 'p_2',
        authorId: 'u_10002',
        content: '今天操场夜跑三公里收工！风有点大，但跑完真的超级舒服。',
        images: [
          'img/Night Run 1.jpg',
          'img/Night Run 2.jpg',
        ],
        likes: 12,
        timestamp: now - 1000 * 60 * 60 * 5,
        tags: ['#运动', '#跑步'],
        visibility: 'public',
      },
      {
        id: 'p_3',
        authorId: 'u_10002',
        content: '南门那家新开的奶茶店排队好长！不过芝士奶盖真的绝了~',
        images: [
          'img/Cheese foam tea.jpg',
        ],
        likes: 20,
        timestamp: now - 1000 * 60 * 60 * 24,
        tags: ['#美食', '#奶茶'],
        visibility: 'public',
      },
      {
        id: 'p_4',
        authorId: 'u_10001',
        content: '期末周打卡 Day 3：今天在实验室写了一天报告，头有点大，晚上打算去操场走走放松一下。',
        images: [
            'img/Glasses on book.jpg',
        ],
        likes: 5,
        timestamp: now - 1000 * 60 * 30,
        tags: ['#期末周', '#报告'],
        visibility: 'public',
      },
      {
        id: 'p_5',
        authorId: 'u_10001',
        content: '分享一份自制的复习计划表，有需要的同学可以自取～',
        images: [
          'img/Study planner.jpg',
          'img/Library aesthetic.jpg',
          'img/Finals Study.jpg',
        ],
        likes: 15,
        timestamp: now - 1000 * 60 * 90,
        tags: ['#考研', '#学习分享'],
        visibility: 'public',
      },
    ];

    const comments = [
      {
        id: 'c_1',
        postId: 'p_1',
        userId: 'u_10002',
        content: '冲！我今晚也在自习室，期末一起加油！',
        timestamp: now - 1000 * 60 * 30,
      },
      {
        id: 'c_2',
        postId: 'p_2',
        userId: 'u_10001',
        content: '太励志了，下次带上我一起跑～',
        timestamp: now - 1000 * 60 * 45,
      },
      {
        id: 'c_3',
        postId: 'p_3',
        userId: 'u_10001',
        content: '奶茶店是哪家呀？想去冲一杯～',
        timestamp: now - 1000 * 60 * 60 * 20,
      },
    ];

    setItemJSON(STORAGE_KEYS.users, users);
    setItemJSON(STORAGE_KEYS.posts, posts);
    setItemJSON(STORAGE_KEYS.comments, comments);
  }

  // --- 用户相关 API ---

  function getUsers() {
    return getItemJSON(STORAGE_KEYS.users, []);
  }

  function saveUsers(users) {
    setItemJSON(STORAGE_KEYS.users, users);
  }

  function getUserById(userId) {
    return getUsers().find((u) => u.id === userId) || null;
  }

  function getUserByStudentId(studentId) {
    return getUsers().find((u) => u.studentId === studentId) || null;
  }

  function addUser(userPartial) {
    const users = getUsers();
    const newUser = {
      id: generateId('u'),
      avatar: '',
      bio: '',
      tags: [],
      following: [],
      isBanned: false,
      role: 'user',
      ...userPartial,
    };
    users.push(newUser);
    saveUsers(users);
    return newUser;
  }

  function updateUser(userId, updates) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    return users[idx];
  }

  // --- 用户活跃时间 ---
  function updateUserLastActiveTime(userId) {
    const user = getUserById(userId);
    if (!user) return;
    updateUser(userId, {
      lastActiveTime: Date.now(),
    });
  }

  function getUserLastActiveTime(userId) {
    const user = getUserById(userId);
    return user ? (user.lastActiveTime || null) : null;
  }

  // --- 用户访问量 ---
  function getUserVisits() {
    return getItemJSON(STORAGE_KEYS.userVisits, {});
  }

  function saveUserVisits(visits) {
    setItemJSON(STORAGE_KEYS.userVisits, visits);
  }

  function incrementUserVisitCount(userId) {
    const visits = getUserVisits();
    visits[userId] = (visits[userId] || 0) + 1;
    saveUserVisits(visits);
    return visits[userId];
  }

  function getUserVisitCount(userId) {
    const visits = getUserVisits();
    return visits[userId] || 0;
  }

  // --- 关注关系 ---

  function followUser(followerId, targetUserId) {
    if (followerId === targetUserId) return;
    const users = getUsers();
    const follower = users.find((u) => u.id === followerId);
    if (!follower) return;
    if (!follower.following.includes(targetUserId)) {
      follower.following.push(targetUserId);
      saveUsers(users);
    }
  }

  function unfollowUser(followerId, targetUserId) {
    const users = getUsers();
    const follower = users.find((u) => u.id === followerId);
    if (!follower) return;
    follower.following = follower.following.filter((id) => id !== targetUserId);
    saveUsers(users);
  }

  // --- 动态相关 API ---

  function getPosts() {
    return getItemJSON(STORAGE_KEYS.posts, []);
  }

  function savePosts(posts) {
    setItemJSON(STORAGE_KEYS.posts, posts);
  }

  function getPostById(postId) {
    return getPosts().find((p) => p.id === postId) || null;
  }

  function addPost(postPartial) {
    const posts = getPosts();
    const newPost = {
      id: generateId('p'),
      images: [],
      likes: 0,
      timestamp: Date.now(),
      tags: [],
      visibility: 'public',
      ...postPartial,
    };
    posts.unshift(newPost);
    savePosts(posts);
    return newPost;
  }

  function updatePost(postId, updates) {
    const posts = getPosts();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return null;
    posts[idx] = { ...posts[idx], ...updates };
    savePosts(posts);
    return posts[idx];
  }

  function deletePost(postId) {
    const posts = getPosts().filter((p) => p.id !== postId);
    savePosts(posts);
    // 同时删除该动态下的评论
    const comments = getComments().filter((c) => c.postId !== postId);
    saveComments(comments);
  }

  function toggleLike(postId, delta) {
    const posts = getPosts();
    const idx = posts.findIndex((p) => p.id === postId);
    if (idx === -1) return null;
    const current = posts[idx].likes || 0;
    const next = Math.max(0, current + (delta || 0));
    posts[idx].likes = next;
    savePosts(posts);
    return posts[idx];
  }

  // --- 评论相关 API ---

  function getComments() {
    return getItemJSON(STORAGE_KEYS.comments, []);
  }

  function saveComments(comments) {
    setItemJSON(STORAGE_KEYS.comments, comments);
  }

  function getCommentsByPostId(postId) {
    return getComments()
      .filter((c) => c.postId === postId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  function addComment(commentPartial) {
    const comments = getComments();
    const newComment = {
      id: generateId('c'),
      timestamp: Date.now(),
      ...commentPartial,
    };
    comments.push(newComment);
    saveComments(comments);
    return newComment;
  }

  function deleteComment(commentId) {
    const comments = getComments().filter((c) => c.id !== commentId);
    saveComments(comments);
  }

  // --- 当前登录状态 & 记住我 ---

  function getCurrentUserId() {
    return window.localStorage.getItem(STORAGE_KEYS.currentUserId) || null;
  }

  function setCurrentUserId(userId) {
    if (!userId) {
      window.localStorage.removeItem(STORAGE_KEYS.currentUserId);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.currentUserId, userId);
    }
  }

  function getCurrentUser() {
    const id = getCurrentUserId();
    return id ? getUserById(id) : null;
  }

  function getRememberedStudentId() {
    return window.localStorage.getItem(STORAGE_KEYS.rememberedStudentId) || '';
  }

  function setRememberedStudentId(studentId) {
    if (!studentId) {
      window.localStorage.removeItem(STORAGE_KEYS.rememberedStudentId);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.rememberedStudentId, studentId);
    }
  }

  // --- 主题 ---

  function getSavedTheme() {
    return window.localStorage.getItem(STORAGE_KEYS.theme) || '';
  }

  function setSavedTheme(theme) {
    if (!theme) {
      window.localStorage.removeItem(STORAGE_KEYS.theme);
    } else {
      window.localStorage.setItem(STORAGE_KEYS.theme, theme);
    }
  }

  function getSavedGlassEffect() {
    const saved = window.localStorage.getItem(STORAGE_KEYS.glassEffect);
    // 默认启用毛玻璃效果
    return saved === null ? true : saved === 'true';
  }

  function setSavedGlassEffect(enabled) {
    window.localStorage.setItem(STORAGE_KEYS.glassEffect, enabled ? 'true' : 'false');
  }

  function getSavedCardOpacity() {
    const saved = window.localStorage.getItem(STORAGE_KEYS.cardOpacity);
    // 默认透明（true = 透明，false = 不透明）
    return saved === null ? true : saved === 'true';
  }

  function setSavedCardOpacity(transparent) {
    window.localStorage.setItem(STORAGE_KEYS.cardOpacity, transparent ? 'true' : 'false');
  }

  // --- 注册临时数据（用于两步注册流程） ---

  function getPendingRegistration() {
    return getItemJSON(STORAGE_KEYS.pendingRegistration, null);
  }

  function setPendingRegistration(data) {
    if (!data) {
      window.localStorage.removeItem(STORAGE_KEYS.pendingRegistration);
    } else {
      setItemJSON(STORAGE_KEYS.pendingRegistration, data);
    }
  }

  // --- 收藏功能 ---
  function getUserFavorites(userId) {
    const favorites = getItemJSON(STORAGE_KEYS.favorites, {});
    return favorites[userId] || [];
  }

  function saveUserFavorites(userId, postIds) {
    const favorites = getItemJSON(STORAGE_KEYS.favorites, {});
    favorites[userId] = postIds;
    setItemJSON(STORAGE_KEYS.favorites, favorites);
  }

  function toggleFavorite(userId, postId) {
    const favorites = getUserFavorites(userId);
    const index = favorites.indexOf(postId);
    if (index === -1) {
      favorites.push(postId);
    } else {
      favorites.splice(index, 1);
    }
    saveUserFavorites(userId, favorites);
    return index === -1; // 返回true表示已收藏，false表示已取消
  }

  function isFavorite(userId, postId) {
    const favorites = getUserFavorites(userId);
    return favorites.indexOf(postId) !== -1;
  }

  // --- 转发功能 ---
  function addRepost(userId, originalPostId, content) {
    const reposts = getItemJSON(STORAGE_KEYS.reposts, []);
    const newRepost = {
      id: generateId('r'),
      userId: userId,
      originalPostId: originalPostId,
      content: content || '',
      timestamp: Date.now(),
    };
    reposts.push(newRepost);
    setItemJSON(STORAGE_KEYS.reposts, reposts);
    
    // 创建一个转发动态
    const originalPost = getPostById(originalPostId);
    if (originalPost) {
      const repostPost = addPost({
        authorId: userId,
        content: content || '转发动态',
        images: [],
        tags: [],
        visibility: 'public',
        repostedFrom: originalPostId,
        isRepost: true,
      });
      return { repost: newRepost, post: repostPost };
    }
    return { repost: newRepost, post: null };
  }

  function getRepostCount(postId) {
    const reposts = getItemJSON(STORAGE_KEYS.reposts, []);
    return reposts.filter(function (r) {
      return r.originalPostId === postId;
    }).length;
  }

  // --- 群组功能 ---
  function getGroups() {
    return getItemJSON(STORAGE_KEYS.groups, []);
  }

  function saveGroups(groups) {
    setItemJSON(STORAGE_KEYS.groups, groups);
  }

  function getGroupById(groupId) {
    return getGroups().find((g) => g.id === groupId) || null;
  }

  function createGroup(creatorId, name, description, avatar) {
    const groups = getGroups();
    const newGroup = {
      id: generateId('g'),
      name: name,
      description: description || '',
      avatar: avatar || 'img/user picture/adventurer-1766570006973.jpg', // 默认使用本地头像
      creatorId: creatorId,
      members: [creatorId],
      createdAt: Date.now(),
    };
    groups.push(newGroup);
    saveGroups(groups);
    return newGroup;
  }

  function joinGroup(userId, groupId) {
    const groups = getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return null;
    if (group.members.indexOf(userId) === -1) {
      group.members.push(userId);
      saveGroups(groups);
    }
    return group;
  }

  function leaveGroup(userId, groupId) {
    const groups = getGroups();
    const group = groups.find((g) => g.id === groupId);
    if (!group) return null;
    group.members = group.members.filter((id) => id !== userId);
    saveGroups(groups);
    return group;
  }

  function getUserGroups(userId) {
    return getGroups().filter((g) => g.members.indexOf(userId) !== -1);
  }

  function getGroupPosts(groupId) {
    return getPosts().filter((p) => p.groupId === groupId);
  }

  // --- 打卡签到功能 ---
  function getUserCheckins(userId) {
    const checkins = getItemJSON(STORAGE_KEYS.checkins, {});
    return checkins[userId] || [];
  }

  function saveUserCheckins(userId, checkinList) {
    const checkins = getItemJSON(STORAGE_KEYS.checkins, {});
    checkins[userId] = checkinList;
    setItemJSON(STORAGE_KEYS.checkins, checkins);
  }

  function addCheckin(userId, content) {
    const checkins = getUserCheckins(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    // 检查今天是否已签到
    const todayCheckin = checkins.find((c) => {
      const checkinDate = new Date(c.timestamp);
      checkinDate.setHours(0, 0, 0, 0);
      return checkinDate.getTime() === todayTimestamp;
    });
    
    if (todayCheckin) {
      return { success: false, message: '今天已经签到过了' };
    }
    
    const newCheckin = {
      id: generateId('ch'),
      userId: userId,
      content: content || '',
      timestamp: Date.now(),
    };
    checkins.unshift(newCheckin);
    saveUserCheckins(userId, checkins);
    
    // 计算连续签到天数
    const consecutiveDays = calculateConsecutiveDays(checkins);
    
    return { success: true, checkin: newCheckin, consecutiveDays: consecutiveDays };
  }

  function calculateConsecutiveDays(checkins) {
    if (!checkins || checkins.length === 0) return 0;
    
    let consecutive = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < checkins.length; i++) {
      const checkinDate = new Date(checkins[i].timestamp);
      checkinDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - checkinDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diffDays === consecutive) {
        consecutive++;
      } else {
        break;
      }
    }
    
    return consecutive;
  }

  function hasCheckedInToday(userId) {
    const checkins = getUserCheckins(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTimestamp = today.getTime();
    
    return checkins.some((c) => {
      const checkinDate = new Date(c.timestamp);
      checkinDate.setHours(0, 0, 0, 0);
      return checkinDate.getTime() === todayTimestamp;
    });
  }

  // --- 年度回顾数据统计 ---
  function getUserYearStats(userId, year) {
    year = year || new Date().getFullYear();
    const startTimestamp = new Date(year, 0, 1).getTime();
    const endTimestamp = new Date(year + 1, 0, 1).getTime();
    
    const posts = getPosts().filter((p) => {
      return p.authorId === userId && p.timestamp >= startTimestamp && p.timestamp < endTimestamp;
    });
    
    const comments = getComments().filter((c) => {
      return c.userId === userId && c.timestamp >= startTimestamp && c.timestamp < endTimestamp;
    });
    
    const checkins = getUserCheckins(userId).filter((c) => {
      return c.timestamp >= startTimestamp && c.timestamp < endTimestamp;
    });
    
    // 统计标签
    const tagCounts = {};
    posts.forEach((p) => {
      (p.tags || []).forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const topTags = Object.keys(tagCounts)
      .map((tag) => ({ tag: tag, count: tagCounts[tag] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // 统计点赞总数
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    
    // 统计最活跃的月份
    const monthCounts = {};
    posts.forEach((p) => {
      const month = new Date(p.timestamp).getMonth();
      monthCounts[month] = (monthCounts[month] || 0) + 1;
    });
    
    const mostActiveMonth = Object.keys(monthCounts)
      .map((m) => ({ month: parseInt(m), count: monthCounts[m] }))
      .sort((a, b) => b.count - a.count)[0];
    
    return {
      year: year,
      postsCount: posts.length,
      commentsCount: comments.length,
      checkinsCount: checkins.length,
      totalLikes: totalLikes,
      topTags: topTags,
      mostActiveMonth: mostActiveMonth ? mostActiveMonth.month : null,
    };
  }

  // 初始化默认数据
  initMockDataIfNeeded();

  // 对外暴露 API
  window.DataStore = {
    STORAGE_KEYS,
    // 用户
    getUsers,
    saveUsers,
    getUserById,
    getUserByStudentId,
    addUser,
    updateUser,
    followUser,
    unfollowUser,
    // 动态
    getPosts,
    savePosts,
    getPostById,
    addPost,
    updatePost,
    deletePost,
    toggleLike,
    // 评论
    getComments,
    saveComments,
    getCommentsByPostId,
    addComment,
    deleteComment,
    // 登录状态 & 记住我
    getCurrentUserId,
    setCurrentUserId,
    getCurrentUser,
    getRememberedStudentId,
    setRememberedStudentId,
    // 主题
    getSavedTheme,
    setSavedTheme,
    getSavedGlassEffect,
    setSavedGlassEffect,
    getSavedCardOpacity,
    setSavedCardOpacity,
    // 注册临时数据
    getPendingRegistration,
    setPendingRegistration,
    // 用户活跃时间和访问量
    updateUserLastActiveTime,
    getUserLastActiveTime,
    incrementUserVisitCount,
    getUserVisitCount,
    // 收藏功能
    getUserFavorites,
    toggleFavorite,
    isFavorite,
    // 转发功能
    addRepost,
    getRepostCount,
    // 群组功能
    getGroups,
    saveGroups,
    getGroupById,
    createGroup,
    joinGroup,
    leaveGroup,
    getUserGroups,
    getGroupPosts,
    // 打卡签到功能
    getUserCheckins,
    addCheckin,
    hasCheckedInToday,
    calculateConsecutiveDays,
    // 年度回顾
    getUserYearStats,
    // 工具
    getItemJSON,
    setItemJSON,
  };
})(window);
