/* =========================================================
   数据层：班级管家
   所有数据保存在浏览器 localStorage，可按需导出 / 导入 JSON
   ========================================================= */
(function () {
  'use strict';

  const STORAGE_KEY = 'class-manager/v2';

  const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 9);
  const pad = (n) => String(n).padStart(2, '0');

  function fmtDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  function todayStr() {
    return fmtDate(new Date());
  }

  const SEED_STUDENTS = [
    ['张伟', '男', '第一组', '20260301'],
    ['王芳', '女', '第一组', '20260302'],
    ['李娜', '女', '第一组', '20260303'],
    ['刘洋', '男', '第一组', '20260304'],
    ['陈静', '女', '第一组', '20260305'],
    ['杨帆', '男', '第二组', '20260306'],
    ['赵磊', '男', '第二组', '20260307'],
    ['黄敏', '女', '第二组', '20260308'],
    ['周杰', '男', '第二组', '20260309'],
    ['吴桐', '女', '第二组', '20260310'],
    ['徐鹏', '男', '第三组', '20260311'],
    ['孙悦', '女', '第三组', '20260312'],
    ['马晓', '女', '第三组', '20260313'],
    ['朱琳', '女', '第三组', '20260314'],
    ['郭涛', '男', '第三组', '20260315'],
    ['何雨', '女', '第四组', '20260316'],
    ['高远', '男', '第四组', '20260317'],
    ['林可', '女', '第四组', '20260318'],
    ['罗宇', '男', '第四组', '20260319'],
    ['谢婷', '女', '第四组', '20260320']
  ];

  const SEED_SCORES = {
    e1: [78, 85, 62, 91, 74, 88, 69, 95, 58, 81, 77, 90, 66, 84, 72, 89, 61, 79, 93, 70],
    e2: [82, 83, 68, 88, 79, 91, 65, 93, 64, 84, 80, 87, 71, 86, 75, 92, 67, 82, 90, 74],
    e3: [85, 77, 72, 86, 85, 94, 70, 91, 69, 88, 84, 80, 76, 89, 79, 95, 73, 85, 87, 78]
  };

  const SEED_ATTENDANCE_EVENTS = {
    '2026-11-02': { s9: 'absent', s13: 'late' },
    '2026-11-03': { s5: 'late', s18: 'leave' },
    '2026-11-04': { s9: 'late', s16: 'absent' },
    '2026-11-05': { s2: 'leave', s11: 'late' },
    '2026-11-06': { s6: 'late' }
  };

  const SEED_VIOLATIONS = [
    ['2026-10-28', 's9', 'homework', '未完成数学作业'],
    ['2026-10-29', 's13', 'discipline', '上课与同桌讲话'],
    ['2026-10-30', 's16', 'late', '早读迟到 10 分钟'],
    ['2026-11-02', 's9', 'phone', '课间使用手机'],
    ['2026-11-03', 's11', 'appearance', '校服未按要求穿着'],
    ['2026-11-04', 's16', 'discipline', '自习课随意走动'],
    ['2026-11-05', 's18', 'discipline', '午休讲话']
  ];

  function buildSeed() {
    const students = SEED_STUDENTS.map(([name, gender, group, no], i) => ({
      id: 's' + (i + 1), name, gender, group, no
    }));

    const exams = [
      { id: 'e1', name: '开学考', date: '2026-09-04', fullScore: 100, note: '总分' },
      { id: 'e2', name: '第一次月考', date: '2026-09-29', fullScore: 100, note: '总分' },
      { id: 'e3', name: '期中考试', date: '2026-11-03', fullScore: 100, note: '总分' }
    ];

    const scores = {};
    Object.keys(SEED_SCORES).forEach((examId) => {
      scores[examId] = {};
      students.forEach((st, i) => {
        scores[examId][st.id] = SEED_SCORES[examId][i];
      });
    });

    const attendance = Object.keys(SEED_ATTENDANCE_EVENTS).map((date) => {
      const records = {};
      students.forEach((st) => {
        records[st.id] = SEED_ATTENDANCE_EVENTS[date][st.id] || 'present';
      });
      return { id: 'a-' + date, date, records, savedAt: date + ' 08:10' };
    }).sort((a, b) => a.date.localeCompare(b.date));

    const violations = SEED_VIOLATIONS.map(([date, studentId, typeId, note], i) => ({
      id: 'v' + (i + 1), date, studentId, typeId, note
    }));

    const settings = {
      gradeRules: { upThreshold: 5, upPoints: 3, downThreshold: 5, downPoints: 2 },
      attendancePoints: { late: -2, absent: -5, leave: 0, present: 0 },
      violationTypes: [
        { id: 'late', name: '迟到', points: -2 },
        { id: 'homework', name: '未交作业', points: -3 },
        { id: 'discipline', name: '课堂违纪', points: -2 },
        { id: 'appearance', name: '仪容仪表', points: -1 },
        { id: 'phone', name: '使用手机', points: -5 },
        { id: 'conflict', name: '打架冲突', points: -10 }
      ]
    };

    const state = {
      version: 1,
      meta: {
        school: '明德中学',
        className: '高一（3）班',
        teacher: '王老师',
        term: '2026—2027 学年 第一学期'
      },
      settings,
      students,
      exams,
      scores,
      attendance,
      violations,
      records: [
        { id: 'm1', date: '2026-10-27', studentId: 's10', category: '其他', points: 3, reason: '课堂表现优秀', auto: false },
        { id: 'm2', date: '2026-10-30', studentId: 's5', category: '其他', points: 2, reason: '主动帮助同学', auto: false },
        { id: 'm3', date: '2026-11-03', studentId: 's2', category: '其他', points: 2, reason: '作业质量优秀', auto: false },
        { id: 'm4', date: '2026-10-28', studentId: 's1', category: '其他', points: 3, reason: '作业质量优秀', auto: false },
        { id: 'm5', date: '2026-10-28', studentId: 's4', category: '其他', points: 3, reason: '运动会积极参与', auto: false },
        { id: 'm6', date: '2026-10-29', studentId: 's8', category: '其他', points: 3, reason: '课堂发言积极', auto: false },
        { id: 'm7', date: '2026-10-31', studentId: 's12', category: '其他', points: 3, reason: '卫生值日认真', auto: false },
        { id: 'm8', date: '2026-11-02', studentId: 's16', category: '其他', points: 2, reason: '主动帮助同学', auto: false },
        { id: 'm9', date: '2026-11-04', studentId: 's18', category: '其他', points: 3, reason: '作业进步明显', auto: false },
        { id: 'm10', date: '2026-11-05', studentId: 's20', category: '其他', points: 2, reason: '课堂表现优秀', auto: false },
        { id: 'm11', date: '2026-11-06', studentId: 's17', category: '其他', points: 3, reason: '学习态度端正', auto: false }
      ]
    };

    // 生成种子数据对应的自动积分记录
    state.violations.forEach((v) => {
      const type = settings.violationTypes.find((t) => t.id === v.typeId) || { name: '违纪', points: 0 };
      state.records.push({
        id: 'v-' + v.id, date: v.date, studentId: v.studentId, category: '违规',
        points: type.points, reason: type.name, auto: true
      });
    });

    state.attendance.forEach((day) => {
      Object.keys(day.records).forEach((studentId) => {
        const status = day.records[studentId];
        const pts = settings.attendancePoints[status];
        if (pts) {
          const label = { late: '迟到', absent: '缺勤', leave: '请假' }[status];
          state.records.push({
            id: 'a-' + day.date + '-' + studentId, date: day.date, studentId,
            category: '出勤', points: pts, reason: label, auto: true
          });
        }
      });
    });

    return state;
  }

  const Store = {
    state: null,

    init() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && parsed.students && parsed.settings) {
            this.state = this.normalize(parsed);
            this.save();
            return;
          }
        }
      } catch (e) {
        console.warn('读取本地数据失败，已重建示例数据', e);
      }
      this.state = buildSeed();
      this.generateGradeRewards('e2', { silent: true });
      this.generateGradeRewards('e3', { silent: true });
      this.save();
    },

    normalize(s) {
      const fresh = buildSeed();
      return {
        version: 1,
        meta: Object.assign(fresh.meta, s.meta || {}),
        settings: {
          gradeRules: Object.assign(fresh.settings.gradeRules, (s.settings && s.settings.gradeRules) || {}),
          attendancePoints: Object.assign(fresh.settings.attendancePoints, (s.settings && s.settings.attendancePoints) || {}),
          violationTypes: (s.settings && s.settings.violationTypes) || fresh.settings.violationTypes
        },
        students: s.students || [],
        exams: s.exams || [],
        scores: s.scores || {},
        attendance: s.attendance || [],
        violations: s.violations || [],
        records: s.records || []
      };
    },

    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error('保存失败', e);
      }
    },

    reset() {
      this.state = buildSeed();
      this.generateGradeRewards('e2', { silent: true });
      this.generateGradeRewards('e3', { silent: true });
      this.save();
    },

    uid,

    /* ---------- 基础查询 ---------- */
    students() {
      return this.state.students;
    },
    student(id) {
      return this.state.students.find((s) => s.id === id);
    },
    exams() {
      return this.state.exams.slice().sort((a, b) => a.date.localeCompare(b.date));
    },
    latestExam() {
      const list = this.exams();
      return list[list.length - 1] || null;
    },
    getExam(id) {
      return this.state.exams.find((e) => e.id === id) || null;
    },
    scoreOf(examId, studentId) {
      const row = this.state.scores[examId];
      const v = row ? row[studentId] : null;
      return typeof v === 'number' && !isNaN(v) ? v : null;
    },
    scoresOf(examId) {
      const row = this.state.scores[examId] || {};
      return this.state.students
        .map((s) => ({ student: s, score: typeof row[s.id] === 'number' ? row[s.id] : null }))
        .filter((x) => x.score !== null);
    },

    examStats(examId) {
      const rows = this.scoresOf(examId);
      if (!rows.length) return null;
      const values = rows.map((r) => r.score);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const max = Math.max.apply(null, values);
      const min = Math.min.apply(null, values);
      const pass = values.filter((v) => v >= 60).length;
      const excellent = values.filter((v) => v >= 85).length;
      const sorted = rows.slice().sort((a, b) => b.score - a.score);
      return {
        count: values.length, avg, max, min,
        passRate: pass / values.length, excellentRate: excellent / values.length,
        top: sorted[0], bottom: sorted[sorted.length - 1],
        rows: sorted.map((r, i) => Object.assign({ rank: i + 1 }, r))
      };
    },

    /** 分数段分布 */
    scoreBuckets(examId) {
      const buckets = [
        { label: '90-100', min: 90, max: 100, count: 0 },
        { label: '80-89', min: 80, max: 89, count: 0 },
        { label: '70-79', min: 70, max: 79, count: 0 },
        { label: '60-69', min: 60, max: 69, count: 0 },
        { label: '60以下', min: 0, max: 59, count: 0 }
      ];
      this.scoresOf(examId).forEach((r) => {
        const b = buckets.find((x) => r.score >= x.min && r.score <= x.max);
        if (b) b.count++;
      });
      return buckets;
    },

    /* ---------- 积分 ---------- */
    records() {
      return this.state.records.slice().sort((a, b) => b.date.localeCompare(a.date));
    },
    totalPoints(studentId) {
      return this.state.records
        .filter((r) => r.studentId === studentId)
        .reduce((sum, r) => sum + (Number(r.points) || 0), 0);
    },
    pointsByCategory(studentId) {
      const out = {};
      this.state.records.filter((r) => r.studentId === studentId).forEach((r) => {
        out[r.category] = (out[r.category] || 0) + (Number(r.points) || 0);
      });
      return out;
    },
    leaderboard() {
      return this.state.students
        .map((s) => ({ student: s, points: this.totalPoints(s.id) }))
        .sort((a, b) => b.points - a.points || a.student.no.localeCompare(b.student.no));
    },
    addRecord({ studentId, points, category, reason, date }) {
      this.state.records.push({
        id: uid('r'), date: date || todayStr(), studentId,
        category: category || '其他', points: Number(points) || 0,
        reason: reason || '', auto: false
      });
      this.save();
    },
    deleteRecord(id) {
      this.state.records = this.state.records.filter((r) => r.id !== id);
      this.save();
    },

    /* ---------- 出勤 ---------- */
    attendanceDay(date) {
      return this.state.attendance.find((d) => d.date === date) || null;
    },
    attendanceDays() {
      return this.state.attendance.slice().sort((a, b) => b.date.localeCompare(a.date));
    },
    attendanceStats(studentId) {
      const out = { present: 0, late: 0, leave: 0, absent: 0, total: 0, rate: null };
      this.state.attendance.forEach((day) => {
        const status = day.records[studentId];
        if (!status) return;
        out.total++;
        if (status in out) out[status]++;
      });
      if (out.total) out.rate = (out.present + out.late) / out.total;
      return out;
    },
    /** 按日期保存出勤，并同步迟到/缺勤积分 */
    saveAttendance(date, records) {
      const s = this.state;
      let day = this.attendanceDay(date);
      if (!day) {
        day = { id: 'a-' + date, date, records: {}, savedAt: '' };
        s.attendance.push(day);
        s.attendance.sort((a, b) => a.date.localeCompare(b.date));
      }
      day.records = records;
      const at = new Date();
      day.savedAt = date + ' ' + pad(at.getHours()) + ':' + pad(at.getMinutes());

      // 重建该日期由出勤产生的积分
      s.records = s.records.filter((r) => !(r.id.indexOf('a-' + date + '-') === 0));
      Object.keys(records).forEach((studentId) => {
        const status = records[studentId];
        const pts = s.settings.attendancePoints[status];
        if (pts) {
          const label = { late: '迟到', absent: '缺勤', leave: '请假', present: '出勤' }[status];
          s.records.push({
            id: 'a-' + date + '-' + studentId, date, studentId,
            category: '出勤', points: pts, reason: label, auto: true
          });
        }
      });
      this.save();
    },

    /* ---------- 违规 ---------- */
    violationType(id) {
      return this.state.settings.violationTypes.find((t) => t.id === id) || null;
    },
    violationCount(studentId) {
      return this.state.violations.filter((v) => v.studentId === studentId).length;
    },
    violations() {
      return this.state.violations.slice().sort((a, b) => b.date.localeCompare(a.date));
    },
    addViolation({ date, studentId, typeId, note }) {
      const s = this.state;
      const type = this.violationType(typeId);
      const v = { id: uid('v'), date, studentId, typeId, note: note || '' };
      s.violations.push(v);
      s.records.push({
        id: 'v-' + v.id, date, studentId, category: '违规',
        points: type ? type.points : 0, reason: type ? type.name : '违纪', auto: true
      });
      this.save();
      return v;
    },
    deleteViolation(id) {
      const s = this.state;
      s.violations = s.violations.filter((v) => v.id !== id);
      s.records = s.records.filter((r) => r.id !== 'v-' + id);
      this.save();
    },
    violationByType() {
      const map = {};
      this.state.violations.forEach((v) => {
        const type = this.violationType(v.typeId);
        const name = type ? type.name : '其他';
        map[name] = (map[name] || 0) + 1;
      });
      return Object.keys(map).map((name) => ({ label: name, value: map[name] }))
        .sort((a, b) => b.value - a.value);
    },

    /* ---------- 成绩奖惩 ---------- */
    generateGradeRewards(examId, opts) {
      opts = opts || {};
      const s = this.state;
      const exams = this.exams();
      const idx = exams.findIndex((e) => e.id === examId);
      if (idx <= 0) return { prev: null, items: [] };
      const exam = exams[idx];
      const prev = exams[idx - 1];
      const rules = s.settings.gradeRules;

      const items = [];
      s.students.forEach((st) => {
        const cur = this.scoreOf(exam.id, st.id);
        const old = this.scoreOf(prev.id, st.id);
        if (cur === null || old === null) return;
        const delta = cur - old;
        let points = 0;
        if (delta >= rules.upThreshold) points = rules.upPoints;
        else if (delta <= -rules.downThreshold) points = -rules.downPoints;
        items.push({ studentId: st.id, student: st, delta, points, current: cur, previous: old });
      });

      if (!opts.dryRun) {
        s.records = s.records.filter((r) => !(r.examId === exam.id && r.category === '成绩'));
        items.filter((i) => i.points !== 0).forEach((i) => {
          const label = i.points > 0 ? `成绩进步 ${i.delta} 分` : `成绩下滑 ${Math.abs(i.delta)} 分`;
          s.records.push({
            id: 'g-' + exam.id + '-' + i.studentId, date: exam.date, studentId: i.studentId,
            category: '成绩', points: i.points, reason: `${exam.name}${label}`,
            examId: exam.id, auto: true
          });
        });
        if (!opts.silent) this.save();
      }
      return { prev, exam, items };
    },
    gradeRewardRecords(examId) {
      return this.state.records.filter((r) => r.examId === examId && r.category === '成绩');
    },

    /* ---------- 汇总 ---------- */
    summary() {
      const s = this.state;
      const latest = this.latestExam();
      const stats = latest ? this.examStats(latest.id) : null;
      const studentCount = s.students.length;
      let totalSlots = 0, attended = 0;
      s.attendance.forEach((day) => {
        s.students.forEach((st) => {
          const status = day.records[st.id];
          if (!status) return;
          totalSlots++;
          if (status === 'present' || status === 'late') attended++;
        });
      });
      const attendanceRate = totalSlots ? attended / totalSlots : null;
      const violationTotal = s.violations.length;
      const top = this.leaderboard()[0] || null;
      const avgPoints = studentCount
        ? s.students.reduce((sum, st) => sum + this.totalPoints(st.id), 0) / studentCount
        : 0;
      return { studentCount, latest, stats, attendanceRate, violationTotal, top, avgPoints };
    },

    /* ---------- 导入 / 导出 ---------- */
    exportJSON() {
      return JSON.stringify(this.state, null, 2);
    },
    importJSON(text) {
      const parsed = JSON.parse(text);
      if (!parsed || !Array.isArray(parsed.students) || !parsed.settings) {
        throw new Error('文件格式不正确');
      }
      this.state = this.normalize(parsed);
      this.save();
    }
  };

  window.Store = Store;
})();
