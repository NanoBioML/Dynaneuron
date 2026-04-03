import React, { useState, useEffect } from 'react';
import { getStats, getComplaints, getNotifications, STATUS_LABELS, PRIORITY_LABELS, timeAgo, NOTIF_TYPE_ICONS } from '../data/store';

function StatCard({ icon, label, value, color, sub, onClick }) {
  return (
    <div onClick={onClick} style={{ ...s.statCard, cursor: onClick ? 'pointer' : 'default', borderLeft: `4px solid ${color}` }}>
      <div style={{ ...s.statIcon, background: color + '18' }}>{icon}</div>
      <div style={s.statBody}>
        <div style={s.statValue}>{value}</div>
        <div style={s.statLabel}>{label}</div>
        {sub && <div style={s.statSub}>{sub}</div>}
      </div>
    </div>
  );
}

function Badge({ status }) {
  const cfg = STATUS_LABELS[status] || STATUS_LABELS.new;
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

function PriBadge({ priority }) {
  const cfg = PRIORITY_LABELS[priority] || PRIORITY_LABELS.medium;
  return <span style={{ ...s.badge, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>;
}

export default function DashboardPage({ onNav }) {
  const [stats, setStats] = useState(getStats());
  const [complaints, setComplaints] = useState([]);
  const [notifs, setNotifs] = useState([]);

  useEffect(() => {
    setStats(getStats());
    setComplaints(getComplaints().slice(0, 5));
    setNotifs(getNotifications().filter(n => n.status === 'active').slice(0, 4));
  }, []);

  // Auto-refresh every 10s (simulates real-time updates)
  useEffect(() => {
    const t = setInterval(() => {
      setStats(getStats());
      setComplaints(getComplaints().slice(0, 5));
    }, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Дашборд</h1>
          <div style={s.pageSubtitle}>
            {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
        <div style={s.liveIndicator}>
          <div style={s.liveDot} />
          Обновляется в реальном времени
        </div>
      </div>

      {/* Emergency banner */}
      {notifs.length > 0 && (
        <div style={s.emergencyBanner}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div style={{ flex: 1 }}>
            <strong>{notifs[0].title}</strong>
            <span style={{ marginLeft: 12, opacity: 0.85 }}>{notifs[0].body}</span>
          </div>
          <button onClick={() => onNav('notifications')} style={s.bannerBtn}>Подробнее</button>
        </div>
      )}

      {/* Stats grid */}
      <div style={s.statsGrid}>
        <StatCard icon="📋" label="Всего жалоб"  value={stats.total}       color="#2563EB" onClick={() => onNav('complaints')} />
        <StatCard icon="🆕" label="Новые"         value={stats.new}         color="#DC2626" sub="Требуют обработки" onClick={() => onNav('complaints')} />
        <StatCard icon="⚙️" label="В работе"      value={stats.inProgress}  color="#D97706" onClick={() => onNav('complaints')} />
        <StatCard icon="✅" label="Выполнено"      value={stats.done}        color="#16A34A" onClick={() => onNav('complaints')} />
        <StatCard icon="⚡" label="Срочные"        value={stats.highPriority}color="#7C3AED" sub="Высокий приоритет" />
        <StatCard icon="📣" label="Активных уведомл." value={stats.notifActive} color="#0891B2" onClick={() => onNav('notifications')} />
        <StatCard icon="⏱"  label="Ср. время ответа" value={stats.avgResponse} color="#16A34A" />
        <StatCard icon="😊" label="Удовлетворённость" value={stats.satisfaction + '%'} color="#D97706" />
      </div>

      <div style={s.twoCol}>
        {/* Recent complaints */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Последние жалобы</span>
            <button onClick={() => onNav('complaints')} style={s.cardLink}>Все жалобы →</button>
          </div>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {['ID', 'Категория', 'Адрес', 'Приоритет', 'Статус', 'Время'].map(h => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {complaints.map(c => (
                  <tr key={c.id} style={s.tr}>
                    <td style={{ ...s.td, color: '#2563EB', fontWeight: 600 }}>{c.id}</td>
                    <td style={s.td}>{c.category}</td>
                    <td style={{ ...s.td, color: '#6B7280', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address}</td>
                    <td style={s.td}><PriBadge priority={c.priority} /></td>
                    <td style={s.td}><Badge status={c.status} /></td>
                    <td style={{ ...s.td, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{timeAgo(c.date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active notifications */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Активные оповещения</span>
            <button onClick={() => onNav('notifications')} style={s.cardLink}>Управление →</button>
          </div>
          {notifs.length === 0 ? (
            <div style={s.empty}>🟢 Активных оповещений нет</div>
          ) : notifs.map(n => (
            <div key={n.id} style={s.notifRow}>
              <span style={{ fontSize: 22 }}>{NOTIF_TYPE_ICONS[n.type] || 'ℹ️'}</span>
              <div style={{ flex: 1 }}>
                <div style={s.notifTitle}>{n.title}</div>
                <div style={s.notifBody}>{n.body}</div>
              </div>
              <span style={{ ...s.badge, background: '#FEF2F2', color: '#DC2626', flexShrink: 0 }}>Активно</span>
            </div>
          ))}

          {/* Quick new notification */}
          <button onClick={() => onNav('notifications')} style={s.addNotifBtn}>
            + Создать оповещение
          </button>
        </div>
      </div>

      {/* Category breakdown */}
      <div style={s.card}>
        <div style={s.cardHeader}>
          <span style={s.cardTitle}>Жалобы по категориям</span>
        </div>
        <div style={s.categoryGrid}>
          {['Яма на дороге', 'Нет освещения', 'Мусор', 'Опасная стройка', 'Прорыв трубы', 'Другое'].map(cat => {
            const count = getComplaints().filter(c => c.category === cat).length;
            const total = getComplaints().length;
            const pct = total ? Math.round((count / total) * 100) : 0;
            return (
              <div key={cat} style={s.catRow}>
                <div style={s.catLabel}>{cat}</div>
                <div style={s.catBar}>
                  <div style={{ ...s.catBarFill, width: pct + '%' }} />
                </div>
                <div style={s.catCount}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', animation: 'fadeIn .25s ease' },
  pageHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  liveIndicator: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#16A34A', background: '#F0FDF4', padding: '6px 12px', borderRadius: 20, border: '1px solid #BBF7D0' },
  liveDot: { width: 8, height: 8, borderRadius: '50%', background: '#16A34A', animation: 'pulse 2s infinite' },
  emergencyBanner: { display: 'flex', alignItems: 'center', gap: 12, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, padding: '12px 16px', marginBottom: 24, color: '#991B1B' },
  bannerBtn: { background: '#DC2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: '#fff', borderRadius: 10, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow .15s' },
  statIcon: { width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 },
  statBody: {},
  statValue: { fontSize: 26, fontWeight: 800, lineHeight: 1, color: '#111827' },
  statLabel: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  statSub: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#111827' },
  cardLink: { background: 'none', border: 'none', color: '#2563EB', fontSize: 13, cursor: 'pointer', padding: 0 },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '8px 10px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid #F3F4F6' },
  tr: { borderBottom: '1px solid #F9FAFB' },
  td: { padding: '10px 10px', fontSize: 13, color: '#374151' },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' },
  empty: { padding: '20px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 },
  notifRow: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #F9FAFB' },
  notifTitle: { fontSize: 14, fontWeight: 600, color: '#111827' },
  notifBody: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  addNotifBtn: { width: '100%', marginTop: 14, padding: '10px', background: '#EFF6FF', border: '1.5px dashed #BFDBFE', borderRadius: 8, color: '#2563EB', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  categoryGrid: { display: 'flex', flexDirection: 'column', gap: 10 },
  catRow: { display: 'flex', alignItems: 'center', gap: 12 },
  catLabel: { width: 160, fontSize: 13, color: '#374151', flexShrink: 0 },
  catBar: { flex: 1, height: 8, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' },
  catBarFill: { height: '100%', background: '#2563EB', borderRadius: 4, transition: 'width .4s' },
  catCount: { width: 28, textAlign: 'right', fontSize: 13, fontWeight: 600, color: '#374151', flexShrink: 0 },
};
