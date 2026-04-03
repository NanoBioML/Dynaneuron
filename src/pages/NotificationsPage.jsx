import React, { useState, useEffect } from 'react';
import { getNotifications, addNotification, sendNotification, saveNotifications, NOTIF_TYPE_ICONS, formatDate } from '../data/store';

const TYPE_OPTIONS = [
  { value: 'emergency', label: '🚨 Экстренное' },
  { value: 'flood',     label: '💧 Паводок' },
  { value: 'road',      label: '🚧 Дорога' },
  { value: 'info',      label: 'ℹ️ Информация' },
  { value: 'event',     label: '📢 Мероприятие' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Критический', color: '#DC2626' },
  { value: 'high',     label: 'Высокий',     color: '#D97706' },
  { value: 'medium',   label: 'Средний',     color: '#2563EB' },
  { value: 'low',      label: 'Низкий',      color: '#16A34A' },
];

const STATUS_COLORS = {
  active: { bg: '#FEF2F2', color: '#DC2626', label: 'Активно' },
  sent:   { bg: '#F0FDF4', color: '#16A34A', label: 'Отправлено' },
  draft:  { bg: '#F3F4F6', color: '#6B7280', label: 'Черновик' },
};

function CreateModal({ onClose, onCreate }) {
  const [form, setForm] = useState({ type: 'info', priority: 'medium', title: '', body: '', target: 'all' });
  const [sending, setSending] = useState(false);

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }

  function handleSubmit(sendNow) {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true);
    setTimeout(() => {
      onCreate({ ...form, status: sendNow ? 'active' : 'draft' });
      setSending(false);
      onClose();
    }, 600);
  }

  // Live preview of what residents will see
  const typeIcon = NOTIF_TYPE_ICONS[form.type] || 'ℹ️';

  return (
    <div style={m.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={m.modal}>
        <div style={m.modalHeader}>
          <span style={m.modalTitle}>Новое оповещение</span>
          <button onClick={onClose} style={m.closeBtn}>✕</button>
        </div>

        <div style={m.twoCol}>
          {/* Form */}
          <div style={m.form}>
            <div style={m.field}>
              <label style={m.label}>Тип</label>
              <div style={m.typeGrid}>
                {TYPE_OPTIONS.map(t => (
                  <button key={t.value} onClick={() => set('type', t.value)} style={{ ...m.typeBtn, background: form.type === t.value ? '#EFF6FF' : '#F9FAFB', border: form.type === t.value ? '1.5px solid #2563EB' : '1.5px solid #E5E7EB', color: form.type === t.value ? '#2563EB' : '#374151', fontWeight: form.type === t.value ? 600 : 400 }}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={m.field}>
              <label style={m.label}>Приоритет</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITY_OPTIONS.map(p => (
                  <button key={p.value} onClick={() => set('priority', p.value)} style={{ ...m.priBtn, background: form.priority === p.value ? p.color : '#F3F4F6', color: form.priority === p.value ? '#fff' : '#374151' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={m.field}>
              <label style={m.label}>Заголовок *</label>
              <input style={m.input} placeholder="Например: Отключение воды на ул. Момышулы" value={form.title} onChange={e => set('title', e.target.value)} maxLength={80} />
              <div style={m.charCount}>{form.title.length}/80</div>
            </div>

            <div style={m.field}>
              <label style={m.label}>Текст сообщения *</label>
              <textarea style={m.textarea} placeholder="Подробное описание для жителей..." value={form.body} onChange={e => set('body', e.target.value)} rows={4} maxLength={300} />
              <div style={m.charCount}>{form.body.length}/300</div>
            </div>

            <div style={m.field}>
              <label style={m.label}>Кому отправить</label>
              <select style={m.select} value={form.target} onChange={e => set('target', e.target.value)}>
                <option value="all">Всем жителям района</option>
                <option value="zone_momyshy">Зона ул. Момышулы</option>
                <option value="zone_baitarek">Зона мкр. Байтерек</option>
                <option value="zone_duman">Зона мкр. Думан</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          <div style={m.previewWrap}>
            <div style={m.previewLabel}>Предпросмотр уведомления</div>
            <div style={m.phoneFrame}>
              <div style={m.phoneBg}>
                <div style={m.notifPreview}>
                  <div style={m.previewRow}>
                    <span style={{ fontSize: 22 }}>{typeIcon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={m.previewTitle}>{form.title || 'Заголовок уведомления'}</div>
                      <div style={m.previewBody}>{form.body || 'Текст сообщения появится здесь...'}</div>
                    </div>
                  </div>
                  <div style={m.previewMeta}>
                    Alatau Smart City · только что
                  </div>
                </div>
              </div>
            </div>
            <div style={m.previewHint}>Так увидят жители в приложении</div>
          </div>
        </div>

        <div style={m.footer}>
          <button onClick={onClose} style={m.cancelBtn}>Отмена</button>
          <button onClick={() => handleSubmit(false)} disabled={!form.title || !form.body} style={{ ...m.draftBtn, opacity: form.title && form.body ? 1 : 0.4 }}>
            Сохранить черновик
          </button>
          <button onClick={() => handleSubmit(true)} disabled={!form.title || !form.body || sending} style={{ ...m.sendBtn, opacity: form.title && form.body ? 1 : 0.4 }}>
            {sending ? '📤 Отправка...' : '📤 Отправить сейчас'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  useEffect(() => { setNotifs(getNotifications()); }, []);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  function handleCreate(notif) {
    const updated = addNotification(notif);
    setNotifs(updated);
    showToast(notif.status === 'active' ? '✅ Оповещение отправлено жителям!' : '💾 Черновик сохранён');
  }

  function handleSend(id) {
    const updated = sendNotification(id);
    setNotifs(updated);
    showToast('✅ Оповещение отправлено!');
  }

  function handleDelete(id) {
    const updated = notifs.filter(n => n.id !== id);
    saveNotifications(updated);
    setNotifs(updated);
    showToast('Удалено');
  }

  const filtered = notifs.filter(n => filter === 'all' || n.status === filter);

  return (
    <div style={s.page}>
      {toast && <div style={s.toast}>{toast}</div>}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}

      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Оповещения жителей</h1>
          <div style={s.pageSubtitle}>{notifs.filter(n => n.status === 'active').length} активных · {notifs.filter(n => n.status === 'draft').length} черновиков</div>
        </div>
        <button onClick={() => setShowCreate(true)} style={s.createBtn}>
          + Создать оповещение
        </button>
      </div>

      {/* Active banner */}
      {notifs.filter(n => n.status === 'active').length > 0 && (
        <div style={s.activeBanner}>
          <span style={{ fontSize: 16 }}>📡</span>
          <span>Активных оповещений: <strong>{notifs.filter(n => n.status === 'active').length}</strong> — сейчас отображаются в приложении у всех жителей</span>
        </div>
      )}

      {/* Tabs */}
      <div style={s.tabs}>
        {[['all','Все'], ['active','Активные'], ['sent','Отправленные'], ['draft','Черновики']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} style={{ ...s.tab, background: filter === val ? '#2563EB' : 'transparent', color: filter === val ? '#fff' : '#374151', borderBottom: filter === val ? 'none' : '2px solid transparent' }}>
            {label}
            <span style={s.tabCount}>{val === 'all' ? notifs.length : notifs.filter(n => n.status === val).length}</span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div style={s.cardGrid}>
        {filtered.length === 0 && (
          <div style={s.empty}>Нет оповещений в этой категории</div>
        )}
        {filtered.map(n => {
          const stCfg = STATUS_COLORS[n.status] || STATUS_COLORS.draft;
          return (
            <div key={n.id} style={s.card}>
              <div style={s.cardTop}>
                <span style={{ fontSize: 26 }}>{NOTIF_TYPE_ICONS[n.type] || 'ℹ️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={s.cardTitle}>{n.title}</div>
                  <div style={s.cardBody}>{n.body}</div>
                </div>
                <span style={{ ...s.statusBadge, background: stCfg.bg, color: stCfg.color }}>{stCfg.label}</span>
              </div>
              <div style={s.cardMeta}>
                <span>🕐 {formatDate(n.date)}</span>
                <span>👥 {n.target === 'all' ? 'Все жители' : n.target}</span>
              </div>
              <div style={s.cardActions}>
                {n.status === 'draft' && (
                  <button onClick={() => handleSend(n.id)} style={s.sendBtn}>📤 Отправить</button>
                )}
                {n.status === 'active' && (
                  <button onClick={() => { const u = notifs.map(x => x.id === n.id ? {...x, status:'sent'} : x); saveNotifications(u); setNotifs(u); showToast('Оповещение остановлено'); }} style={s.stopBtn}>⏹ Остановить</button>
                )}
                <button onClick={() => handleDelete(n.id)} style={s.deleteBtn}>🗑 Удалить</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', animation: 'fadeIn .25s ease', position: 'relative' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  createBtn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: 10, padding: '11px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  activeBanner: { display: 'flex', alignItems: 'center', gap: 10, background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#1D4ED8' },
  tabs: { display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 10, padding: 4, border: '1px solid #E5E7EB', width: 'fit-content' },
  tab: { padding: '8px 16px', borderRadius: 7, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all .15s' },
  tabCount: { background: 'rgba(0,0,0,0.1)', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 },
  cardGrid: { display: 'flex', flexDirection: 'column', gap: 12 },
  card: { background: '#fff', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardTop: { display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 4 },
  cardBody: { fontSize: 13, color: '#6B7280', lineHeight: 1.5 },
  statusBadge: { padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, flexShrink: 0 },
  cardMeta: { display: 'flex', gap: 20, fontSize: 12, color: '#9CA3AF', marginBottom: 12 },
  cardActions: { display: 'flex', gap: 8 },
  sendBtn: { background: '#EFF6FF', color: '#2563EB', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  stopBtn: { background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  deleteBtn: { background: '#F9FAFB', color: '#6B7280', border: 'none', borderRadius: 7, padding: '7px 12px', fontSize: 13, cursor: 'pointer' },
  empty: { padding: '40px', textAlign: 'center', color: '#9CA3AF', background: '#fff', borderRadius: 12 },
  toast: { position: 'fixed', bottom: 24, right: 24, background: '#111827', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 500, zIndex: 9999, animation: 'slideIn .3s ease' },
};

const m = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  modal: { background: '#fff', borderRadius: 16, width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'fadeIn .2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #F3F4F6' },
  modalTitle: { fontSize: 17, fontWeight: 700 },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', padding: '4px 8px' },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, padding: '20px 24px', flex: 1, overflowY: 'auto' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  field: {},
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  typeBtn: { padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 13, textAlign: 'left' },
  priBtn: { flex: 1, padding: '7px 8px', borderRadius: 7, border: 'none', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' },
  input: { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none' },
  textarea: { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 },
  select: { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', cursor: 'pointer' },
  charCount: { fontSize: 11, color: '#9CA3AF', textAlign: 'right', marginTop: 3 },
  previewWrap: { display: 'flex', flexDirection: 'column', gap: 12 },
  previewLabel: { fontSize: 12, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.4 },
  phoneFrame: { background: '#1a1a1a', borderRadius: 24, padding: 12 },
  phoneBg: { background: '#f0f0f5', borderRadius: 14, padding: 12 },
  notifPreview: { background: 'rgba(255,255,255,0.9)', borderRadius: 12, padding: '12px 14px', backdropFilter: 'blur(8px)' },
  previewRow: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 6 },
  previewTitle: { fontSize: 13, fontWeight: 700, color: '#000', marginBottom: 3 },
  previewBody: { fontSize: 12, color: '#444', lineHeight: 1.4 },
  previewMeta: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  previewHint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
  footer: { display: 'flex', gap: 10, padding: '14px 24px', borderTop: '1px solid #F3F4F6', justifyContent: 'flex-end' },
  cancelBtn: { background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 500, cursor: 'pointer' },
  draftBtn: { background: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  sendBtn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 700, cursor: 'pointer' },
};
