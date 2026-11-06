/* =========================================================
   系统设置
   ========================================================= */
(function () {
  'use strict';

  const V = {};

  function typeModal(type) {
    const isEdit = !!type;
    UI.modal({
      title: isEdit ? '编辑违规类型' : '新增违规类型',
      subtitle: '积分请填写负数，例如 -2',
      submitText: isEdit ? '保存' : '添加',
      body: `
        <div class="form-grid">
          <div class="field">
            <label>类型名称 *</label>
            <input class="input" name="name" required value="${UI.esc(type ? type.name : '')}" placeholder="如：课堂违纪">
          </div>
          <div class="field">
            <label>扣除积分 *</label>
            <input class="input" type="number" name="points" step="1" required value="${type ? type.points : -2}">
          </div>
        </div>`,
      onSubmit(data) {
        const name = data.name;
        const points = Number(data.points);
        if (!name || isNaN(points) || points === 0) {
          UI.toast('请填写类型名称和非零积分', 'err');
          return false;
        }
        const s = Store.state;
        if (isEdit) {
          type.name = name;
          type.points = points;
          // 同步该类型的历史违规积分
          s.violations.filter((v) => v.typeId === type.id).forEach((v) => {
            const rec = s.records.find((r) => r.id === 'v-' + v.id);
            if (rec) { rec.points = points; rec.reason = name; }
          });
        } else {
          s.settings.violationTypes.push({ id: Store.uid('t'), name, points });
        }
        Store.save();
        UI.toast(isEdit ? '违规类型已更新' : '违规类型已添加', 'ok');
        App.render();
      }
    });
  }

  V.render = function () {
    const s = Store.state;
    const r = s.settings.gradeRules;
    const ap = s.settings.attendancePoints;
    const types = s.settings.violationTypes;
    const dataCount = {
      students: s.students.length,
      exams: s.exams.length,
      attendance: s.attendance.length,
      records: s.records.length
    };

    return `
      <div class="grid cols-2">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>班级信息</div>
          </div>
          <form id="meta-form">
            <div class="form-grid">
              <div class="field"><label>学校名称</label><input class="input" name="school" value="${UI.esc(s.meta.school)}"></div>
              <div class="field"><label>班级名称</label><input class="input" name="className" value="${UI.esc(s.meta.className)}"></div>
              <div class="field"><label>班主任</label><input class="input" name="teacher" value="${UI.esc(s.meta.teacher)}"></div>
              <div class="field"><label>学期</label><input class="input" name="term" value="${UI.esc(s.meta.term)}"></div>
            </div>
            <div style="margin-top:14px;display:flex;justify-content:flex-end">
              <button class="btn primary sm" type="submit">保存信息</button>
            </div>
          </form>
        </div>

        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>成绩奖惩规则</div>
          </div>
          <form id="grade-rule-form">
            <div class="form-grid">
              <div class="field">
                <label>进步奖励线（分）</label>
                <input class="input" type="number" min="1" step="1" name="upThreshold" value="${r.upThreshold}">
              </div>
              <div class="field">
                <label>进步奖励积分</label>
                <input class="input" type="number" min="1" step="1" name="upPoints" value="${r.upPoints}">
              </div>
              <div class="field">
                <label>下滑扣除线（分）</label>
                <input class="input" type="number" min="1" step="1" name="downThreshold" value="${r.downThreshold}">
              </div>
              <div class="field">
                <label>下滑扣除积分</label>
                <input class="input" type="number" min="1" step="1" name="downPoints" value="${r.downPoints}">
              </div>
            </div>
            <div class="rule-banner" style="margin-top:12px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16.5h.01"/></svg>
              <div>当前规则：较上次考试进步 ≥ ${r.upThreshold} 分 +${r.upPoints} 积分；下滑 ≥ ${r.downThreshold} 分 −${r.downPoints} 积分。</div>
            </div>
            <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">
              <button class="btn sm" type="button" id="grade-recalc">按当前规则重算</button>
              <button class="btn primary sm" type="submit">保存规则</button>
            </div>
          </form>
        </div>
      </div>

      <div class="grid cols-2" style="margin-top:16px">
        <div class="card">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>出勤扣分规则</div>
          </div>
          <form id="att-rule-form">
            <div class="form-grid">
              <div class="field">
                <label>迟到扣分</label>
                <input class="input" type="number" step="1" name="late" value="${ap.late}">
              </div>
              <div class="field">
                <label>缺勤扣分</label>
                <input class="input" type="number" step="1" name="absent" value="${ap.absent}">
              </div>
              <div class="field">
                <label>请假扣分</label>
                <input class="input" type="number" step="1" name="leave" value="${ap.leave}">
              </div>
              <div class="field">
                <label>出勤得分</label>
                <input class="input" type="number" step="1" name="present" value="${ap.present}">
              </div>
            </div>
            <div class="card-hint" style="margin-top:10px">修改后点击「重算出勤积分」可应用到已有考勤记录。</div>
            <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">
              <button class="btn sm" type="button" id="att-recalc">重算出勤积分</button>
              <button class="btn primary sm" type="submit">保存规则</button>
            </div>
          </form>
        </div>

        <div class="card flush">
          <div class="card-head">
            <div class="card-title"><span class="dot"></span>违规类型</div>
            <button class="btn sm" id="type-add">＋ 新增类型</button>
          </div>
          <div class="table-wrap">
            <table class="data">
              <thead><tr><th>类型</th><th>积分</th><th>累计次数</th><th class="actions">操作</th></tr></thead>
              <tbody>
                ${types.map((t) => {
                  const count = s.violations.filter((v) => v.typeId === t.id).length;
                  return `<tr>
                    <td>${UI.esc(t.name)}</td>
                    <td class="num"><span class="delta down">${t.points}</span></td>
                    <td class="num">${count} 次</td>
                    <td class="actions">
                      <button class="btn xs" data-edit-type="${t.id}">编辑</button>
                      <button class="btn xs danger" data-del-type="${t.id}">删除</button>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
            </table>
            ${types.length ? '' : UI.empty('暂无违规类型')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-head">
          <div class="card-title"><span class="dot"></span>数据管理</div>
          <span class="card-hint">数据仅保存在当前浏览器，请定期备份</span>
        </div>
        <div class="grid cols-4" style="margin-bottom:14px">
          <div class="stat teal"><div class="stat-label">学生</div><div class="stat-value" style="font-size:22px">${dataCount.students}</div></div>
          <div class="stat blue"><div class="stat-label">考试</div><div class="stat-value" style="font-size:22px">${dataCount.exams}</div></div>
          <div class="stat amber"><div class="stat-label">考勤日</div><div class="stat-value" style="font-size:22px">${dataCount.attendance}</div></div>
          <div class="stat rose"><div class="stat-label">积分记录</div><div class="stat-value" style="font-size:22px">${dataCount.records}</div></div>
        </div>
        <div class="btn-group">
          <button class="btn" id="data-export">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>
            导出数据（JSON）
          </button>
          <button class="btn" id="data-import">导入数据</button>
          <input type="file" id="data-file" accept="application/json,.json" style="display:none">
          <button class="btn danger" id="data-reset">恢复示例数据</button>
        </div>
        <p class="card-hint" style="margin-top:12px">导出后可用于备份或迁移到其他浏览器；恢复示例数据会清空当前所有内容。</p>
      </div>`;
  };

  function num(form, name, fallback) {
    const v = Number(form.querySelector(`[name="${name}"]`).value);
    return isNaN(v) ? fallback : v;
  }

  V.mount = function () {
    const metaForm = document.getElementById('meta-form');
    if (metaForm) {
      metaForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(metaForm);
        ['school', 'className', 'teacher', 'term'].forEach((k) => {
          Store.state.meta[k] = String(data.get(k) || '').trim();
        });
        Store.save();
        UI.toast('班级信息已保存', 'ok');
        App.render();
      });
    }

    const gradeForm = document.getElementById('grade-rule-form');
    if (gradeForm) {
      gradeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Store.state.settings.gradeRules = {
          upThreshold: Math.max(1, num(gradeForm, 'upThreshold', 5)),
          upPoints: Math.max(1, num(gradeForm, 'upPoints', 2)),
          downThreshold: Math.max(1, num(gradeForm, 'downThreshold', 5)),
          downPoints: Math.max(1, num(gradeForm, 'downPoints', 2))
        };
        Store.save();
        UI.toast('成绩奖惩规则已保存', 'ok');
        App.render();
      });
    }

    const gradeRecalc = document.getElementById('grade-recalc');
    if (gradeRecalc) {
      gradeRecalc.addEventListener('click', () => {
        UI.confirm('将按当前规则重新计算所有考试的奖惩积分，原有成绩类积分会被覆盖。是否继续？', { okText: '重新计算' })
          .then((ok) => {
            if (!ok) return;
            const exams = Store.exams();
            let total = 0;
            exams.forEach((ex) => {
              const res = Store.generateGradeRewards(ex.id);
              total += res.items.filter((i) => i.points !== 0).length;
            });
            Store.save();
            UI.toast(`已重新计算，共生成 ${total} 条成绩奖惩记录`, 'ok');
            App.render();
          });
      });
    }

    const attForm = document.getElementById('att-rule-form');
    if (attForm) {
      attForm.addEventListener('submit', (e) => {
        e.preventDefault();
        Store.state.settings.attendancePoints = {
          late: num(attForm, 'late', -2),
          absent: num(attForm, 'absent', -5),
          leave: num(attForm, 'leave', 0),
          present: num(attForm, 'present', 0)
        };
        Store.save();
        UI.toast('出勤扣分规则已保存', 'ok');
        App.render();
      });
    }

    const attRecalc = document.getElementById('att-recalc');
    if (attRecalc) {
      attRecalc.addEventListener('click', () => {
        const s = Store.state;
        s.records = s.records.filter((rec) => !(rec.category === '出勤' && rec.id.indexOf('a-') === 0));
        s.attendance.forEach((day) => {
          Object.keys(day.records).forEach((sid) => {
            const status = day.records[sid];
            const pts = s.settings.attendancePoints[status];
            if (pts) {
              const label = { late: '迟到', absent: '缺勤', leave: '请假', present: '出勤' }[status];
              s.records.push({
                id: 'a-' + day.date + '-' + sid, date: day.date, studentId: sid,
                category: '出勤', points: pts, reason: label, auto: true
              });
            }
          });
        });
        Store.save();
        UI.toast('已按当前出勤规则重算积分', 'ok');
        App.render();
      });
    }

    const typeAdd = document.getElementById('type-add');
    if (typeAdd) typeAdd.addEventListener('click', () => typeModal(null));

    document.querySelectorAll('[data-edit-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-edit-type');
        const type = Store.violationType(id);
        if (type) typeModal(type);
      });
    });

    document.querySelectorAll('[data-del-type]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-del-type');
        const type = Store.violationType(id);
        if (!type) return;
        const used = Store.state.violations.filter((v) => v.typeId === id).length;
        if (used) {
          UI.toast(`该类型已有 ${used} 条违规记录，无法删除`, 'err');
          return;
        }
        UI.confirm(`确定删除违规类型「${type.name}」吗？`, { danger: true, okText: '删除' }).then((ok) => {
          if (!ok) return;
          Store.state.settings.violationTypes = Store.state.settings.violationTypes.filter((t) => t.id !== id);
          Store.save();
          UI.toast('违规类型已删除', 'ok');
          App.render();
        });
      });
    });

    const exportBtn = document.getElementById('data-export');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const s = Store.state;
        const d = new Date();
        const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        UI.download(`${s.meta.className}-班级数据-${stamp}.json`, Store.exportJSON());
        UI.toast('数据已导出', 'ok');
      });
    }

    const importBtn = document.getElementById('data-import');
    const fileInput = document.getElementById('data-file');
    if (importBtn && fileInput) {
      importBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            Store.importJSON(String(reader.result));
            UI.toast('数据导入成功', 'ok');
            App.render();
          } catch (err) {
            UI.toast('导入失败：' + err.message, 'err');
          }
        };
        reader.readAsText(file);
        fileInput.value = '';
      });
    }

    const reset = document.getElementById('data-reset');
    if (reset) {
      reset.addEventListener('click', () => {
        UI.confirm('确定恢复示例数据吗？当前所有学生、成绩、考勤、违规与积分记录都会被覆盖，且无法撤销。', {
          danger: true, okText: '恢复示例'
        }).then((ok) => {
          if (!ok) return;
          Store.reset();
          UI.toast('已恢复示例数据', 'ok');
          App.render();
        });
      });
    }
  };

  window.SettingsView = V;
})();
