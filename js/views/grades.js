/* =========================================================
   成绩分析
   ========================================================= */
(function () {
  'use strict';

  const V = {};
  let currentExamId = null;

  function ensureExam() {
    const exams = Store.exams();
    if (!exams.length) return null;
    if (!currentExamId || !Store.getExam(currentExamId)) {
      currentExamId = exams[exams.length - 1].id;
    }
    return Store.getExam(currentExamId);
  }

  function ruleText() {
    const r = Store.state.settings.gradeRules;
    return `较上次考试进步 ≥ ${r.upThreshold} 分，奖励 +${r.upPoints} 积分；下滑 ≥ ${r.downThreshold} 分，扣除 ${r.downPoints} 积分。`;
  }

  function statCards(exam, stats) {
    if (!stats) {
      return `<div class="stat"><div class="stat-label">暂无成绩</div><div class="stat-value">—</div><div class="stat-foot">请先在下方录入分数</div></div>`;
    }
    return `
      <div class="stat blue">
        <div class="stat-label">参考人数</div>
        <div class="stat-value">${stats.count}<small>人</small></div>
        <div class="stat-foot">${UI.esc(exam.name)} · 满分 ${exam.fullScore}</div>
      </div>
      <div class="stat teal">
        <div class="stat-label">班级平均分</div>
        <div class="stat-value teal">${stats.avg.toFixed(1)}</div>
        <div class="stat-foot">最高 ${stats.max} · 最低 ${stats.min}</div>
      </div>
      <div class="stat amber">
        <div class="stat-label">及格率（≥60）</div>
        <div class="stat-value amber">${UI.pct(stats.passRate)}</div>
        <div class="stat-foot">${Math.round(stats.passRate * stats.count)} 人及格</div>
      </div>
      <div class="stat">
        <div class="stat-label">优秀率（≥85）</div>
        <div class="stat-value">${UI.pct(stats.excellentRate)}</div>
        <div class="stat-foot">${Math.round(stats.excellentRate * stats.count)} 人优秀</div>
      </div>`;
  }

  V.render = function () {
    const exams = Store.exams();
    const exam = ensureExam();

    if (!exam) {
      return `<div class="card">${UI.empty('还没有考试，点击下方按钮创建第一次考试')}
        <div style="text-align:center;padding-bottom:24px"><button class="btn primary" id="exam-add">新增考试</button></div>
      </div>`;
    }

    const stats = Store.examStats(exam.id);
    // 找到当前考试的前一场
    const idx = exams.findIndex((e) => e.id === exam.id);
    const prev = idx > 0 ? exams[idx - 1] : null;
    const prevStats = prev ? Store.examStats(prev.id) : null;
    const prevRank = {};
    if (prevStats) prevStats.rows.forEach((r) => { prevRank[r.student.id] = r.rank; });

    // 所有学生都出现在录入表中，已录入的按名次排在前面
    const rows = Store.students().map((st) => {
      const row = stats ? stats.rows.find((x) => x.student.id === st.id) : null;
      return { student: st, score: row ? row.score : null, rank: row ? row.rank : null };
    }).sort((a, b) => (a.rank == null ? 1e9 : a.rank) - (b.rank == null ? 1e9 : b.rank) || a.student.no.localeCompare(b.student.no));
    const rewards = Store.generateGradeRewards(exam.id, { dryRun: true });
    const rewardItems = rewards.items.filter((i) => i.points !== 0)
      .sort((a, b) => b.points - a.points || b.delta - a.delta);

    const scoreRows = rows.map((r) => {
      const st = r.student;
      const prevScore = prev ? Store.scoreOf(prev.id, st.id) : null;
      const prevScoreNum = prevScore == null ? null : prevScore;
      const delta = (r.score != null && prevScoreNum != null) ? r.score - prevScoreNum : null;
      const reward = rewardItems.find((i) => i.studentId === st.id);
      const rankChange = (prevRank[st.id] && r.rank) ? prevRank[st.id] - r.rank : null;
      return `<tr>
        <td class="num">${r.rank != null ? `<span class="rank-badge ${r.rank === 1 ? 'top1' : r.rank === 2 ? 'top2' : r.rank === 3 ? 'top3' : ''}" style="display:inline-grid">${r.rank}</span>` : '<span class="muted">—</span>'}</td>
        <td>
          <div class="person">${UI.avatar(st, 26)}<div><div class="name">${UI.esc(st.name)}</div><div class="sub">${UI.esc(st.no)}</div></div></div>
        </td>
        <td class="num">${prevScoreNum == null ? '<span class="muted">—</span>' : prevScoreNum}</td>
        <td class="num">
          <input class="score-input ${r.score != null && r.score < 60 ? 'fail' : ''}" data-student="${st.id}" type="number" min="0" max="${exam.fullScore}" step="0.5" value="${r.score == null ? '' : r.score}" placeholder="—">
        </td>
        <td class="num">${delta == null ? '<span class="muted">—</span>' : UI.delta(Math.round(delta * 10) / 10, ' 分')}</td>
        <td class="num">${rankChange == null ? '<span class="muted">—</span>' : UI.delta(rankChange, ' 名')}</td>
        <td class="num">${reward ? `<span class="pill ${reward.points > 0 ? 'teal' : 'rose'}">${reward.points > 0 ? '+' : ''}${reward.points}</span>` : '<span class="muted">—</span>'}</td>
      </tr>`;
    }).join('');

    const rewardRows = rewardItems.length ? rewardItems.map((i) => `
      <div class="list-row">
        ${UI.avatar(i.student, 26)}
        <div class="grow">
          <div class="title">${UI.esc(i.student.name)}</div>
          <div class="meta">${i.previous} → ${i.current} 分</div>
        </div>
        <span class="delta ${i.delta > 0 ? 'up' : 'down'}">${i.delta > 0 ? '+' : ''}${i.delta} 分</span>
        <span class="pill ${i.points > 0 ? 'teal' : 'rose'}">${i.points > 0 ? '+' : ''}${i.points}</span>
      </div>`).join('') : UI.empty('本次考试暂未触发奖惩，继续努力');

    const buckets = Store.scoreBuckets(exam.id);
    const improved = rewardItems.filter((i) => i.points > 0).slice(0, 5);
    const declined = rewardItems.filter((i) => i.points < 0).sort((a, b) => a.delta - b.delta).slice(0, 5);

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head" style="flex-wrap:wrap;margin-bottom:0;padding-bottom:0;border-bottom:none">
          <div class="tabs">
            ${exams.map((e) => `<button class="tab ${e.id === exam.id ? 'active' : ''}" data-exam="${e.id}">${UI.esc(e.name)}</button>`).join('')}
          </div>
          <div class="btn-group">
            <button class="btn sm" id="exam-add">＋ 新增考试</button>
            <button class="btn sm danger" id="exam-del">删除本次考试</button>
          </div>
        </div>
      </div>

      <div class="grid cols-4">${statCards(exam, stats)}</div>

      <div class="grid cols-2-1" style="margin-top:16px">
        <div class="card flush">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>${UI.esc(exam.name)}成绩表</div>
            <div class="btn-group">
              <span class="card-hint">${UI.dateLabel(exam.date, true)} · 满分 ${exam.fullScore}</span>
              <button class="btn primary sm" id="score-save">保存并计算奖惩</button>
            </div>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead>
                <tr><th>排名</th><th>学生</th><th>上次</th><th>本次</th><th>分数变化</th><th>排名变化</th><th>奖惩</th></tr>
              </thead>
              <tbody id="score-tbody">${scoreRows}</tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>本次奖惩预览</div>
            <span class="card-hint">${rewardItems.length} 人触发</span>
          </div>
          <div class="rule-banner" style="margin-bottom:12px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/></svg>
            <div>${ruleText()}<br><span style="opacity:.75">规则可在「系统设置」中调整，成绩保存后自动生效。</span></div>
          </div>
          <div class="list">${rewardRows}</div>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:16px">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>分数段分布</div>
            <span class="card-hint">${UI.esc(exam.name)}</span>
          </div>
          <div class="chart-box" id="chart-buckets"></div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>进退步名单</div>
            <span class="card-hint">较 ${prev ? UI.esc(prev.name) : '上次考试'}</span>
          </div>
          <div class="grid cols-2" style="gap:18px">
            <div>
              <div class="card-hint" style="margin-bottom:4px">进步明显</div>
              <div class="list">${improved.length ? improved.map((i) => `
                <div class="list-row">
                  ${UI.avatar(i.student, 24)}
                  <div class="grow"><div class="title">${UI.esc(i.student.name)}</div><div class="meta">${i.previous} → ${i.current}</div></div>
                  <span class="delta up">+${i.delta}</span>
                </div>`).join('') : UI.empty('暂无')}</div>
            </div>
            <div>
              <div class="card-hint" style="margin-bottom:4px">需要关注</div>
              <div class="list">${declined.length ? declined.map((i) => `
                <div class="list-row">
                  ${UI.avatar(i.student, 24)}
                  <div class="grow"><div class="title">${UI.esc(i.student.name)}</div><div class="meta">${i.previous} → ${i.current}</div></div>
                  <span class="delta down">${i.delta}</span>
                </div>`).join('') : UI.empty('暂无')}</div>
            </div>
          </div>
        </div>
      </div>`;
  };

  function saveScores() {
    const exam = ensureExam();
    if (!exam) return;
    const inputs = document.querySelectorAll('#score-tbody .score-input');
    if (!inputs.length) return;
    const map = {};
    let invalid = null;
    inputs.forEach((inp) => {
      const raw = inp.value.trim();
      if (!raw) return;
      const val = Number(raw);
      if (isNaN(val) || val < 0 || val > exam.fullScore) {
        if (!invalid) invalid = inp;
        return;
      }
      map[inp.getAttribute('data-student')] = val;
    });
    if (invalid) {
      UI.toast(`分数需在 0—${exam.fullScore} 之间`, 'err');
      invalid.focus();
      invalid.classList.add('fail');
      return;
    }
    Store.state.scores[exam.id] = map;
    const res = Store.generateGradeRewards(exam.id);
    Store.save();
    const count = res.items.filter((i) => i.points !== 0).length;
    UI.toast(count ? `成绩已保存，按规则生成 ${count} 条奖惩积分` : '成绩已保存，本次未触发奖惩', 'ok');
    App.render();
  }

  function openExamModal() {
    UI.modal({
      title: '新增考试',
      subtitle: '创建后可逐项录入学生成绩',
      submitText: '创建考试',
      body: `
        <div class="form-grid">
          <div class="field">
            <label>考试名称 *</label>
            <input class="input" name="name" required placeholder="如：第二次月考">
          </div>
          <div class="field">
            <label>考试日期 *</label>
            <input class="input" name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}">
          </div>
          <div class="field">
            <label>满分</label>
            <input class="input" name="fullScore" type="number" min="1" step="1" value="100">
          </div>
          <div class="field">
            <label>备注</label>
            <input class="input" name="note" placeholder="如：总分 / 语数外合计">
          </div>
        </div>`,
      onSubmit(data) {
        if (!data.name || !data.date) {
          UI.toast('请填写考试名称和日期', 'err');
          return false;
        }
        const full = Number(data.fullScore) || 100;
        const id = Store.uid('e');
        Store.state.exams.push({
          id, name: data.name, date: data.date, fullScore: full, note: data.note || ''
        });
        Store.state.scores[id] = {};
        Store.save();
        currentExamId = id;
        UI.toast('考试已创建，请录入成绩', 'ok');
        App.render();
      }
    });
  }

  function deleteExam() {
    const exam = ensureExam();
    if (!exam) return;
    UI.confirm(`确定删除「${exam.name}」吗？本次成绩及由此生成的奖惩记录将一并删除。`, {
      danger: true, okText: '删除'
    }).then((ok) => {
      if (!ok) return;
      const s = Store.state;
      s.exams = s.exams.filter((e) => e.id !== exam.id);
      delete s.scores[exam.id];
      s.records = s.records.filter((r) => r.examId !== exam.id);
      currentExamId = null;
      Store.save();
      UI.toast('考试已删除', 'ok');
      App.render();
    });
  }

  V.mount = function () {
    const exam = ensureExam();
    const tabs = document.querySelectorAll('.tab[data-exam]');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        currentExamId = tab.getAttribute('data-exam');
        App.render();
      });
    });
    const add = document.getElementById('exam-add');
    if (add) add.addEventListener('click', openExamModal);
    const del = document.getElementById('exam-del');
    if (del) del.addEventListener('click', deleteExam);
    const save = document.getElementById('score-save');
    if (save) save.addEventListener('click', saveScores);

    if (!exam) return;
    Charts.vbar(document.getElementById('chart-buckets'), Store.scoreBuckets(exam.id).map((b, i) => ({
      label: b.label, value: b.count,
      color: ['#16897d', '#3b6fa8', '#d9932f', '#cf5b5b', '#8a979e'][i]
    })), { aria: '分数段分布', color: '#3b6fa8' });
  };

  window.GradesView = V;
})();
