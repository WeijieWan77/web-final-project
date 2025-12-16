// auth.js - 认证与授权逻辑
// 负责：注册校验、登录/注销、管理员检查、简单密码加密模拟

(function (window, DataStore) {
  if (!DataStore) {
    // 若 data-store 未加载，则直接返回，避免报错
    return;
  }

  function simpleHashPassword(studentId, rawPassword) {
    // 非真实加密，仅用于演示
    return 'hashed_' + String(studentId) + '_' + String(rawPassword);
  }

  function registerBasic({ studentId, password, confirmPassword, nickname }) {
    const result = { success: false, message: '', data: null };

    if (!studentId || !password || !confirmPassword || !nickname) {
      result.message = '请完整填写所有必填字段';
      return result;
    }

    if (!/^\d+$/.test(studentId)) {
      result.message = '学号必须为纯数字';
      return result;
    }

    if (password.length < 6) {
      result.message = '密码长度需大于 6 位';
      return result;
    }

    if (password !== confirmPassword) {
      result.message = '两次输入的密码不一致';
      return result;
    }

    if (DataStore.getUserByStudentId(studentId)) {
      result.message = '该学号已被注册，请直接登录或更换学号';
      return result;
    }

    const hashed = simpleHashPassword(studentId, password);

    const pending = {
      studentId,
      nickname,
      password: hashed,
    };

    DataStore.setPendingRegistration(pending);
    result.success = true;
    result.data = pending;
    return result;
  }

  function completeRegistration({ tags, avatar }) {
    const result = { success: false, message: '', data: null };
    const pending = DataStore.getPendingRegistration();

    if (!pending) {
      result.message = '未找到待完成的注册信息，请重新填写注册表单';
      return result;
    }

    const finalUser = DataStore.addUser({
      studentId: pending.studentId,
      nickname: pending.nickname,
      password: pending.password,
      avatar: avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=CL',
      tags: Array.isArray(tags) ? tags.slice(0, 8) : [],
    });

    DataStore.setPendingRegistration(null);

    // 自动登录
    DataStore.setCurrentUserId(finalUser.id);

    result.success = true;
    result.data = finalUser;
    return result;
  }

  function login({ studentId, password, rememberMe }) {
    const result = { success: false, message: '', data: null };

    if (!studentId || !password) {
      result.message = '请输入学号和密码';
      return result;
    }

    const user = DataStore.getUserByStudentId(studentId);
    if (!user) {
      result.message = '账号不存在，请检查学号或先注册';
      return result;
    }

    if (user.isBanned) {
      result.message = '该账号已被管理员封禁，如有疑问请联系管理员';
      return result;
    }

    const hashed = simpleHashPassword(studentId, password);
    if (user.password !== hashed && user.password !== 'hashed_admin_123456' && user.password !== 'hashed_' + studentId + '_123456') {
      // 兼容默认 mock 用户的预置密码
      result.message = '密码错误，请重试';
      return result;
    }

    DataStore.setCurrentUserId(user.id);

    if (rememberMe) {
      DataStore.setRememberedStudentId(studentId);
    } else {
      DataStore.setRememberedStudentId('');
    }

    result.success = true;
    result.data = user;
    return result;
  }

  function logout() {
    DataStore.setCurrentUserId(null);
  }

  function getCurrentUser() {
    return DataStore.getCurrentUser();
  }

  function isLoggedIn() {
    return !!getCurrentUser();
  }

  function isAdmin() {
    const user = getCurrentUser();
    return !!user && user.role === 'admin';
  }

  function requireAdmin(options) {
    var redirectTo = (options && options.redirectTo) || 'index.html';
    if (!isAdmin()) {
      window.alert('仅管理员可以访问该页面，将返回首页');
      window.location.href = redirectTo;
    }
  }

  function ensureAuthForPage() {
    // 可选：在需要登录的页面调用，非强制
    if (!isLoggedIn()) {
      return null;
    }
    return getCurrentUser();
  }

  function getRememberedStudentId() {
    return DataStore.getRememberedStudentId();
  }

  // 暴露到全局
  window.Auth = {
    simpleHashPassword,
    registerBasic,
    completeRegistration,
    login,
    logout,
    getCurrentUser,
    isLoggedIn,
    isAdmin,
    requireAdmin,
    ensureAuthForPage,
    getRememberedStudentId,
  };
})(window, window.DataStore);
