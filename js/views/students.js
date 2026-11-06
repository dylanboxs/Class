/* =========================================================
   学生管理
   ========================================================= */
(function () {
  'use strict';

  const V = {};

  function studentRow(st) {
    const points = Store.totalPoints(st.id);
    const att = Store.attendanceStats(st.id);
    const vCount = Store.violationCount(st.id);
    const tone = points > 0 ? 'teal' : points < 0 ? 'rose' : 'ink';
    return `<tr data-student="${st.id}">
      <td class="num muted">${UI.esc(st.no)}</td>
      <td>
        <div class="person">
          ${UI.avatar(st, 28)}
          <div>
            <div class="name">${UI.esc(st.name)}</div>
            <div class="sub">${UI.esc(st.gender || '—')}</div>
          </div>
        </div>
      </td>
      <td><span class="pill ink">${UI.esc(st.group || '未分组')}</span></td>
      <td class="num"><span class="pill ${tone}">${points > 0 ? '+' : ''}${points}</span></td>
      <td class="num">${att.rate == null ? '—' : UI.pct(att.rate)}</td>
      <td class="num">${vCount ? `<span class="delta down">${vCount}</span>` : '<span class="muted">0</span>'}</td>
      <td class="actions">
        <button class="btn xs" data-edit="${st.id}">编辑</button>
        <button class="btn xs danger" data-del="${st.id}">删除</button>
      </td>
    </tr>`;
  }

  V.render = function () {
    const students = Store.students();
    const groups = Array.from(new Set(students.map((s) => s.group)));
    return `
      <div class="card">
        <div class="card-head" style="flex-wrap:wrap">
          <div class="card-title"><span class="dot"></span>学生名单
            <span class="card-hint" style="font-weight:400">共 ${students.length} 人</span>
          </div>
          <div class="btn-group">
            <input class="input" id="stu-search" placeholder="搜索姓名 / 学号 / 小组" style="width:220px;height:34px">
            <select class="select" id="stu-group" style="width:130px;height:34px">
              <option value="">全部小组</option>
              ${groups.map((g) => `<option value="${UI.esc(g)}">${UI.esc(g)}</option>`).join('')}
            </select>
            <button class="btn primary" id="stu-add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
              新增学生
            </button>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>学号</th><th>姓名</th><th>小组</th><th>总积分</th><th>出勤率</th><th>违规</th><th class="actions">操作</th>
              </tr>
            </thead>
            <tbody id="stu-tbody">
              ${students.length ? students.map(studentRow).join('') : ''}
            </tbody>
          </table>
          ${students.length ? '' : UI.empty('还没有学生，点击右上角「新增学生」开始')}
        </div>
      </div>

      <div class="grid cols-3" style="margin-top:16px">
        <div class="card">
          <div class="card-head"><div class="card-title"><span class="dot"></span>小组分布</div></div>
          <div class="chart-box" id="chart-groups"></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title"><span class="dot"></span>出勤情况</div></div>
          <div class="list" id="stu-att-list"></div>
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title"><span class="dot"></span>积分概览</div></div>
          <div class="list" id="stu-points-list"></div>
        </div>
      </div>`;
  };

  function applyFilter() {
    const kw = (document.getElementById('stu-search') || {}).value || '';
    const group = (document.getElementById('stu-group') || {}).value || '';
    const rows = document.querySelectorAll('#stu-tbody tr');
    let visible = 0;
    rows.forEach((tr) => {
      const st = Store.student(tr.getAttribute('data-student'));
      const text = st ? [st.name, st.no, st.group, st.gender].join(' ') : '';
      const okKw = !kw || text.indexOf(kw.trim()) > -1;
      const okGroup = !group || (st && st.group === group);
      const show = okKw && okGroup;
      tr.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    const tbody = document.getElementById('stu-tbody');
    if (tbody) {
      const hint = tbody.parentElement.querySelector('.filter-empty');
      if (!visible && rows.length) {
        if (!hint) {
          const div = document.createElement('div');
          div.className = 'empty filter-empty';
          div.innerHTML = '<p>没有匹配的学生</p>';
          tbody.parentElement.appendChild(div);
        }
      } else if (hint) {
        hint.remove();
      }
    }
  }

  function openStudentModal(st) {
    const isEdit = !!st;
    const groups = Array.from(new Set(Store.students().map((s) => s.group)));
    UI.modal({
      title: isEdit ? '编辑学生' : '新增学生',
      subtitle: isEdit ? '修改后点击保存生效' : '学号和姓名为必填项',
      submitText: isEdit ? '保存修改' : '添加学生',
      body: `
        <div class="form-grid">
          <div class="field">
            <label>姓名 *</label>
            <input class="input" name="name" required value="${UI.esc(st ? st.name : '')}" placeholder="如：张伟">
          </div>
          <div class="field">
            <label>学号 *</label>
            <input class="input" name="no" required value="${UI.esc(st ? st.no : '')}" placeholder="如：20260301">
          </div>
          <div class="field">
            <label>性别</label>
            <select class="select" name="gender">
              <option value="男" ${st && st.gender === '男' ? 'selected' : ''}>男</option>
              <option value="女" ${st && st.gender === '女' ? 'selected' : ''}>女</option>
            </select>
          </div>
          <div class="field">
            <label>小组</label>
            <input class="input" name="group" list="group-options" value="${UI.esc(st ? st.group : '')}" placeholder="如：第一组">
            <datalist id="group-options">${groups.map((g) => `<option value="${UI.esc(g)}">`).join('')}</datalist>
          </div>
        </div>`,
      onSubmit(data) {
        if (!data.name || !data.no) {
          UI.toast('姓名和学号不能为空', 'err');
          return false;
        }
        const s = Store.state;
        if (isEdit) {
          Object.assign(st, { name: data.name, no: data.no, gender: data.gender, group: data.group });
        } else {
          s.students.push({
            id: Store.uid('s'), name: data.name, no: data.no,
            gender: data.gender, group: data.group || '未分组'
          });
        }
        Store.save();
        UI.toast(isEdit ? '学生信息已更新' : '学生已添加', 'ok');
        App.render();
      }
    });
  }

  function removeStudent(id) {
    const st = Store.student(id);
    if (!st) return;
    UI.confirm(`确定删除「${st.name}」吗？该学生的成绩、出勤、违规和积分记录将一并删除，且无法恢复。`, {
      danger: true, okText: '删除'
    }).then((ok) => {
      if (!ok) return;
      const s = Store.state;
      s.students = s.students.filter((x) => x.id !== id);
      s.violations = s.violations.filter((x) => x.studentId !== id);
      s.records = s.records.filter((x) => x.studentId !== id);
      s.attendance.forEach((day) => { delete day.records[id]; });
      Object.keys(s.scores).forEach((eid) => { delete s.scores[eid][id]; });
      Store.save();
      UI.toast('已删除该学生', 'ok');
      App.render();
    });
  }

  V.mount = function () {
    const search = document.getElementById('stu-search');
    const group = document.getElementById('stu-group');
    if (search) search.addEventListener('input', applyFilter);
    if (group) group.addEventListener('change', applyFilter);

    const add = document.getElementById('stu-add');
    if (add) add.addEventListener('click', () => openStudentModal(null));

    const tbody = document.getElementById('stu-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const editId = e.target.getAttribute('data-edit');
        const delId = e.target.getAttribute('data-del');
        if (editId) openStudentModal(Store.student(editId));
        if (delId) removeStudent(delId);
      });
    }

    const students = Store.students();
    const groupMap = {};
    students.forEach((st) => { groupMap[st.group] = (groupMap[st.group] || 0) + 1; });
    Charts.vbar(document.getElementById('chart-groups'),
      Object.keys(groupMap).map((g) => ({ label: g, value: groupMap[g] })), { aria: '小组人数分布' });

    const attList = document.getElementById('stu-att-list');
    if (attList) {
      const sorted = students.map((st) => ({ st, att: Store.attendanceStats(st.id) }))
        .sort((a, b) => (a.att.rate == null ? 2 : a.att.rate) - (b.att.rate == null ? 2 : b.att.rate));
      attList.innerHTML = sorted.length ? sorted.map(({ st, att }) => `
        <div class="list-row">
          ${UI.avatar(st, 24)}
          <div class="grow">
            <div class="title">${UI.esc(st.name)}</div>
            <div class="bar-track" style="margin-top:5px"><div class="bar-fill ${att.rate == null ? '' : att.rate < 0.9 ? 'amber' : ''}" style="width:${att.rate == null ? 0 : Math.round(att.rate * 100)}%"></div></div>
          </div>
          <span class="pts">${att.rate == null ? '—' : UI.pct(att.rate)}</span>
        </div>`).join('') : UI.empty('暂无出勤数据');
    }

    const pointsList = document.getElementById('stu-points-list');
    if (pointsList) {
      const lb = Store.leaderboard();
      if (!lb.length) {
        pointsList.innerHTML = UI.empty('暂无积分数据');
      } else {
        const top = lb.slice(0, 3);
        const bottom = lb.slice(-3).reverse();
        pointsList.innerHTML = `
          <div class="card-hint" style="margin-bottom:4px">积分领先</div>
          ${top.map((x, i) => `
            <div class="list-row">
              <span class="rank-badge top${i + 1}">${i + 1}</span>
              <div class="grow"><div class="title">${UI.esc(x.student.name)}</div><div class="meta">${UI.esc(x.student.group)}</div></div>
              <span class="pts pos">+${x.points}</span>
            </div>`).join('')}
          <div class="card-hint" style="margin:10px 0 4px">需要关注</div>
          ${bottom.map((x) => `
            <div class="list-row">
              ${UI.avatar(x.student, 24)}
              <div class="grow"><div class="title">${UI.esc(x.student.name)}</div><div class="meta">违规 ${Store.violationCount(x.student.id)} 次</div></div>
              <span class="pts ${x.points >= 0 ? 'pos' : 'neg'}">${x.points > 0 ? '+' : ''}${x.points}</span>
            </div>`).join('')}`;
      }
    }
  };

  window.StudentsView = V;
})();
