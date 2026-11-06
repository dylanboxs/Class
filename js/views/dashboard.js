/* =========================================================
   班级总览
   ========================================================= */
(function () {
  'use strict';

  const V = {};

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return '夜深了';
    if (h < 12) return '上午好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  }

  V.render = function () {
    const s = Store.state;
    const sum = Store.summary();
    const lb = Store.leaderboard();
    const groups = new Set(s.students.map((x) => x.group)).size;

    const latest = sum.latest;
    const exams = Store.exams();
    const prevExam = exams.length > 1 ? exams[exams.length - 2] : null;
    const prevStats = prevExam ? Store.examStats(prevExam.id) : null;
    const avgDelta = (sum.stats && prevStats) ? sum.stats.avg - prevStats.avg : null;

    const statusCount = { present: 0, late: 0, leave: 0, absent: 0 };
    s.attendance.forEach((day) => {
      Object.keys(day.records).forEach((sid) => {
        const st = day.records[sid];
        if (st in statusCount) statusCount[st]++;
      });
    });
    const attendanceTotal = statusCount.present + statusCount.late + statusCount.leave + statusCount.absent;

    const recent = Store.records().slice(0, 8);
    const top5 = lb.slice(0, 5);
    const watch = lb.filter((x) => x.points < 0 || Store.violationCount(x.student.id) >= 2).slice(-3).reverse();

    const statCards = `
      <div class="stat teal">
        <div class="stat-label">班级人数</div>
        <div class="stat-value">${sum.studentCount}<small>人</small></div>
        <div class="stat-foot">共 ${groups} 个学习小组</div>
      </div>
      <div class="stat blue">
        <div class="stat-label">最近考试均分</div>
        <div class="stat-value">${sum.stats ? sum.stats.avg.toFixed(1) : '—'}</div>
        <div class="stat-foot">${latest ? UI.esc(latest.name) : '暂无考试'}${avgDelta != null ? ' · ' + UI.delta(Math.round(avgDelta * 10) / 10, ' 分') : ''}</div>
      </div>
      <div class="stat">
        <div class="stat-label">整体出勤率</div>
        <div class="stat-value">${UI.pct(sum.attendanceRate)}</div>
        <div class="stat-foot">累计 ${attendanceTotal} 人次记录</div>
      </div>
      <div class="stat rose">
        <div class="stat-label">违规记录</div>
        <div class="stat-value rose">${sum.violationTotal}<small>次</small></div>
        <div class="stat-foot">涉及 ${new Set(s.violations.map((v) => v.studentId)).size} 名学生</div>
      </div>`;

    const leaderRows = top5.length ? top5.map((x, i) => `
      <div class="list-row">
        <span class="rank-badge ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
        ${UI.avatar(x.student, 26)}
        <div class="grow">
          <div class="title">${UI.esc(x.student.name)}</div>
          <div class="meta">${UI.esc(x.student.group)}</div>
        </div>
        <span class="pts ${x.points >= 0 ? 'pos' : 'neg'}">${x.points > 0 ? '+' : ''}${x.points}</span>
      </div>`).join('') : UI.empty('暂无积分记录');

    const watchRows = watch.length ? watch.map((x) => `
      <div class="list-row">
        ${UI.avatar(x.student, 26)}
        <div class="grow">
          <div class="title">${UI.esc(x.student.name)}</div>
          <div class="meta">违规 ${Store.violationCount(x.student.id)} 次 · 出勤率 ${UI.pct(Store.attendanceStats(x.student.id).rate)}</div>
        </div>
        <span class="pts ${x.points >= 0 ? 'pos' : 'neg'}">${x.points > 0 ? '+' : ''}${x.points}</span>
      </div>`).join('') : UI.empty('暂无需要特别关注的学生');

    const recentRows = recent.length ? recent.map((r) => {
      const st = Store.student(r.studentId);
      return `<div class="list-row">
        ${UI.avatar(st, 26)}
        <div class="grow">
          <div class="title">${UI.esc(st ? st.name : '未知学生')}<span style="font-weight:400;color:var(--text-3);font-size:11.5px"> · ${UI.esc(r.reason)}</span></div>
          <div class="meta">${UI.categoryPill(r.category)} <span style="margin-left:6px">${UI.dateLabel(r.date)}</span></div>
        </div>
        <span class="pts ${r.points >= 0 ? 'pos' : 'neg'}">${r.points > 0 ? '+' : ''}${r.points}</span>
      </div>`;
    }).join('') : UI.empty('暂无积分动态');

    return `
      <section class="hero">
        <div>
          <h2>${greeting()}，${UI.esc(s.meta.teacher)}</h2>
          <p>${UI.esc(s.meta.school)} · ${UI.esc(s.meta.className)} · ${UI.esc(s.meta.term)}</p>
        </div>
        <div class="hero-stats">
          <div class="hero-stat"><div class="v">${sum.stats ? sum.stats.avg.toFixed(1) : '—'}</div><div class="l">最近考试均分</div></div>
          <div class="hero-stat"><div class="v">${UI.pct(sum.attendanceRate)}</div><div class="l">整体出勤率</div></div>
          <div class="hero-stat"><div class="v">${sum.avgPoints.toFixed(1)}</div><div class="l">人均积分</div></div>
        </div>
      </section>

      <div class="grid cols-4" style="margin-top:16px">${statCards}</div>

      <div class="grid cols-2-1" style="margin-top:16px">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>成绩趋势</div>
            <span class="card-hint">班级平均分 · 按考试时间</span>
          </div>
          <div class="chart-box" id="chart-trend"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>出勤构成</div>
          </div>
          <div class="chart-box" id="chart-attendance" style="display:flex;justify-content:center"></div>
          <div class="legend" style="justify-content:center">
            <span><i style="background:#16897d"></i>出勤 ${statusCount.present}</span>
            <span><i style="background:#d9932f"></i>迟到 ${statusCount.late}</span>
            <span><i style="background:#3b6fa8"></i>请假 ${statusCount.leave}</span>
            <span><i style="background:#cf5b5b"></i>缺勤 ${statusCount.absent}</span>
          </div>
        </div>
      </div>

      <div class="grid cols-2-1" style="margin-top:16px">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>违规类型分布</div>
            <span class="card-hint">累计 ${sum.violationTotal} 次</span>
          </div>
          <div class="chart-box" id="chart-violation"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>积分榜 TOP 5</div>
            <a class="card-hint" href="#/rewards">查看全部 →</a>
          </div>
          <div class="list">${leaderRows}</div>
          ${watch.length ? `
          <div style="margin-top:14px;padding-top:12px;border-top:1px dashed var(--line)">
            <div class="card-title" style="font-size:12.5px;color:var(--rose);margin-bottom:4px"><span class="dot" style="background:var(--rose)"></span>重点关注</div>
            <div class="list">${watchRows}</div>
          </div>` : ''}
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>最近积分动态</div>
          <span class="card-hint">成绩 / 出勤 / 违规 / 其他</span>
        </div>
        <div class="list">${recentRows}</div>
      </div>`;
  };

  V.mount = function () {
    const s = Store.state;
    const trend = Store.exams().map((e) => {
      const st = Store.examStats(e.id);
      return { label: e.name, value: st ? Math.round(st.avg * 10) / 10 : 0 };
    }).filter((d) => d.value > 0);
    Charts.line(document.getElementById('chart-trend'), trend, { min: 0, max: 100, padValue: false, aria: '班级平均分趋势' });

    const statusCount = { present: 0, late: 0, leave: 0, absent: 0 };
    s.attendance.forEach((day) => {
      Object.keys(day.records).forEach((sid) => {
        const st = day.records[sid];
        if (st in statusCount) statusCount[st]++;
      });
    });
    const total = statusCount.present + statusCount.late + statusCount.leave + statusCount.absent;
    Charts.donut(document.getElementById('chart-attendance'), [
      { label: '出勤', value: statusCount.present, color: '#16897d' },
      { label: '迟到', value: statusCount.late, color: '#d9932f' },
      { label: '请假', value: statusCount.leave, color: '#3b6fa8' },
      { label: '缺勤', value: statusCount.absent, color: '#cf5b5b' }
    ], { centerValue: total, centerLabel: '人次' });

    Charts.hbar(document.getElementById('chart-violation'), Store.violationByType().map((x, i) => ({
      label: x.label, value: x.value,
      color: ['#cf5b5b', '#d9932f', '#3b6fa8', '#16897d', '#8a979e'][i % 5]
    })), { aria: '违规类型分布' });
  };

  window.DashboardView = V;
})();
