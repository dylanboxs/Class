/* =========================================================
   应用入口与路由
   ========================================================= */
(function () {
  'use strict';

  const ROUTES = {
    dashboard: { view: 'DashboardView', title: '班级总览', subtitle: '成绩、出勤与积分的整体情况' },
    students: { view: 'StudentsView', title: '学生管理', subtitle: '维护班级名单、小组与基础信息' },
    grades: { view: 'GradesView', title: '成绩分析', subtitle: '录入考试成绩，按增减幅度自动生成奖惩' },
    attendance: { view: 'AttendanceView', title: '出勤管理', subtitle: '登记每日考勤，迟到与缺勤自动计分' },
    violations: { view: 'ViolationsView', title: '违规记录', subtitle: '记录违纪情况，跟踪需要关注的学生' },
    rewards: { view: 'RewardsView', title: '奖惩积分', subtitle: '积分排行榜、流水与手动加减分' },
    settings: { view: 'SettingsView', title: '系统设置', subtitle: '班级信息、奖惩规则与数据备份' }
  };

  const App = {
    currentRoute: '',

    render() {
      const hash = location.hash.replace(/^#\//, '');
      const route = ROUTES[hash] ? hash : 'dashboard';
      const config = ROUTES[route];
      const view = window[config.view];
      if (!view) return;

      this.currentRoute = route;

      document.querySelectorAll('.nav-item').forEach((item) => {
        item.classList.toggle('active', item.getAttribute('data-route') === route);
      });
      document.getElementById('page-title').textContent = config.title;
      document.getElementById('page-subtitle').textContent = config.subtitle;

      const el = document.getElementById('view');
      el.innerHTML = view.render();
      if (view.mount) view.mount();

      const chip = document.getElementById('sidebar-class');
      if (chip) {
        const m = Store.state.meta;
        chip.textContent = `${m.className} · ${m.teacher}`;
        chip.title = `${m.school} · ${m.term}`;
      }
    }
  };

  window.App = App;

  Store.init();

  document.getElementById('today-label').textContent = UI.todayLabel();

  window.addEventListener('hashchange', () => App.render());

  if (!location.hash) {
    location.hash = '#/dashboard';
  } else {
    App.render();
  }
})();
