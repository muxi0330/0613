/* ========== DOM REFS ========== */
const pageHome = document.getElementById('pageHome');
const pageDetail = document.getElementById('pageDetail');
const pageHistory = document.getElementById('pageHistory');

const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const expenseList = document.getElementById('expenseList');
const dayTotal = document.getElementById('dayTotal');
const monthTotal = document.getElementById('monthTotal');
const allTotal = document.getElementById('allTotal');
const recordCount = document.getElementById('recordCount');
const dayIncomeTotal = document.getElementById('dayIncomeTotal');
const monthIncomeTotal = document.getElementById('monthIncomeTotal');
const allIncomeTotal = document.getElementById('allIncomeTotal');
const incomeCount = document.getElementById('incomeCount');
const historyBtn = document.getElementById('historyBtn');
const fabBtn = document.getElementById('fabBtn');

const customizeBtn = document.getElementById('customizeBtn');
const customizeDropdown = document.getElementById('customizeDropdown');
const dropdownDone = document.getElementById('dropdownDone');

const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const tabOcr = document.getElementById('tabOcr');
const tabManual = document.getElementById('tabManual');

const ocrUploadArea = document.getElementById('ocrUploadArea');
const ocrFileInput = document.getElementById('ocrFileInput');
const ocrStatus = document.getElementById('ocrStatus');
const ocrPreview = document.getElementById('ocrPreview');
const ocrLoading = document.getElementById('ocrLoading');
const ocrResultForm = document.getElementById('ocrResultForm');
const ocrAmount = document.getElementById('ocrAmount');
const ocrDate = document.getElementById('ocrDate');
const ocrTime = document.getElementById('ocrTime');
const ocrCategory = document.getElementById('ocrCategory');
const ocrName = document.getElementById('ocrName');
const ocrNote = document.getElementById('ocrNote');
const ocrIconVal = document.getElementById('ocrIconVal');
const ocrIconBtn = document.getElementById('ocrIconBtn');
const ocrSaveBtn = document.getElementById('ocrSaveBtn');

const manualAmount = document.getElementById('manualAmount');
const manualDate = document.getElementById('manualDate');
const manualTime = document.getElementById('manualTime');
const manualCategory = document.getElementById('manualCategory');
const manualName = document.getElementById('manualName');
const manualNote = document.getElementById('manualNote');
const manualIconVal = document.getElementById('manualIconVal');
const manualIconBtn = document.getElementById('manualIconBtn');
const manualSaveBtn = document.getElementById('manualSaveBtn');

const editModalOverlay = document.getElementById('editModalOverlay');
const editModalClose = document.getElementById('editModalClose');
const editId = document.getElementById('editId');
const editAmount = document.getElementById('editAmount');
const editDate = document.getElementById('editDate');
const editTime = document.getElementById('editTime');
const editCategory = document.getElementById('editCategory');
const editName = document.getElementById('editName');
const editNote = document.getElementById('editNote');
const editIconVal = document.getElementById('editIconVal');
const editIconBtn = document.getElementById('editIconBtn');
const editSaveBtn = document.getElementById('editSaveBtn');
const editReceiptPreview = document.getElementById('editReceiptPreview');
const editReceiptImg = document.getElementById('editReceiptImg');

const detailTitle = document.getElementById('detailTitle');
const detailTotal = document.getElementById('detailTotal');
const pieChart = document.getElementById('pieChart');
const pieLegend = document.getElementById('pieLegend');
const barChart = document.getElementById('barChart');
const barChartTitle = document.getElementById('barChartTitle');
const barChartContainer = document.getElementById('barChartContainer');
const detailExpenseList = document.getElementById('detailExpenseList');
const detailBackBtn = document.getElementById('detailBackBtn');
const detailScopeTabs = document.querySelector('.detail-scope-tabs');

const historyBackBtn = document.getElementById('historyBackBtn');
const hFrom = document.getElementById('hFrom');
const hTo = document.getElementById('hTo');
const hCategory = document.getElementById('hCategory');
const hQuickMonth = document.getElementById('hQuickMonth');
const hSearchBtn = document.getElementById('hSearchBtn');
const hSummary = document.getElementById('hSummary');
const hCount = document.getElementById('hCount');
const hTotal = document.getElementById('hTotal');
const historyExpenseList = document.getElementById('historyExpenseList');

const emojiPopover = document.getElementById('emojiPopover');
const emojiGrid = document.getElementById('emojiGrid');
const toast = document.getElementById('toast');

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 5);
manualDate.value = today; manualTime.value = nowTime;
ocrDate.value = today; ocrTime.value = nowTime;

let activeIconTarget = null;
let currentReceiptPath = '';
let currentScope = 'month';
let currentChartType = 'expense';
let currentDetailType = 'expense';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#9ca3af'];

function getCatEmoji(cat) { const m = {'餐饮':'🍽','交通':'🚗','购物':'🛍','娱乐':'🎮','居住':'🏠','医疗':'💊','教育':'📚','其他':'📌'}; return m[cat]||'📌'; }
function getCatIconClass(cat) { const m = {'餐饮':'icon-food','交通':'icon-transport','购物':'icon-shopping','娱乐':'icon-entertainment','居住':'icon-housing','医疗':'icon-medical','教育':'icon-education','其他':'icon-other'}; return m[cat]||'icon-other'; }

/* ========== Page Switching ========== */
function showPage(name) {
    pageHome.style.display = name === 'home' ? '' : 'none';
    pageDetail.style.display = name === 'detail' ? '' : 'none';
    pageHistory.style.display = name === 'history' ? '' : 'none';
    fabBtn.style.display = name === 'home' ? '' : 'none';
}

historyBtn.addEventListener('click', () => { showPage('history'); loadHistoryMonths(); });
detailBackBtn.addEventListener('click', () => showPage('home'));
historyBackBtn.addEventListener('click', () => showPage('home'));

/* ========== Card click -> detail ========== */
document.querySelectorAll('.card.clickable').forEach(card => {
    card.addEventListener('click', () => {
        currentScope = card.dataset.scope;
        currentDetailType = card.dataset.type || 'expense';
        showPage('detail');
        document.querySelectorAll('.scope-tab').forEach(t => t.classList.remove('active'));
        const tab = document.querySelector(`.scope-tab[data-scope="${currentScope}"]`);
        if (tab) tab.classList.add('active');
        loadDetailPage();
    });
});

detailScopeTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.scope-tab');
    if (!tab) return;
    document.querySelectorAll('.scope-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentScope = tab.dataset.scope;
    loadDetailPage();
});

document.querySelector('#chartTypeExpense').addEventListener('click', () => { currentChartType = 'expense'; currentDetailType = 'expense'; loadDetailPage(); });
document.querySelector('#chartTypeIncome').addEventListener('click', () => { currentChartType = 'income'; currentDetailType = 'income'; loadDetailPage(); });

/* ========== Card Customization ========== */
const CK = 'expense_cards';
function gcs() { try { const s = localStorage.getItem(CK); if (s) return JSON.parse(s); } catch (e) {} return {day:true,month:true,all:true,count:true,day_income:true,month_income:true,all_income:true,income_count:true}; }
function scs(s) { localStorage.setItem(CK, JSON.stringify(s)); }
function acs() {
    const s = gcs();
    document.querySelectorAll('.summary-cards .card').forEach(c => c.classList.toggle('hidden', s[c.dataset.card] === false));
    document.querySelectorAll('.customize-dropdown .dropdown-item input').forEach(cb => { cb.checked = s[cb.dataset.card] !== false; });
    adjGrid();
}
function adjGrid() {
    const v = document.querySelectorAll('.summary-cards .card:not(.hidden)').length;
    const g = document.getElementById('summaryCards');
    if (v <= 2) g.style.gridTemplateColumns = `repeat(${v}, 1fr)`;
    else if (v === 3) g.style.gridTemplateColumns = '1fr 1fr 1fr';
    else g.style.gridTemplateColumns = '1fr 1fr 1fr 1fr';
}
customizeBtn.addEventListener('click', (e) => { e.stopPropagation(); customizeDropdown.classList.toggle('open'); });
dropdownDone.addEventListener('click', () => { const s = {}; document.querySelectorAll('.customize-dropdown .dropdown-item input').forEach(cb => { s[cb.dataset.card] = cb.checked; }); scs(s); acs(); customizeDropdown.classList.remove('open'); });
document.addEventListener('click', (e) => { if (!customizeDropdown.contains(e.target) && e.target !== customizeBtn) customizeDropdown.classList.remove('open'); });
acs();

/* ========== Emoji ========== */
const EMOJIS = ['🍽','🍕','🍔','🍟','🍜','🍣','🍰','☕','🍺','🥤','🚗','🚌','🚇','✈','🚕','⛽','🚲','🏍','🛍','👕','👟','💄','📱','💻','🎁','🛒','🎮','🎬','🎤','🎪','🎢','🎯','⚽','🏀','🏠','💡','💧','🔥','🛏','🛠','🏡','💊','🏥','💉','🩺','🦷','🩻','📚','✏','🎓','📝','📖','💰','💳','📌','📋','💼','🎵','🌟','❤','✅','🎉'];
function initEmoji() {
    emojiGrid.innerHTML = '';
    EMOJIS.forEach(e => {
        const b = document.createElement('button'); b.textContent = e;
        b.addEventListener('click', () => { if (activeIconTarget) activeIconTarget.textContent = e; emojiPopover.classList.remove('open'); activeIconTarget = null; });
        emojiGrid.appendChild(b);
    });
}
initEmoji();
function showEmojiPicker(btn, target) { activeIconTarget = target; const r = btn.getBoundingClientRect(); emojiPopover.style.top = (r.bottom + 8) + 'px'; emojiPopover.style.left = Math.min(r.left, window.innerWidth - 340) + 'px'; emojiPopover.classList.add('open'); }
document.addEventListener('click', (e) => { if (!emojiPopover.contains(e.target) && !e.target.closest('.icon-pick-btn')) emojiPopover.classList.remove('open'); });
ocrIconBtn.addEventListener('click', (e) => { e.preventDefault(); showEmojiPicker(ocrIconBtn, ocrIconVal); });
manualIconBtn.addEventListener('click', (e) => { e.preventDefault(); showEmojiPicker(manualIconBtn, manualIconVal); });
editIconBtn.addEventListener('click', (e) => { e.preventDefault(); showEmojiPicker(editIconBtn, editIconVal); });

/* ========== Add Modal ========== */
fabBtn.addEventListener('click', () => { currentReceiptPath = ''; modalOverlay.classList.add('active'); resetOcrTab(); resetManualForm(); switchModalTab('ocr'); });
modalClose.addEventListener('click', () => modalOverlay.classList.remove('active'));
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });
function switchModalTab(tabName) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
    if (tabName === 'ocr') { document.querySelector('.modal-tab[data-tab="ocr"]').classList.add('active'); tabOcr.classList.add('active'); }
    else { document.querySelector('.modal-tab[data-tab="manual"]').classList.add('active'); tabManual.classList.add('active'); }
}
/* ========== Type Toggle Helpers ========== */
function setOcrType(t) {
    document.querySelectorAll('#tabOcr .type-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`#tabOcr .type-btn[data-type="${t}"]`).classList.add('active');
}
function getOcrType() { return document.querySelector('#tabOcr .type-btn.active').dataset.type; }
function getManualType() { return document.querySelector('#tabManual .type-btn.active').dataset.type; }
function setEditType(t) {
    document.querySelectorAll('#editModal .type-btn').forEach(b => b.classList.remove('active'));
    const el = document.querySelector(`#editModal .type-btn[data-type="${t}"]`);
    if (el) el.classList.add('active');
}
function getEditType() { return document.querySelector('#editModal .type-btn.active').dataset.type; }

document.querySelectorAll('.type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const parent = btn.parentElement;
        parent.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.modal-tab').forEach(tab => { tab.addEventListener('click', () => switchModalTab(tab.dataset.tab)); });

ocrUploadArea.addEventListener('click', () => ocrFileInput.click());
ocrUploadArea.addEventListener('dragover', (e) => { e.preventDefault(); ocrUploadArea.style.borderColor = '#6366f1'; ocrUploadArea.style.background = '#f0f3ff'; });
ocrUploadArea.addEventListener('dragleave', () => { ocrUploadArea.style.borderColor = '#d1d5db'; ocrUploadArea.style.background = '#fafbfc'; });
ocrUploadArea.addEventListener('drop', (e) => { e.preventDefault(); ocrUploadArea.style.borderColor = '#d1d5db'; ocrUploadArea.style.background = '#fafbfc'; if (e.dataTransfer.files.length > 0) handleOcrFile(e.dataTransfer.files[0]); });
ocrFileInput.addEventListener('change', () => { if (ocrFileInput.files.length > 0) handleOcrFile(ocrFileInput.files[0]); });

function handleOcrFile(file) {
    ocrUploadArea.style.display = 'none'; ocrStatus.style.display = 'flex'; ocrLoading.style.display = 'block'; ocrResultForm.style.display = 'none';
    const reader = new FileReader();
    reader.onload = (e) => { ocrPreview.innerHTML = `<img src="${e.target.result}" alt="预览">`; };
    reader.readAsDataURL(file);
    const formData = new FormData(); formData.append('image', file);
    fetch('/api/ocr/scan', { method: 'POST', body: formData }).then(r => r.json()).then(data => {
        ocrLoading.style.display = 'none';
        if (data.success && data.extracted) { currentReceiptPath = data.receipt_path || ''; fillOcrForm(data.extracted); ocrResultForm.style.display = 'block'; }
        else { ocrStatus.style.display = 'none'; ocrUploadArea.style.display = 'block'; showToast(data.error || '识别失败'); }
    }).catch(err => { ocrLoading.style.display = 'none'; ocrStatus.style.display = 'none'; ocrUploadArea.style.display = 'block'; showToast('识别失败'); });
}

function fillOcrForm(extracted) {
    ocrAmount.value = extracted.amount || ''; ocrDate.value = extracted.date || today; ocrTime.value = nowTime;
    ocrCategory.value = extracted.category || '其他'; ocrName.value = extracted.name || '';
    ocrNote.value = ''; ocrIconVal.textContent = getCatEmoji(extracted.category || '其他');
    setOcrType(extracted.trans_type || 'expense');

    const confEl = document.getElementById('ocrConfidence');
    confEl.style.display = 'block';
    confEl.className = 'confidence-hint confidence-low';
    confEl.textContent = '⚠ 自动识别默认为支出，请手动确认收支类型';
}
function resetOcrTab() {
    ocrUploadArea.style.display = 'block'; ocrStatus.style.display = 'none'; ocrResultForm.style.display = 'none';
    ocrAmount.value = ''; ocrDate.value = today; ocrTime.value = nowTime;
    ocrCategory.value = '其他'; ocrName.value = ''; ocrNote.value = ''; ocrIconVal.textContent = '📌'; currentReceiptPath = '';
}

ocrSaveBtn.addEventListener('click', () => {
    const a = parseFloat(ocrAmount.value); if (!a || a <= 0) { showToast('请输入有效金额'); return; }
    saveExpense({ amount: a, date: (ocrDate.value || today) + ' ' + (ocrTime.value || '00:00'), category: ocrCategory.value,
        name: ocrName.value.trim(), description: ocrNote.value.trim(), icon: ocrIconVal.textContent, image_path: currentReceiptPath,
        trans_type: getOcrType() });
});

function resetManualForm() { manualAmount.value = ''; manualDate.value = today; manualTime.value = nowTime; manualCategory.value = '其他'; manualName.value = ''; manualNote.value = ''; manualIconVal.textContent = '📌'; }
manualSaveBtn.addEventListener('click', () => {
    const a = parseFloat(manualAmount.value); if (!a || a <= 0) { showToast('请输入有效金额'); return; }
    saveExpense({ amount: a, date: (manualDate.value || today) + ' ' + (manualTime.value || '00:00'), category: manualCategory.value,
        name: manualName.value.trim(), description: manualNote.value.trim(), icon: manualIconVal.textContent, image_path: '',
        trans_type: getManualType() });
});

function saveExpense(data) {
    fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(r => r.json()).then(res => { if (res.success) { showToast('记账成功 ✓'); modalOverlay.classList.remove('active'); loadHomeData(); } else showToast(res.error || '记账失败'); }).catch(() => showToast('网络错误'));
}

/* ========== Edit Modal ========== */
editModalClose.addEventListener('click', () => editModalOverlay.classList.remove('active'));
editModalOverlay.addEventListener('click', (e) => { if (e.target === editModalOverlay) editModalOverlay.classList.remove('active'); });
function openEditModal(exp) {
    editId.value = exp.id; editAmount.value = exp.amount; editCategory.value = exp.category;
    editName.value = exp.name || ''; editNote.value = exp.description || ''; editIconVal.textContent = exp.icon || getCatEmoji(exp.category);
    setEditType(exp.trans_type || 'expense');
    if (exp.date && exp.date.includes(' ')) { const p = exp.date.split(' '); editDate.value = p[0]; editTime.value = p[1].slice(0, 5); }
    else { editDate.value = exp.date || today; editTime.value = '00:00'; }
    if (exp.image_path) { editReceiptPreview.style.display = 'block'; editReceiptImg.src = '/receipts/' + exp.image_path; }
    else { editReceiptPreview.style.display = 'none'; }
    editModalOverlay.classList.add('active');
}
editSaveBtn.addEventListener('click', () => {
    const id = editId.value; const a = parseFloat(editAmount.value); if (!a || a <= 0) { showToast('请输入有效金额'); return; }
    const d = (editDate.value || today) + ' ' + (editTime.value || '00:00');
    fetch(`/api/expenses/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: a, date: d, category: editCategory.value, name: editName.value.trim(), description: editNote.value.trim(), icon: editIconVal.textContent, trans_type: getEditType() }) })
        .then(r => r.json()).then(res => { if (res.success) { showToast('修改成功 ✓'); editModalOverlay.classList.remove('active'); loadHomeData(); } else showToast(res.error || '修改失败'); }).catch(() => showToast('网络错误'));
});

/* ========== Home Data ========== */
function loadHomeData() {
    const qs = []; if (categoryFilter.value) qs.push('category=' + categoryFilter.value);
    if (searchInput.value.trim()) qs.push('search=' + encodeURIComponent(searchInput.value.trim()));
    const q = qs.length ? '?' + qs.join('&') : '';
    Promise.all([fetch('/api/expenses' + q).then(r => r.json()), fetch('/api/summary').then(r => r.json())])
        .then(([e, s]) => { if (e.success) renderHomeExpenses(e.expenses); if (s.success) renderHomeSummary(s); }).catch(() => showToast('加载失败'));
}
function renderHomeSummary(d) {
    dayTotal.textContent = '¥' + d.day_total.toFixed(2);
    monthTotal.textContent = '¥' + d.month_total.toFixed(2);
    allTotal.textContent = '¥' + d.total.toFixed(2);
    recordCount.textContent = d.count + ' 笔';
    dayIncomeTotal.textContent = '¥' + (d.day_income || 0).toFixed(2);
    monthIncomeTotal.textContent = '¥' + (d.month_income || 0).toFixed(2);
    allIncomeTotal.textContent = '¥' + (d.total_income || 0).toFixed(2);
    incomeCount.textContent = (d.income_count || 0) + ' 笔';
}
function renderHomeExpenses(expenses) {
    expenseList.innerHTML = '';
    if (!expenses.length) { expenseList.innerHTML = `<div class="empty-state"><p>${categoryFilter.value || searchInput.value.trim() ? '没有匹配的记录' : '还没有记账记录'}</p><p class="empty-hint">${categoryFilter.value || searchInput.value.trim() ? '换个筛选条件' : '点击右下角按钮添加第一笔账单'}</p></div>`; return; }
    const expensesData = {};
    expenses.forEach(exp => { expensesData[exp.id] = exp; renderExpenseItem(expenseList, exp, expensesData); });
    bindActions(expenseList, expensesData);
}
function renderExpenseItem(container, exp, ed, isDetail) {
    const icon = exp.icon || getCatEmoji(exp.category); const cls = getCatIconClass(exp.category);
    const hasImg = !!exp.image_path; const displayName = exp.name || (exp.description || '未命名');
    const dt = formatDateTime(exp.date);
    const wrapper = document.createElement('div'); wrapper.className = 'expense-wrapper';
    const item = document.createElement('div'); item.className = 'expense-item'; item.dataset.id = exp.id;
    const isIncome = exp.trans_type === 'income';
    item.innerHTML = `<div class="expense-icon ${cls}">${esc(icon)}</div><div class="expense-info"><div class="expense-name">${esc(displayName)}</div><div class="expense-meta"><span>${esc(dt)}</span><span class="expense-cat">${exp.category}</span>${hasImg ? '<span class="expense-cat" style="background:#dbeafe;color:#2563eb;">📷</span>' : ''}${isIncome ? '<span class="expense-cat" style="background:#d1fae5;color:#059669;">收入</span>' : ''}</div></div><span class="expense-amount${isIncome ? ' income' : ''}">${isIncome ? '+¥' : '-¥'}${exp.amount.toFixed(2)}</span><button class="expense-delete" data-id="${exp.id}" title="删除"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button><div class="expense-chevron"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg></div>`;
    const detail = document.createElement('div'); detail.className = 'expense-detail';
    detail.innerHTML = `<div class="expense-detail-inner"><div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:.82rem;color:#9ca3af;">名称: <b>${esc(exp.name||'未命名')}</b></span><span style="font-size:.82rem;color:#9ca3af;">备注: <b>${esc(exp.description||'无')}</b></span></div>${hasImg ? `<img class="detail-img" src="/receipts/${exp.image_path}" alt="收据" onclick="this.requestFullscreen?this.requestFullscreen():window.open(this.src)">` : ''}<div class="detail-actions"><button class="btn btn-secondary btn-sm edit-btn" data-id="${exp.id}">✏️ 编辑</button><button class="btn btn-secondary btn-sm delete-btn" data-id="${exp.id}" style="color:#ef4444;">🗑 删除</button></div></div>`;
    wrapper.appendChild(item); wrapper.appendChild(detail); container.appendChild(wrapper);
    item.addEventListener('click', (e) => { if (e.target.closest('.expense-delete') || e.target.closest('.btn-sm')) return; const pe = container.querySelector('.expense-item.expanded'); if (pe && pe !== item) { pe.classList.remove('expanded'); const pd = pe.nextElementSibling; if (pd) pd.style.display = 'none'; } item.classList.toggle('expanded'); detail.style.display = item.classList.contains('expanded') ? 'block' : 'none'; });
}
function bindActions(list, ed) {
    list.querySelectorAll('.edit-btn').forEach(b => { b.addEventListener('click', (e) => { e.stopPropagation(); const exp = ed[parseInt(b.dataset.id)]; if (exp) openEditModal(exp); }); });
    list.querySelectorAll('.expense-delete, .delete-btn').forEach(b => { b.addEventListener('click', (e) => { e.stopPropagation(); const id = b.dataset.id; if (confirm('确定要删除这条记录吗？')) { fetch(`/api/expenses/${id}`, { method: 'DELETE' }).then(r => r.json()).then(res => { if (res.success) { showToast('已删除'); loadHomeData(); } }); } }); });
}

/* ========== Detail Page ========== */
function loadDetailPage() {
    currentChartType = currentDetailType;
    document.querySelectorAll('.detail-toggle .type-btn').forEach(b => b.classList.remove('active'));
    const chartBtn = document.querySelector(`.detail-toggle .type-btn[data-chart="${currentChartType}"]`);
    if (chartBtn) chartBtn.classList.add('active');

    const typeLabel = currentChartType === 'income' ? '收入' : '支出';
    document.querySelectorAll('.scope-tab').forEach(t => { t.textContent = t.dataset.scope === 'day' ? '本日' : t.dataset.scope === 'month' ? '本月' : '全部'; });

    fetch('/api/chart?scope=' + currentScope + '&type=' + currentChartType).then(r => r.json()).then(d => {
        if (!d.success) return;
        detailTitle.textContent = typeLabel + '详情';
        detailTotal.textContent = '¥' + d.total.toFixed(2);
        drawPieChart(d.cat_pie || []);
        if (currentScope === 'month' && d.daily) {
            barChartContainer.style.display = ''; barChartTitle.textContent = '每日' + typeLabel + '趋势';
            drawBarChart(d.daily, 'date', 'amount');
        } else if (currentScope === 'all' && d.monthly) {
            barChartContainer.style.display = ''; barChartTitle.textContent = '每月' + typeLabel + '趋势';
            drawBarChart(d.monthly, 'date', 'amount');
        } else { barChartContainer.style.display = 'none'; }
        renderDetailExpenses(d.cat_pie || [], d.total);
    });
}
function renderDetailExpenses(catPie, total) {
    detailExpenseList.innerHTML = '';
    const emptyLabel = currentChartType === 'income' ? '暂无收入数据' : '暂无支出数据';
    if (!catPie.length) { detailExpenseList.innerHTML = '<div class="empty-state"><p>' + emptyLabel + '</p></div>'; return; }
    catPie.forEach(c => {
        const pct = total > 0 ? (c.total / total * 100).toFixed(1) : '0.0';
        const item = document.createElement('div'); item.className = 'expense-item';
        item.innerHTML = `<div class="expense-icon ${getCatIconClass(c.category)}">${getCatEmoji(c.category)}</div><div class="expense-info"><div class="expense-name">${esc(c.category)}</div><div class="expense-meta"><span>占比 ${pct}%</span></div></div><span class="expense-amount">¥${c.total.toFixed(2)}</span>`;
        detailExpenseList.appendChild(item);
    });
}

/* ========== Charts ========== */
function drawPieChart(data) {
    const ctx = pieChart.getContext('2d'); const w = 220, h = 220; pieChart.width = w; pieChart.height = h;
    ctx.clearRect(0, 0, w, h);
    const total = data.reduce((s, d) => s + d.total, 0);
    if (total === 0) { ctx.fillStyle = '#e5e7eb'; ctx.beginPath(); ctx.arc(w/2, h/2, 70, 0, Math.PI*2); ctx.fill(); pieLegend.innerHTML = '<span style="color:#9ca3af">无数据</span>'; return; }
    let start = -Math.PI / 2; pieLegend.innerHTML = '';
    data.forEach((d, i) => {
        const slice = (d.total / total) * Math.PI * 2;
        ctx.fillStyle = COLORS[i % COLORS.length]; ctx.beginPath(); ctx.moveTo(w/2, h/2); ctx.arc(w/2, h/2, 70, start, start + slice); ctx.closePath(); ctx.fill();
        start += slice;
        const pct = (d.total / total * 100).toFixed(1);
        pieLegend.innerHTML += `<div class="legend-item"><div class="legend-dot" style="background:${COLORS[i % COLORS.length]}"></div><span class="legend-name">${d.category}</span><span class="legend-pct">${pct}%</span></div>`;
    });
}
function drawBarChart(data, dateKey, amountKey) {
    const ctx = barChart.getContext('2d'); const w = ctx.canvas.parentElement.clientWidth - 32;
    const h = 200; barChart.width = Math.max(w, 300); barChart.height = h;
    ctx.clearRect(0, 0, barChart.width, h);
    if (!data.length) return;
    const pad = { top: 20, right: 10, bottom: 30, left: 8 };
    const chartW = barChart.width - pad.left - pad.right;
    const chartH = h - pad.top - pad.bottom;
    const maxVal = Math.max(...data.map(d => d[amountKey]), 1);
    const barGap = 4; const barW = Math.max(4, (chartW / data.length) - barGap);
    data.forEach((d, i) => {
        const x = pad.left + i * (barW + barGap);
        const bh = (d[amountKey] / maxVal) * chartH;
        const y = pad.top + chartH - bh;
        const gradient = ctx.createLinearGradient(x, y, x, pad.top + chartH);
        gradient.addColorStop(0, '#6366f1'); gradient.addColorStop(1, '#a5b4fc');
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]); ctx.fill();
        if (data.length <= 40) {
            ctx.fillStyle = '#9ca3af'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(d[dateKey], x + barW / 2, pad.top + chartH + 14);
        }
        if (d[amountKey] > 0 && data.length <= 20) {
            ctx.fillStyle = '#6b7280'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText(d[amountKey].toFixed(0), x + barW / 2, y - 4);
        }
    });
    if (maxVal > 0) {
        ctx.strokeStyle = '#f3f4f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        for (let i = 0; i <= 4; i++) { const ly = pad.top + chartH - (i/4) * chartH; ctx.beginPath(); ctx.moveTo(pad.left, ly); ctx.lineTo(pad.left + chartW, ly); ctx.stroke(); }
        ctx.setLineDash([]);
    }
}

/* ========== History Page ========== */
function loadHistoryMonths() {
    fetch('/api/months').then(r => r.json()).then(d => {
        hQuickMonth.innerHTML = '<option value="">自定义</option>';
        (d.months || []).forEach(m => { hQuickMonth.innerHTML += `<option value="${m}">${m}</option>`; });
    });
}
hQuickMonth.addEventListener('change', () => {
    if (hQuickMonth.value) { const m = hQuickMonth.value; hFrom.value = m + '-01'; const d = new Date(parseInt(m.slice(0,4)), parseInt(m.slice(5,7)), 0); hTo.value = m + '-' + String(d.getDate()).padStart(2,'0'); }
    else { hFrom.value = ''; hTo.value = ''; }
});
hSearchBtn.addEventListener('click', () => {
    const qs = []; if (hFrom.value) qs.push('from=' + hFrom.value); if (hTo.value) qs.push('to=' + hTo.value); if (hCategory.value) qs.push('category=' + hCategory.value);
    if (!hFrom.value && !hTo.value) { showToast('请选择日期范围'); return; }
    fetch('/api/expenses?' + qs.join('&')).then(r => r.json()).then(d => {
        if (!d.success) return;
        const total = d.expenses.reduce((s, e) => s + e.amount, 0);
        hSummary.style.display = ''; hCount.textContent = d.expenses.length; hTotal.textContent = '¥' + total.toFixed(2);
        historyExpenseList.innerHTML = '';
        if (!d.expenses.length) { historyExpenseList.innerHTML = '<div class="empty-state"><p>该时间段没有记录</p></div>'; return; }
        const ed = {};
        d.expenses.forEach(exp => { ed[exp.id] = exp; renderExpenseItem(historyExpenseList, exp, ed, true); });
        bindActions(historyExpenseList, ed);
    });
});

/* ========== Filters ========== */
categoryFilter.addEventListener('change', loadHomeData);
let st; searchInput.addEventListener('input', () => { clearTimeout(st); st = setTimeout(loadHomeData, 300); });

/* ========== Helpers ========== */
function formatDateTime(ds) { if (!ds) return ''; const p = ds.split(' '); return p.length === 2 ? p[0] + ' ' + p[1].slice(0, 5) : ds; }
function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function showToast(msg) { toast.textContent = msg; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 2000); }

loadHomeData();
