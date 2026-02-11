// ===============================
// AUTH
// ===============================
const ADMIN_PASSWORDS = {
  '2024': { name: 'نعمه فائع عسيري', role: 'معلمة اللغة الإنجليزية' },
  '1448': { name: 'عيشة عواجي', role: 'وكيلة شؤون الطالبات' },
  '0000': { name: 'هبه صم', role: 'مديرة المدرسة' },
  '1111': { name: 'فاطمه الحربي', role: 'موجهة طلابية' },
  '2222': { name: 'نوره فقيه', role: 'ادارية' },
  '3333': { name: 'ليلى نامسي', role: 'ادارية' },
  '4444': { name: 'هاجر صميلي', role: 'ادارية' }
};

let currentUser = null;
let isViewOnly = false;

const loginModal = document.getElementById('loginModal');
const viewModeOverlay = document.getElementById('viewModeOverlay');
const passwordInput = document.getElementById('passwordInput');
const loginError = document.getElementById('loginError');

const loginBtn = document.getElementById('loginBtn');
const viewModeBtn = document.getElementById('viewModeBtn');
const logoutBtn = document.getElementById('logoutBtn');

function showLoginError(message){
  loginError.textContent = message;
  loginError.style.display = 'block';
  setTimeout(() => (loginError.style.display = 'none'), 3000);
}

function preventEditInViewMode(e){
  if (!isViewOnly) return;
  const t = e.target;

  const blocked =
    t.classList?.contains('btn-primary') ||
    t.classList?.contains('btn-success') ||
    t.classList?.contains('btn-danger') ||
    t.classList?.contains('btn-icon') ||
    t.tagName === 'INPUT' ||
    t.tagName === 'SELECT' ||
    t.tagName === 'TEXTAREA' ||
    t.dataset?.att === '1';

  if (blocked){
    e.preventDefault();
    e.stopPropagation();
    showToast('⚠️ وضع القراءة فقط - لا يمكنك التعديل');
    return false;
  }
}

function enableEditMode(){
  document.removeEventListener('click', preventEditInViewMode, true);
}

function disableEditMode(){
  document.addEventListener('click', preventEditInViewMode, true);
}

function attemptLogin(){
  const password = passwordInput.value.trim();
  if (!password) return showLoginError('⚠️ الرجاء إدخال الرقم السري');

  if (ADMIN_PASSWORDS[password]){
    currentUser = ADMIN_PASSWORDS[password];
    isViewOnly = false;

    loginModal.style.display = 'none';
    viewModeOverlay.style.display = 'none';

    const initials = currentUser.name.split(' ').slice(0,2).map(w => w[0]).join('');
    document.querySelector('.user-avatar').textContent = initials;
    document.querySelector('.user-name').textContent = currentUser.name;
    document.querySelector('.user-role').textContent = currentUser.role;

    enableEditMode();
    showToast(`✅ مرحباً ${currentUser.name}`);
  } else {
    passwordInput.value = '';
    passwordInput.focus();
    showLoginError('❌ الرقم السري غير صحيح');
  }
}

function enterViewMode(){
  isViewOnly = true;
  currentUser = { name: 'زائر', role: 'قراءة فقط' };

  loginModal.style.display = 'none';
  viewModeOverlay.style.display = 'block';

  document.querySelector('.user-avatar').textContent = '👁️';
  document.querySelector('.user-name').textContent = 'زائر';
  document.querySelector('.user-role').textContent = 'قراءة فقط';

  disableEditMode();
  showToast('👁️ دخلتِ في وضع القراءة فقط');
}

function logout(){
  if (!confirm('هل أنتِ متأكدة من تسجيل الخروج؟')) return;

  currentUser = null;
  isViewOnly = false;

  enableEditMode();

  loginModal.style.display = 'flex';
  viewModeOverlay.style.display = 'none';
  passwordInput.value = '';
  passwordInput.focus();

  showToast('🚪 تم تسجيل الخروج بنجاح');
}

loginBtn.addEventListener('click', attemptLogin);
viewModeBtn.addEventListener('click', enterViewMode);
logoutBtn.addEventListener('click', logout);
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') attemptLogin();
});

// ===============================
// TAB NAV
// ===============================
window.showTab = function(tabName, btn){
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  document.getElementById('tab-' + tabName).classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabName === 'register') updateAttendanceTable();
  if (tabName === 'admin') renderAdminDashboard();
  if (tabName === 'certificates') generateCertificates();
};

// ===============================
// TOAST
// ===============================
function showToast(msg){
  const toast = document.createElement('div');
  toast.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);' +
    'background:#0a2463;color:#fff;padding:12px 24px;border-radius:12px;' +
    'font-family:Cairo,sans-serif;font-size:13px;font-weight:800;z-index:9999;' +
    'box-shadow:0 8px 24px rgba(0,0,0,.3)';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ===============================
// ATTENDANCE
// ===============================
const ACADEMIC_DAYS = [
  { date:'29/7', day:'الأحد', week:1 },
  { date:'30/7', day:'الإثنين', week:1 },
  { date:'1/8',  day:'الثلاثاء', week:1 },
  { date:'2/8',  day:'الأربعاء', week:1 },
  { date:'3/8',  day:'الخميس', week:1 },
  { date:'7/8',  day:'الأحد', week:2 },
  { date:'8/8',  day:'الإثنين', week:2 },
  { date:'9/8',  day:'الثلاثاء', week:2 },
  { date:'10/8', day:'الأربعاء', week:2 },
  { date:'11/8', day:'الخميس', week:2 }
];

let attendanceData = {}; // key: `${studentId}-${date}` => 'P'|'A'|'E'|'L'

function toggleAttendance(key){
  if (isViewOnly){
    showToast('⚠️ وضع القراءة فقط - لا يمكنك التعديل');
    return;
  }
  const current = attendanceData[key] || '';
  const cycle = { '': 'P', P: 'A', A: 'E', E: 'L', L: 'P' };
  attendanceData[key] = cycle[current];
  updateAttendanceTable();
}

window.updateAttendanceTable = function(){
  const grade = document.getElementById('registerGrade').value;
  const section = document.getElementById('registerSection').value;

  let filtered = STUDENTS.slice();
  if (grade !== 'all') filtered = filtered.filter(s => s.grade === grade);
  if (section !== 'all') filtered = filtered.filter(s => s.section === section);

  const container = document.getElementById('attendanceTableContainer');

  if (filtered.length === 0){
    container.innerHTML = `
      <div class="empty">
        <div class="empty-ico">👥</div>
        <div class="empty-title">لا توجد طالبات</div>
        <div class="empty-sub">اذهبي لتبويب "إدارة الطالبات" لإضافة طالبات جديدة</div>
        <button class="btn btn-primary" onclick="showTab('students', document.querySelectorAll('.tab-btn')[1])">➕ إضافة طالبات</button>
      </div>
    `;
    return;
  }

  // Auto-generate demo statuses
  filtered.forEach(s => {
    ACADEMIC_DAYS.forEach(d => {
      const k = `${s.id}-${d.date}`;
      if (!attendanceData[k]){
        const statuses = ['P','P','P','P','A','E','L'];
        attendanceData[k] = statuses[Math.floor(Math.random()*statuses.length)];
      }
    });
  });

  let html = `
    <div style="background:#fff;border-radius:12px;border:1px solid var(--gray-200);overflow:hidden">
      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;min-width:860px">
          <thead>
            <tr style="background:var(--teal-lt);border-bottom:2px solid var(--teal)">
              <th style="padding:12px;text-align:right;font-size:11px;font-weight:900;color:var(--teal);position:sticky;right:0;background:var(--teal-lt);z-index:10">اسم الطالبة</th>
              ${ACADEMIC_DAYS.map(d => `
                <th style="padding:12px;text-align:center;font-size:10px;font-weight:900;color:var(--teal)">
                  ${d.day}<br><span style="font-size:9px">${d.date}</span>
                </th>
              `).join('')}
              <th style="padding:12px;text-align:center;font-size:11px;font-weight:900;color:var(--present);background:var(--present-lt)">ح</th>
              <th style="padding:12px;text-align:center;font-size:11px;font-weight:900;color:var(--absent);background:var(--absent-lt)">غ</th>
              <th style="padding:12px;text-align:center;font-size:11px;font-weight:900;color:var(--excused);background:var(--excused-lt)">ع</th>
              <th style="padding:12px;text-align:center;font-size:11px;font-weight:900;color:var(--late);background:var(--late-lt)">ت</th>
            </tr>
          </thead>
          <tbody>
  `;

  filtered.forEach(student => {
    let P=0,A=0,E=0,L=0;
    const initials = student.name.split(' ').slice(0,2).map(w=>w[0]).join('');

    html += `
      <tr style="border-bottom:1px solid var(--gray-100)">
        <td style="padding:12px;position:sticky;right:0;background:#fff;z-index:5;border-left:2px solid var(--gray-100)">
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:50%;background:${student.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;color:#fff">${initials}</div>
            <div>
              <div style="font-size:13px;font-weight:900;color:var(--navy)">${student.name}</div>
              <div style="font-size:10px;color:var(--gray-600)">${student.id}</div>
            </div>
          </div>
        </td>
    `;

    ACADEMIC_DAYS.forEach(d => {
      const key = `${student.id}-${d.date}`;
      const status = attendanceData[key] || '';
      const icon = {P:'ح',A:'غ',E:'ع',L:'ت'}[status] || '—';
      const c = {P:'var(--present)',A:'var(--absent)',E:'var(--excused)',L:'var(--late)'}[status] || 'var(--gray-400)';
      const bg = {P:'var(--present-lt)',A:'var(--absent-lt)',E:'var(--excused-lt)',L:'var(--late-lt)'}[status] || 'var(--gray-100)';

      if(status==='P')P++; else if(status==='A')A++; else if(status==='E')E++; else if(status==='L')L++;

      html += `
        <td style="padding:8px;text-align:center">
          <button data-att="1"
            onclick="toggleAttendance('${key}')"
            style="width:32px;height:28px;background:${bg};color:${c};border:none;border-radius:6px;font-size:11px;font-weight:900;cursor:pointer;transition:.2s"
            onmouseover="this.style.transform='scale(1.08)'"
            onmouseout="this.style.transform='scale(1)'"
          >${icon}</button>
        </td>
      `;
    });

    html += `
      <td style="padding:12px;text-align:center;font-size:14px;font-weight:900;color:var(--present)">${P}</td>
      <td style="padding:12px;text-align:center;font-size:14px;font-weight:900;color:var(--absent)">${A}</td>
      <td style="padding:12px;text-align:center;font-size:14px;font-weight:900;color:var(--excused)">${E}</td>
      <td style="padding:12px;text-align:center;font-size:14px;font-weight:900;color:var(--late)">${L}</td>
      </tr>
    `;
  });

  html += `</tbody></table></div></div>`;
  container.innerHTML = html;
};

function exportAttendanceExcel(){
  showToast('📊 (تجريبي) تصدير Excel لاحقاً');
}

// ===============================
// STUDENTS
// ===============================
let STUDENTS = [];
let studentIdCounter = 1;

const COLORS = [
  '#1e5ef3','#16a34a','#d97706','#7c3aed','#dc2626','#0d9488',
  '#db2777','#0284c7','#9333ea','#b45309','#0f766e','#be185d',
  '#2563eb','#059669','#c026d3','#ea580c','#0891b2','#7c2d12'
];

function renderStudents(){
  const list = document.getElementById('studentsList');
  document.getElementById('studentCount').textContent = STUDENTS.length;

  if (STUDENTS.length === 0){
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--gray-600)">لم يتم إضافة طالبات بعد</div>`;
    return;
  }

  let html = '';
  STUDENTS.forEach((s,i) => {
    const initials = s.name.split(' ').slice(0,2).map(w=>w[0]).join('');
    const gradeName = {first:'الأول',second:'الثاني',third:'الثالث'}[s.grade];
    html += `
      <div class="student-item">
        <div class="student-avatar" style="background:${s.color}">${initials}</div>
        <div class="student-info">
          <div class="student-name">${s.name}</div>
          <div class="student-meta">${s.id} • ${gradeName} ثانوي • شعبة ${s.section}</div>
        </div>
        <div>
          <button class="btn-icon btn-delete" onclick="deleteStudent(${i})">🗑️</button>
        </div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function clearForm(){
  document.getElementById('studentName').value = '';
}

function addStudent(){
  if (isViewOnly) return showToast('⚠️ وضع القراءة فقط - لا يمكنك إضافة طالبات');

  const name = document.getElementById('studentName').value.trim();
  const grade = document.getElementById('studentGrade').value;
  const section = document.getElementById('studentSection').value;

  if (!name) return showToast('⚠️ الرجاء إدخال اسم الطالبة');

  const student = {
    id: `S${String(studentIdCounter).padStart(3,'0')}`,
    name, grade, section,
    color: COLORS[(studentIdCounter - 1) % COLORS.length]
  };

  STUDENTS.push(student);
  studentIdCounter++;
  clearForm();
  renderStudents();
  updateHeaderStats();
  updateAttendanceTable();
  showToast('✅ تمت إضافة الطالبة');
}

function importBulk(){
  if (isViewOnly) return showToast('⚠️ وضع القراءة فقط - لا يمكنك استيراد طالبات');

  const text = document.getElementById('bulkImport').value.trim();
  const grade = document.getElementById('bulkGrade').value;
  const section = document.getElementById('bulkSection').value;

  if (!text) return showToast('⚠️ الرجاء لصق أسماء الطالبات');

  const names = text.split('\n').map(s=>s.trim()).filter(Boolean);
  let count = 0;

  names.forEach(n => {
    const student = {
      id: `S${String(studentIdCounter).padStart(3,'0')}`,
      name: n, grade, section,
      color: COLORS[(studentIdCounter - 1) % COLORS.length]
    };
    STUDENTS.push(student);
    studentIdCounter++;
    count++;
  });

  document.getElementById('bulkImport').value = '';
  renderStudents();
  updateHeaderStats();
  updateAttendanceTable();
  showToast(`✅ تمت إضافة ${count} طالبة`);
}

window.deleteStudent = function(index){
  if (isViewOnly) return showToast('⚠️ وضع القراءة فقط - لا يمكنك حذف طالبات');
  if (!confirm('هل أنتِ متأكدة من حذف هذه الطالبة؟')) return;

  STUDENTS.splice(index,1);
  renderStudents();
  updateHeaderStats();
  updateAttendanceTable();
  showToast('🗑️ تم حذف الطالبة');
};

function clearAll(){
  if (isViewOnly) return showToast('⚠️ وضع القراءة فقط');
  if (!confirm('هل أنتِ متأكدة من حذف جميع الطالبات؟')) return;

  STUDENTS = [];
  studentIdCounter = 1;
  attendanceData = {};
  renderStudents();
  updateHeaderStats();
  updateAttendanceTable();
  showToast('🗑️ تم مسح جميع الطالبات');
}

function applyToSystem(){
  if (STUDENTS.length === 0) return showToast('⚠️ الرجاء إضافة طالبات أولاً');
  showToast('✅ تم تطبيق بيانات الطالبات على النظام');
}

// ===============================
// REPORTS (simple)
// ===============================
function generateReportStats(){
  const total = Math.max(1, STUDENTS.length) * ACADEMIC_DAYS.length;
  const P = Math.floor(total * 0.85);
  const A = Math.floor(total * 0.08);
  const E = Math.floor(total * 0.05);
  const L = total - P - A - E;

  document.getElementById('reportStats').innerHTML = `
    <div style="background:var(--blue-xs);padding:16px;border-radius:10px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:var(--blue);margin-bottom:4px">${STUDENTS.length}</div>
      <div style="font-size:11px;color:var(--gray-600);font-weight:800">إجمالي الطالبات</div>
    </div>
    <div style="background:var(--present-lt);padding:16px;border-radius:10px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:var(--present);margin-bottom:4px">${P}</div>
      <div style="font-size:11px;color:var(--gray-600);font-weight:800">حضور</div>
    </div>
    <div style="background:var(--absent-lt);padding:16px;border-radius:10px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:var(--absent);margin-bottom:4px">${A}</div>
      <div style="font-size:11px;color:var(--gray-600);font-weight:800">غياب بدون عذر</div>
    </div>
    <div style="background:var(--excused-lt);padding:16px;border-radius:10px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:var(--excused);margin-bottom:4px">${E}</div>
      <div style="font-size:11px;color:var(--gray-600);font-weight:800">غياب بعذر</div>
    </div>
    <div style="background:var(--late-lt);padding:16px;border-radius:10px;text-align:center">
      <div style="font-size:28px;font-weight:900;color:var(--late);margin-bottom:4px">${L}</div>
      <div style="font-size:11px;color:var(--gray-600);font-weight:800">تأخير</div>
    </div>
  `;
}

function generateReportTable(){
  let html = `
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:var(--gray-50)">
          <th style="padding:10px;text-align:right;border-bottom:2px solid var(--gray-200);font-size:12px">الطالبة</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid var(--gray-200);font-size:12px">حضور</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid var(--gray-200);font-size:12px">غياب</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid var(--gray-200);font-size:12px">عذر</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid var(--gray-200);font-size:12px">تأخير</th>
          <th style="padding:10px;text-align:center;border-bottom:2px solid var(--gray-200);font-size:12px">النسبة</th>
        </tr>
      </thead>
      <tbody>
  `;

  (STUDENTS.length ? STUDENTS : [{name:'— لا توجد طالبات —'}]).slice(0,10).forEach(s => {
    const total = ACADEMIC_DAYS.length;
    const p = s.name.startsWith('—') ? 0 : Math.max(0, total - (Math.floor(Math.random()*3)));
    const a = s.name.startsWith('—') ? 0 : Math.floor(Math.random()*2);
    const e = s.name.startsWith('—') ? 0 : Math.floor(Math.random()*2);
    const l = Math.max(0, total - p - a - e);
    const pct = total ? Math.round((p/total)*100) : 0;

    html += `
      <tr style="border-bottom:1px solid var(--gray-100)">
        <td style="padding:10px;font-size:12px;font-weight:800">${s.name}</td>
        <td style="padding:10px;text-align:center;color:var(--present);font-weight:900">${p}</td>
        <td style="padding:10px;text-align:center;color:var(--absent);font-weight:900">${a}</td>
        <td style="padding:10px;text-align:center;color:var(--excused);font-weight:900">${e}</td>
        <td style="padding:10px;text-align:center;color:var(--late);font-weight:900">${l}</td>
        <td style="padding:10px;text-align:center;font-weight:900;color:${pct>=90?'var(--present)':'var(--absent)'}">${pct}%</td>
      </tr>
    `;
  });

  html += `</tbody></table>`;
  document.getElementById('reportTable').innerHTML = html;
}

function openReport(type){
  document.getElementById('reportsEmptyState').style.display = 'none';
  document.getElementById('reportContent').style.display = 'block';

  const today = new Date().toLocaleDateString('ar-SA');
  const titleMap = {daily:'تقرير الحضور اليومي',weekly:'تقرير الحضور الأسبوعي',monthly:'تقرير الحضور الشهري'};
  const dateMap = {
    daily:`التاريخ: ${today}`,
    weekly:'الأسبوع الأول: 29 رجب - 3 شعبان 1448 هـ',
    monthly:'شهر شعبان 1448 هـ (الفصل الدراسي الثاني)'
  };

  document.getElementById('reportTitle').textContent = titleMap[type];
  document.getElementById('reportDate').textContent = dateMap[type];

  generateReportStats();
  generateReportTable();
  showToast('✅ تم إنشاء التقرير');
}

// ===============================
// CERTIFICATES (demo)
// ===============================
function generateCertificates(){
  const grid = document.getElementById('certificatesGrid');
  if (STUDENTS.length === 0){
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-600)">لا توجد طالبات في النظام</div>`;
    document.getElementById('perfectAttendanceCount').textContent = 0;
    document.getElementById('excellentAttendanceCount').textContent = 0;
    document.getElementById('goodAttendanceCount').textContent = 0;
    return;
  }

  const students = STUDENTS.map(s => {
    const totalDays = 20;
    const present = Math.floor(Math.random()*5)+16;
    const percentage = Math.round((present/totalDays)*100);
    return {...s,totalDays,present,percentage,absent:totalDays-present};
  });

  const perfect = students.filter(s=>s.percentage===100);
  const excellent = students.filter(s=>s.percentage>=95 && s.percentage<100);
  const good = students.filter(s=>s.percentage>=90 && s.percentage<95);

  document.getElementById('perfectAttendanceCount').textContent = perfect.length;
  document.getElementById('excellentAttendanceCount').textContent = excellent.length;
  document.getElementById('goodAttendanceCount').textContent = good.length;

  const renderCard = (student, level) => {
    const badge = level === 'perfect' ? '🥇 حضور مثالي' : '🥈 حضور ممتاز';
    const badgeColor = level === 'perfect' ? 'var(--present)' : 'var(--blue)';
    const badgeBg = level === 'perfect' ? 'var(--present-lt)' : 'var(--blue-lt)';
    return `
      <div style="background:var(--gray-50);border-radius:12px;padding:16px;border:2px solid ${level==='perfect'?'var(--present)':'var(--blue)'};cursor:pointer"
           onclick="openCertificate('${student.id}','${level}')">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:44px;height:44px;border-radius:50%;background:${student.color};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;color:#fff">
            ${student.name.split(' ').slice(0,2).map(w=>w[0]).join('')}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:900;color:var(--navy)">${student.name}</div>
            <div style="font-size:10px;color:var(--gray-600)">${student.id}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <span style="font-size:11px;color:var(--gray-600);font-weight:800">نسبة الحضور</span>
          <span style="font-size:18px;font-weight:900;color:${badgeColor}">${student.percentage}%</span>
        </div>
        <div style="padding:8px 12px;background:${badgeBg};color:${badgeColor};border-radius:8px;font-size:11px;font-weight:900;text-align:center;margin-bottom:10px">
          ${badge}
        </div>
        <button style="width:100%;padding:8px;background:linear-gradient(135deg,var(--blue),var(--navy));color:#fff;border:none;border-radius:8px;font-family:'Cairo',sans-serif;font-size:11px;font-weight:900;cursor:pointer"
                onclick="event.stopPropagation();openCertificate('${student.id}','${level}')">
          🖨️ طباعة الشهادة
        </button>
      </div>
    `;
  };

  let html = '';
  perfect.forEach(s => html += renderCard(s,'perfect'));
  excellent.forEach(s => html += renderCard(s,'excellent'));

  if (!html){
    html = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray-600)">لا توجد طالبات مستحقات حالياً</div>`;
  }

  grid.innerHTML = html;
}

window.openCertificate = function(studentId, level){
  const student = STUDENTS.find(s=>s.id===studentId);
  if (!student) return;

  const today = new Date().toLocaleDateString('ar-SA');

  const cert = `
    <div style="width:210mm;min-height:297mm;padding:30mm;background:#fff;position:relative;font-family:'Amiri',serif">
      <div style="position:absolute;inset:15mm;border:4px double ${level==='perfect'?'#FFD700':'var(--blue)'};border-radius:20px"></div>
      <div style="position:absolute;inset:17mm;border:2px solid ${level==='perfect'?'#FFD700':'var(--blue)'};border-radius:18px"></div>

      <div style="position:relative;z-index:1;text-align:center">
        <div style="margin-bottom:20mm">
          <div style="font-size:16px;color:#14b8a6;font-weight:700;margin-bottom:5mm">المملكة العربية السعودية</div>
          <div style="font-size:18px;color:var(--navy);font-weight:800;margin-bottom:5mm">وزارة التعليم</div>
          <div style="font-size:14px;color:var(--gray-600);margin-bottom:3mm">إدارة تعليم جازان</div>
          <div style="font-size:14px;color:var(--navy);font-weight:700">الثانوية الأولى بجازان</div>
        </div>

        <div style="font-size:60px;margin-bottom:10mm">${level==='perfect'?'🥇':'🥈'}</div>

        <div style="font-size:32px;font-weight:900;color:var(--navy);margin-bottom:15mm;text-decoration:underline;text-decoration-color:${level==='perfect'?'#FFD700':'var(--blue)'}">
          شـهـادة شـكـر وتـقـديـر
        </div>

        <div style="font-size:18px;line-height:2.5;color:var(--gray-800);margin-bottom:15mm">
          <p style="margin-bottom:10mm">تُهدي إدارة الثانوية الأولى بجازان</p>
          <p style="margin-bottom:10mm">هذه الشهادة إلى الطالبة المتميزة</p>

          <div style="font-size:28px;font-weight:900;color:${level==='perfect'?'#FFD700':'var(--blue)'};margin:15mm 0;padding:10mm;background:${level==='perfect'?'rgba(255,215,0,.1)':'var(--blue-xs)'};border-radius:12px">
            ${student.name}
          </div>

          <p style="margin-bottom:10mm">وذلك تقديراً لحضورها ${level==='perfect'?'المثالي والمتميز':'الممتاز'}</p>
          <p>والتزامها بالانضباط المدرسي</p>
        </div>

        <div style="display:flex;justify-content:space-between;margin-top:20mm;padding-top:10mm;border-top:2px solid var(--gray-200)">
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:15mm">مديرة المدرسة</div>
            <div style="font-size:16px;font-weight:700;color:var(--navy);border-top:2px solid var(--navy);padding-top:5mm;min-width:50mm">أ. هبه صم</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:5mm">التاريخ</div>
            <div style="font-size:14px;font-weight:700;color:var(--navy)">${today}</div>
            <div style="font-size:12px;color:var(--gray-600);margin-top:5mm">العام الدراسي 1447-1448 هـ</div>
          </div>
          <div style="text-align:center">
            <div style="font-size:12px;color:var(--gray-600);margin-bottom:15mm">وكيلة شؤون الطالبات</div>
            <div style="font-size:16px;font-weight:700;color:var(--navy);border-top:2px solid var(--navy);padding-top:5mm;min-width:50mm">أ. عيشة عواجي</div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('certificateContent').innerHTML = cert;
  document.getElementById('certificateModal').style.display = 'flex';
};

window.closeCertificate = function(){
  document.getElementById('certificateModal').style.display = 'none';
};

// ===============================
// ADMIN DASH
// ===============================
function renderAdminDashboard(){
  const teamColors = {
    'مديرة المدرسة': '#ec4899',
    'وكيلة شؤون الطالبات': '#8b5cf6',
    'معلمة اللغة الإنجليزية': '#1e5ef3',
    'معلمة': '#16a34a'
  };

  const teamMembers = Object.entries(ADMIN_PASSWORDS).map(([password, user]) => ({
    ...user,
    password,
    color: teamColors[user.role] || '#0d9488',
    online: currentUser && currentUser.name === user.name
  }));

  let html = '';
  teamMembers.forEach(member => {
    const initials = member.name.split(' ').slice(0,2).map(w=>w[0]).join('');
    const statusColor = member.online ? 'var(--present)' : 'var(--gray-400)';
    const statusText = member.online ? '● متصل الآن' : '○ غير متصل';
    const statusBg = member.online ? 'var(--present-lt)' : 'var(--gray-100)';

    html += `
      <div style="display:flex;align-items:center;gap:14px;padding:14px;background:var(--gray-50);border-radius:12px;border:2px solid ${member.online ? 'var(--present)' : 'transparent'}">
        <div style="width:48px;height:48px;border-radius:50%;background:${member.color};display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;color:#fff">
          ${initials}
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:900;color:var(--navy);margin-bottom:2px">${member.name}</div>
          <div style="font-size:11px;color:var(--gray-600);font-weight:800">${member.role}</div>
        </div>
        <div style="text-align:left;min-width:140px">
          <div style="display:inline-block;padding:6px 12px;background:${statusBg};border-radius:8px;font-size:11px;font-weight:900;color:${statusColor};margin-bottom:4px">
            ${statusText}
          </div>
          <div style="font-size:10px;color:var(--gray-400)">رقم سري: ${member.password}</div>
        </div>
      </div>
    `;
  });

  document.getElementById('teamMembersList').innerHTML = html;
  document.getElementById('onlineCount').textContent = teamMembers.filter(m=>m.online).length;
}

// ===============================
// Header Stats
// ===============================
function updateHeaderStats(){
  document.getElementById('headerStats').innerHTML = `
    <div class="header-stat"><div class="sv">${STUDENTS.length}</div><div class="sl">الطالبات</div></div>
    <div class="header-stat"><div class="sv">13</div><div class="sl">أسابيع</div></div>
    <div class="header-stat"><div class="sv">29/7</div><div class="sl">بداية الفصل</div></div>
  `;
}

// ===============================
// Bind UI buttons
// ===============================
document.getElementById('registerGrade').addEventListener('change', updateAttendanceTable);
document.getElementById('registerSection').addEventListener('change', updateAttendanceTable);
document.getElementById('refreshRegister').addEventListener('click', updateAttendanceTable);
document.getElementById('exportRegister').addEventListener('click', exportAttendanceExcel);

document.getElementById('addStudentBtn').addEventListener('click', addStudent);
document.getElementById('clearFormBtn').addEventListener('click', clearForm);
document.getElementById('importBulkBtn').addEventListener('click', importBulk);
document.getElementById('clearAllBtn').addEventListener('click', clearAll);
document.getElementById('applySystemBtn').addEventListener('click', applyToSystem);

document.getElementById('dailyBtn').addEventListener('click', () => openReport('daily'));
document.getElementById('weeklyBtn').addEventListener('click', () => openReport('weekly'));
document.getElementById('monthlyBtn').addEventListener('click', () => openReport('monthly'));

document.getElementById('printReportBtn').addEventListener('click', () => window.print());
document.getElementById('pdfReportBtn').addEventListener('click', () => showToast('📄 (تجريبي) PDF لاحقاً'));
document.getElementById('excelReportBtn').addEventListener('click', () => showToast('📊 (تجريبي) Excel لاحقاً'));

document.getElementById('printAllCertsBtn').addEventListener('click', () => showToast('🖨️ (تجريبي) طباعة الكل لاحقاً'));
document.getElementById('refreshCertsBtn').addEventListener('click', generateCertificates);

// ===============================
// INIT
// ===============================
window.addEventListener('load', () => {
  loginModal.style.display = 'flex';
  passwordInput.focus();
  renderStudents();
  updateHeaderStats();
  updateAttendanceTable();

  console.log('✅ النظام جاهز (نسخة ملفات منفصلة)');
});