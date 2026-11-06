/* =========================================================
   出勤管理
   ========================================================= */
(function () {
  'use strict';

  const V = {};
  let selectedDate = null;

  const STATUS = [
    { key: 'present', label: '出勤' },
    { key: 'late', label: '迟到' },
    { key: 'leave', label: '请假' },
    { key: 'absent', label: '缺勤' }
  ];

  function ensureDate() {
    if (!selectedDate) {
      const d = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      selectedDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    }
    return selectedDate;
  }

  function currentRecords(date) {
    const day = Store.attendanceDay(date);
    const out = {};
    Store.students().forEach((st) => {
      out[st.id] = day && day.records[st.id] ? day.records[st.id] : 'present';
    });
    return out;
  }

  function countStatus() {
    const counts = { present: 0, late: 0, leave: 0, absent: 0 };
    document.querySelectorAll('.att-seg').forEach((seg) => {
      const on = seg.querySelector('button.on');
      if (on) counts[on.getAttribute('data-status')]++;
    });
    return counts;
  }

  V.render = function () {
    const students = Store.students();
    const date = ensureDate();
    const rec = currentRecords(date);
    const counts = { present: 0, late: 0, leave: 0, absent: 0 };
    Object.keys(rec).forEach((id) => { counts[rec[id]]++; });
    const savedDay = Store.attendanceDay(date);

    const rows = students.map((st) => {
      const status = rec[st.id] || 'present';
      const att = Store.attendanceStats(st.id);
      return `<tr>
        <td>
          <div class="person">${UI.avatar(st, 28)}
            <div><div class="name">${UI.esc(st.name)}</div><div class="sub">${UI.esc(st.no)} · ${UI.esc(st.group)}</div></div>
          </div>
        </td>
        <td>
          <div class="att-seg" data-student="${st.id}">
            ${STATUS.map((s) => `<button type="button" data-status="${s.key}" class="${status === s.key ? 'on ' + s.key : ''}">${s.label}</button>`).join('')}
          </div>
        </td>
        <td class="num muted">${att.late ? '迟到 ' + att.late + ' 次' : ''}
          ${att.absent ? '缺勤 ' + att.absent + ' 次' : ''}</td>
      </tr>`;
    }).join('');

    const history = Store.attendanceDays().slice(0, 8);

    const overall = { present: 0, late: 0, leave: 0, absent: 0 };
    Store.state.attendance.forEach((day) => {
      Object.keys(day.records).forEach((sid) => {
        const st = day.records[sid];
        if (st in overall) overall[st]++;
      });
    });
    const overallTotal = overall.present + overall.late + overall.leave + overall.absent;

    const statList = students.map((st) => ({ st, att: Store.attendanceStats(st.id) }))
      .sort((a, b) => (a.att.rate == null ? 2 : a.att.rate) - (b.att.rate == null ? 2 : b.att.rate));

    return `
      <div class="card" style="margin-bottom:16px">
        <div class="card-head" style="margin-bottom:0;padding-bottom:0;border-bottom:none;flex-wrap:wrap">
          <div class="btn-group">
            <div class="field">
              <label>考勤日期</label>
              <input class="input" type="date" id="att-date" value="${date}" style="width:170px;height:34px">
            </div>
            <div style="align-self:flex-end;padding-bottom:7px">
              <span class="pill ${savedDay ? 'teal' : 'ink'}">${savedDay ? '已保存 · ' + UI.esc(savedDay.savedAt) : '未保存'}</span>
            </div>
          </div>
          <div class="btn-group">
            <button class="btn sm" id="att-all">全部出勤</button>
            <button class="btn sm danger" id="att-clear">删除当天记录</button>
            <button class="btn primary sm" id="att-save">保存出勤</button>
          </div>
        </div>
      </div>

      <div class="grid cols-4">
        <div class="stat teal"><div class="stat-label">出勤</div><div class="stat-value teal" id="cnt-present">${counts.present}<small>人</small></div><div class="stat-foot">正常到校</div></div>
        <div class="stat amber"><div class="stat-label">迟到</div><div class="stat-value amber" id="cnt-late">${counts.late}<small>人</small></div><div class="stat-foot">每次 ${Store.state.settings.attendancePoints.late} 积分</div></div>
        <div class="stat blue"><div class="stat-label">请假</div><div class="stat-value" id="cnt-leave">${counts.leave}<small>人</small></div><div class="stat-foot">已批准请假</div></div>
        <div class="stat rose"><div class="stat-label">缺勤</div><div class="stat-value rose" id="cnt-absent">${counts.absent}<small>人</small></div><div class="stat-foot">每次 ${Store.state.settings.attendancePoints.absent} 积分</div></div>
      </div>

      <div class="grid cols-2-1" style="margin-top:16px">
        <div class="card flush">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>${UI.dateLabel(date, true)} 考勤表</div>
            <span class="card-hint">迟到 / 缺勤将按设置自动扣分</span>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>学生</th><th style="width:300px">考勤状态</th><th>累计</th></tr></thead>
              <tbody id="att-tbody">${students.length ? rows : ''}</tbody>
            </table>
            ${students.length ? '' : UI.empty('请先在「学生管理」中添加学生')}
          </div>
        </div>

        <div class="card">
          <div class="card-head"><div class="card-title"><span class="dot"></span>累计出勤构成</div></div>
          <div class="chart-box" id="chart-att" style="display:flex;justify-content:center"></div>
          <div class="legend" style="justify-content:center">
            <span><i style="background:#16897d"></i>出勤 ${overall.present}</span>
            <span><i style="background:#d9932f"></i>迟到 ${overall.late}</span>
            <span><i style="background:#3b6fa8"></i>请假 ${overall.leave}</span>
            <span><i style="background:#cf5b5b"></i>缺勤 ${overall.absent}</span>
          </div>
          <div style="margin-top:16px;padding-top:12px;border-top:1px dashed var(--line)">
            <div class="card-hint" style="margin-bottom:6px">最近考勤日</div>
            ${history.length ? history.map((d) => `<div class="list-row" style="padding:7px 0">
              <div class="grow"><div class="title">${UI.dateLabel(d.date, true)}</div></div>
              <span class="pill ink">${Object.values(d.records).filter((x) => x === 'late').length} 迟到</span>
              <span class="pill rose">${Object.values(d.records).filter((x) => x === 'absent').length} 缺勤</span>
            </div>`).join('') : UI.empty('暂无历史考勤')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>学生出勤统计</div>
          <span class="card-hint">按出勤率由低到高排列</span>
        </div>
        <div class="grid cols-2" style="gap:6px 26px">
          ${statList.length ? statList.map(({ st, att }) => `
            <div class="list-row">
              ${UI.avatar(st, 26)}
              <div class="grow">
                <div class="title">${UI.esc(st.name)}
                  ${att.absent ? `<span class="pill rose" style="margin-left:4px">缺勤 ${att.absent}</span>` : ''}
                  ${att.late ? `<span class="pill amber" style="margin-left:4px">迟到 ${att.late}</span>` : ''}
                </div>
                <div class="bar-track" style="margin-top:5px">
                  <div class="bar-fill ${att.rate != null && att.rate < 0.9 ? 'rose' : att.rate != null && att.rate < 0.96 ? 'amber' : ''}" style="width:${att.rate == null ? 0 : Math.round(att.rate * 100)}%"></div>
                </div>
              </div>
              <span class="pts">${UI.pct(att.rate)}</span>
            </div>`).join('') : UI.empty('暂无考勤数据')}
        </div>
      </div>`;
  };

  function updateSummary() {
    const counts = countStatus();
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    const el = (id) => document.getElementById(id);
    ['present', 'late', 'leave', 'absent'].forEach((k) => {
      const node = el('cnt-' + k);
      if (node) node.innerHTML = `${counts[k]}<small>人</small>`;
    });
  }

  function saveAttendance() {
    const date = ensureDate();
    const records = {};
    document.querySelectorAll('.att-seg').forEach((seg) => {
      const on = seg.querySelector('button.on');
      records[seg.getAttribute('data-student')] = on ? on.getAttribute('data-status') : 'present';
    });
    Store.saveAttendance(date, records);
    const counts = countStatus();
    UI.toast(`出勤已保存：出勤 ${counts.present} / 迟到 ${counts.late} / 请假 ${counts.leave} / 缺勤 ${counts.absent}`, 'ok');
    App.render();
  }

  V.mount = function () {
    const dateInput = document.getElementById('att-date');
    if (dateInput) {
      dateInput.addEventListener('change', () => {
        selectedDate = dateInput.value;
        App.render();
      });
    }

    const tbody = document.getElementById('att-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-status]');
        if (!btn) return;
        const seg = btn.parentElement;
        seg.querySelectorAll('button').forEach((b) => b.classList.remove('on', 'present', 'late', 'leave', 'absent'));
        btn.classList.add('on', btn.getAttribute('data-status'));
        updateSummary();
      });
    }

    const all = document.getElementById('att-all');
    if (all) {
      all.addEventListener('click', () => {
        document.querySelectorAll('.att-seg').forEach((seg) => {
          const btn = seg.querySelector('button[data-status="present"]');
          seg.querySelectorAll('button').forEach((b) => b.classList.remove('on', 'present', 'late', 'leave', 'absent'));
          btn.classList.add('on', 'present');
        });
        updateSummary();
        UI.toast('已全部标记为出勤，记得保存', 'ok');
      });
    }

    const save = document.getElementById('att-save');
    if (save) save.addEventListener('click', saveAttendance);

    const clear = document.getElementById('att-clear');
    if (clear) {
      clear.addEventListener('click', () => {
        const date = ensureDate();
        if (!Store.attendanceDay(date)) {
          UI.toast('当天没有已保存的考勤记录', 'err');
          return;
        }
        UI.confirm(`确定删除 ${UI.dateLabel(date, true)} 的考勤记录吗？对应的迟到/缺勤积分也会删除。`, {
          danger: true, okText: '删除'
        }).then((ok) => {
          if (!ok) return;
          const s = Store.state;
          s.attendance = s.attendance.filter((d) => d.date !== date);
          s.records = s.records.filter((r) => !(r.id.indexOf('a-' + date + '-') === 0));
          Store.save();
          UI.toast('当天考勤已删除', 'ok');
          App.render();
        });
      });
    }

    const overall = { present: 0, late: 0, leave: 0, absent: 0 };
    Store.state.attendance.forEach((day) => {
      Object.keys(day.records).forEach((sid) => {
        const st = day.records[sid];
        if (st in overall) overall[st]++;
      });
    });
    const total = overall.present + overall.late + overall.leave + overall.absent;
    Charts.donut(document.getElementById('chart-att'), [
      { label: '出勤', value: overall.present, color: '#16897d' },
      { label: '迟到', value: overall.late, color: '#d9932f' },
      { label: '请假', value: overall.leave, color: '#3b6fa8' },
      { label: '缺勤', value: overall.absent, color: '#cf5b5b' }
    ], { centerValue: total, centerLabel: '人次' });
  };

  window.AttendanceView = V;
})();
