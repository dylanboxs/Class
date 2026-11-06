/* =========================================================
   奖惩积分
   ========================================================= */
(function () {
  'use strict';

  const V = {};

  function addRecordModal() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const today = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    UI.modal({
      title: '手动加减分',
      subtitle: '用于课堂表现、劳动卫生、活动奖励等规则外奖惩',
      submitText: '保存积分',
      body: `
        <div class="form-grid">
          <div class="field">
            <label>日期 *</label>
            <input class="input" type="date" name="date" value="${today}" required>
          </div>
          <div class="field">
            <label>学生 *</label>
            <select class="select" name="studentId" required>
              <option value="">请选择学生</option>
              ${UI.studentOptions()}
            </select>
          </div>
          <div class="field">
            <label>积分（正数加分 / 负数扣分）*</label>
            <input class="input" type="number" name="points" step="1" value="3" required>
          </div>
          <div class="field">
            <label>事由 *</label>
            <input class="input" name="reason" placeholder="如：课堂表现优秀" required>
          </div>
        </div>`,
      onSubmit(data) {
        if (!data.studentId || !data.reason) {
          UI.toast('请选择学生并填写事由', 'err');
          return false;
        }
        const pts = Number(data.points);
        if (isNaN(pts) || pts === 0) {
          UI.toast('积分需为非零数字', 'err');
          return false;
        }
        Store.addRecord({
          studentId: data.studentId, points: pts,
          category: '其他', reason: data.reason, date: data.date
        });
        UI.toast('积分已记录', 'ok');
        App.render();
      }
    });
  }

  V.render = function () {
    const students = Store.students();
    const lb = Store.leaderboard();
    const records = Store.records();
    const avg = students.length ? records.reduce((s, r) => s + (Number(r.points) || 0), 0) / students.length : 0;
    const gain = records.filter((r) => r.points > 0).reduce((s, r) => s + r.points, 0);
    const loss = records.filter((r) => r.points < 0).reduce((s, r) => s + r.points, 0);
    const best = lb[0];

    const catCounts = {};
    records.forEach((r) => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const catSegments = [
      { label: '成绩', value: catCounts['成绩'] || 0, color: '#3b6fa8' },
      { label: '出勤', value: catCounts['出勤'] || 0, color: '#d9932f' },
      { label: '违规', value: catCounts['违规'] || 0, color: '#cf5b5b' },
      { label: '其他', value: catCounts['其他'] || 0, color: '#16897d' }
    ];

    const rankRows = lb.length ? lb.map((x, i) => {
      const pos = Store.state.records.filter((r) => r.studentId === x.student.id && r.points > 0)
        .reduce((s, r) => s + r.points, 0);
      const neg = Store.state.records.filter((r) => r.studentId === x.student.id && r.points < 0)
        .reduce((s, r) => s + r.points, 0);
      return `<tr>
        <td class="num"><span class="rank-badge ${i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : ''}">${i + 1}</span></td>
        <td><div class="person">${UI.avatar(x.student, 26)}<div><div class="name">${UI.esc(x.student.name)}</div><div class="sub">${UI.esc(x.student.group)}</div></div></div></td>
        <td class="num"><span class="delta up">${pos ? '+' + pos : '—'}</span></td>
        <td class="num"><span class="delta down">${neg || '—'}</span></td>
        <td class="num"><strong>${x.points > 0 ? '+' : ''}${x.points}</strong></td>
      </tr>`;
    }).join('') : '';

    const ledgerRows = records.length ? records.map((r) => {
      const st = Store.student(r.studentId);
      return `<tr data-cat="${UI.esc(r.category)}">
        <td class="num">${UI.dateLabel(r.date)}</td>
        <td><div class="person">${UI.avatar(st, 24)}<span class="name">${UI.esc(st ? st.name : '未知')}</span></div></td>
        <td>${UI.categoryPill(r.category)}</td>
        <td>${UI.esc(r.reason)}</td>
        <td class="num"><span class="delta ${r.points >= 0 ? 'up' : 'down'}">${r.points > 0 ? '+' : ''}${r.points}</span></td>
        <td>${r.auto ? '<span class="pill ink">自动</span>' : '<span class="pill teal">手动</span>'}</td>
        <td class="actions">${r.auto ? '<span class="muted">—</span>' : `<button class="btn xs danger" data-del="${r.id}">删除</button>`}</td>
      </tr>`;
    }).join('') : '';

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head" style="margin-bottom:0;padding-bottom:0;border-bottom:none">
          <div class="card-title"><span class="dot"></span>奖惩积分
            <span class="card-hint" style="font-weight:400">成绩 / 出勤 / 违规自动计分，其余可手动加减</span>
          </div>
          <button class="btn primary sm" id="rec-add">＋ 手动加减分</button>
        </div>
      </div>

      <div class="grid cols-4">
        <div class="stat teal"><div class="stat-label">人均积分</div><div class="stat-value teal">${avg.toFixed(1)}</div><div class="stat-foot">共 ${students.length} 名学生</div></div>
        <div class="stat amber"><div class="stat-label">累计加分</div><div class="stat-value amber">+${gain}</div><div class="stat-foot">${records.filter((r) => r.points > 0).length} 条加分记录</div></div>
        <div class="stat rose"><div class="stat-label">累计扣分</div><div class="stat-value rose">${loss}</div><div class="stat-foot">${records.filter((r) => r.points < 0).length} 条扣分记录</div></div>
        <div class="stat blue"><div class="stat-label">积分第一名</div><div class="stat-value" style="font-size:20px">${best ? UI.esc(best.student.name) : '—'}</div><div class="stat-foot">${best ? best.points + ' 积分' : '暂无数据'}</div></div>
      </div>

      <div class="grid cols-1-2" style="margin-top:16px">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>积分记录构成</div>
            <span class="card-hint">共 ${records.length} 条</span>
          </div>
          <div class="chart-box" id="chart-cat" style="display:flex;justify-content:center"></div>
          <div class="legend" style="justify-content:center">
            ${catSegments.map((s) => `<span><i style="background:${s.color}"></i>${s.label} ${s.value}</span>`).join('')}
          </div>
        </div>

        <div class="card flush">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>积分排行榜</div>
            <span class="card-hint">按总积分排序</span>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>排名</th><th>学生</th><th>加分</th><th>扣分</th><th>总积分</th></tr></thead>
              <tbody>${rankRows}</tbody>
            </table>
            ${lb.length ? '' : UI.empty('暂无积分数据')}
          </div>
        </div>
      </div>

      <div class="card flush" style="margin-top:16px">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>积分流水</div>
          <div class="btn-group">
            <select class="select" id="rec-filter" style="width:130px;height:32px">
              <option value="">全部类别</option>
              <option value="成绩">成绩</option>
              <option value="出勤">出勤</option>
              <option value="违规">违规</option>
              <option value="其他">其他</option>
            </select>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead><tr><th>日期</th><th>学生</th><th>类别</th><th>事由</th><th>积分</th><th>来源</th><th class="actions">操作</th></tr></thead>
            <tbody id="rec-tbody">${ledgerRows}</tbody>
          </table>
          ${records.length ? '' : UI.empty('暂无积分流水')}
        </div>
      </div>`;
  };

  V.mount = function () {
    const add = document.getElementById('rec-add');
    if (add) add.addEventListener('click', addRecordModal);

    Charts.donut(document.getElementById('chart-cat'), [
      { label: '成绩', value: (Store.records().filter((r) => r.category === '成绩').length), color: '#3b6fa8' },
      { label: '出勤', value: (Store.records().filter((r) => r.category === '出勤').length), color: '#d9932f' },
      { label: '违规', value: (Store.records().filter((r) => r.category === '违规').length), color: '#cf5b5b' },
      { label: '其他', value: (Store.records().filter((r) => r.category === '其他').length), color: '#16897d' }
    ], { centerValue: Store.state.records.length, centerLabel: '条记录' });

    const filter = document.getElementById('rec-filter');
    if (filter) {
      filter.addEventListener('change', () => {
        const v = filter.value;
        document.querySelectorAll('#rec-tbody tr').forEach((tr) => {
          tr.style.display = (!v || tr.getAttribute('data-cat') === v) ? '' : 'none';
        });
      });
    }

    const tbody = document.getElementById('rec-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-del');
        if (!id) return;
        UI.confirm('确定删除这条手动积分记录吗？', { danger: true, okText: '删除' }).then((ok) => {
          if (!ok) return;
          Store.deleteRecord(id);
          UI.toast('积分记录已删除', 'ok');
          App.render();
        });
      });
    }
  };

  window.RewardsView = V;
})();
