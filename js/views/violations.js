/* =========================================================
   违规记录
   ========================================================= */
(function () {
  'use strict';

  const V = {};

  function addViolationModal() {
    const types = Store.state.settings.violationTypes;
    const today = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

    UI.modal({
      title: '记录违规',
      subtitle: '记录后将自动扣除对应积分',
      submitText: '记录违规',
      body: `
        <div class="form-grid">
          <div class="field">
            <label>日期 *</label>
            <input class="input" type="date" name="date" value="${todayStr}" required>
          </div>
          <div class="field">
            <label>学生 *</label>
            <select class="select" name="studentId" required>
              <option value="">请选择学生</option>
              ${UI.studentOptions()}
            </select>
          </div>
          <div class="field">
            <label>违规类型 *</label>
            <select class="select" name="typeId" required>
              ${types.map((t) => `<option value="${t.id}">${UI.esc(t.name)}（${t.points} 积分）</option>`).join('')}
            </select>
          </div>
          <div class="field">
            <label>备注</label>
            <input class="input" name="note" placeholder="如：早读迟到 10 分钟">
          </div>
        </div>`,
      onSubmit(data) {
        if (!data.studentId || !data.typeId) {
          UI.toast('请选择学生和违规类型', 'err');
          return false;
        }
        Store.addViolation({
          date: data.date, studentId: data.studentId,
          typeId: data.typeId, note: data.note
        });
        UI.toast('违规已记录，积分已同步扣除', 'ok');
        App.render();
      }
    });
  }

  V.render = function () {
    const list = Store.violations();
    const students = Store.students();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthCount = list.filter((v) => v.date.indexOf(monthKey) === 0).length;
    const types = Store.violationByType();
    const involve = new Set(list.map((v) => v.studentId)).size;

    const rank = students.map((st) => ({
      st,
      count: Store.violationCount(st.id),
      points: Store.state.violations
        .filter((v) => v.studentId === st.id)
        .reduce((sum, v) => {
          const t = Store.violationType(v.typeId);
          return sum + (t ? t.points : 0);
        }, 0)
    })).filter((x) => x.count > 0).sort((a, b) => b.count - a.count || a.points - b.points);

    const rows = list.length ? list.map((v) => {
      const st = Store.student(v.studentId);
      const type = Store.violationType(v.typeId);
      return `<tr>
        <td class="num">${UI.dateLabel(v.date)}</td>
        <td><div class="person">${UI.avatar(st, 26)}<div><div class="name">${UI.esc(st ? st.name : '未知')}</div><div class="sub">${UI.esc(st ? st.group : '')}</div></div></div></td>
        <td><span class="pill rose">${UI.esc(type ? type.name : '其他')}</span></td>
        <td>${UI.esc(v.note) || '<span class="muted">—</span>'}</td>
        <td class="num"><span class="delta down">${type ? type.points : 0}</span></td>
        <td class="actions"><button class="btn xs danger" data-del="${v.id}">删除</button></td>
      </tr>`;
    }).join('') : '';

    const statCards = `
      <div class="stat rose"><div class="stat-label">违规总次数</div><div class="stat-value rose">${list.length}<small>次</small></div><div class="stat-foot">涉及 ${involve} 名学生</div></div>
      <div class="stat amber"><div class="stat-label">本月违规</div><div class="stat-value amber">${monthCount}<small>次</small></div><div class="stat-foot">${now.getFullYear()} 年 ${now.getMonth() + 1} 月</div></div>
      <div class="stat blue"><div class="stat-label">最常见类型</div><div class="stat-value" style="font-size:20px">${UI.esc(types[0] ? types[0].label : '—')}</div><div class="stat-foot">${types[0] ? types[0].value + ' 次' : '暂无记录'}</div></div>
      <div class="stat teal"><div class="stat-label">违规人均</div><div class="stat-value teal">${involve ? (list.length / involve).toFixed(1) : '0'}<small>次</small></div><div class="stat-foot">按涉及学生计算</div></div>`;

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head" style="margin-bottom:0;padding-bottom:0;border-bottom:none">
          <div class="card-title"><span class="dot"></span>违规记录
            <span class="card-hint" style="font-weight:400">共 ${list.length} 条</span>
          </div>
          <button class="btn primary sm" id="vio-add">＋ 记录违规</button>
        </div>
      </div>

      <div class="grid cols-4">${statCards}</div>

      <div class="grid cols-2-1" style="margin-top:16px">
        <div class="card flush">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>违规明细</div>
            <span class="card-hint">按日期倒序</span>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>日期</th><th>学生</th><th>类型</th><th>备注</th><th>积分</th><th class="actions">操作</th></tr></thead>
              <tbody id="vio-tbody">${rows}</tbody>
            </table>
            ${list.length ? '' : UI.empty('暂无违规记录，点击右上角「记录违规」')}
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>类型分布</div>
          </div>
          <div class="chart-box" id="chart-vio"></div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>学生违规排行</div>
          <span class="card-hint">违规次数从高到低</span>
        </div>
        <div class="grid cols-2" style="gap:6px 26px">
          ${rank.length ? rank.map((x, i) => `
            <div class="list-row">
              <span class="rank-badge ${i < 3 ? 'top' + (i + 1) : ''}">${i + 1}</span>
              ${UI.avatar(x.st, 26)}
              <div class="grow">
                <div class="title">${UI.esc(x.st.name)}</div>
                <div class="meta">违纪扣分 ${x.points} 分 · 当前积分 ${Store.totalPoints(x.st.id)}</div>
              </div>
              <span class="pill rose">${x.count} 次</span>
            </div>`).join('') : UI.empty('暂无违规学生')}
        </div>
      </div>`;
  };

  V.mount = function () {
    const add = document.getElementById('vio-add');
    if (add) add.addEventListener('click', addViolationModal);

    const tbody = document.getElementById('vio-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-del');
        if (!id) return;
        const v = Store.state.violations.find((x) => x.id === id);
        const st = v ? Store.student(v.studentId) : null;
        UI.confirm(`确定删除${st ? '「' + st.name + '」' : ''}的这条违规记录吗？对应积分将返还。`, {
          danger: true, okText: '删除'
        }).then((ok) => {
          if (!ok) return;
          Store.deleteViolation(id);
          UI.toast('违规记录已删除', 'ok');
          App.render();
        });
      });
    }

    Charts.hbar(document.getElementById('chart-vio'), Store.violationByType().map((x, i) => ({
      label: x.label, value: x.value,
      color: ['#cf5b5b', '#d9932f', '#3b6fa8', '#16897d', '#8a979e'][i % 5]
    })), { aria: '违规类型分布' });
  };

  window.ViolationsView = V;
})();
