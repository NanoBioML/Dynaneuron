import React from 'react';

const NAV = [
  { id: 'dashboard',     icon: '📊', label: 'Дашборд' },
  { id: 'complaints',    icon: '📋', label: 'Жалобы' },
  { id: 'notifications', icon: '🔔', label: 'Уведомления' },
  { id: 'residents',     icon: '👥', label: 'Жители' },
  { id: 'map',           icon: '🗺️', label: 'Карта' },
];

export default function Sidebar({ active, onNav, unread }) {
  return (
    <aside style={s.sidebar}>
      {/* Logo */}
      <div style={s.logo}>
        <div style={s.logoIcon}>🏛</div>
        <div>
          <div style={s.logoTitle}>Алатау</div>
          <div style={s.logoSub}>Портал администрации</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={s.nav}>
        {NAV.map(item => (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            style={{
              ...s.navItem,
              background: active === item.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              fontWeight: active === item.id ? 600 : 400,
            }}
          >
            <span style={s.navIcon}>{item.icon}</span>
            <span style={s.navLabel}>{item.label}</span>
            {item.id === 'complaints' && unread?.complaints > 0 && (
              <span style={s.badge}>{unread.complaints}</span>
            )}
            {item.id === 'notifications' && unread?.notifDraft > 0 && (
              <span style={{ ...s.badge, background: '#D97706' }}>{unread.notifDraft}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Bottom */}
      <div style={s.bottom}>
        <div style={s.adminRow}>
          <div style={s.adminAvatar}>АК</div>
          <div>
            <div style={s.adminName}>Алия Каримова</div>
            <div style={s.adminRole}>Администратор</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

const s = {
  sidebar: {
    width: 'var(--sidebar-w)',
    background: '#1E3A5F',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    height: '100vh',
    position: 'fixed',
    left: 0, top: 0,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '20px 20px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  logoIcon: { fontSize: 28, lineHeight: 1 },
  logoTitle: { fontSize: 16, fontWeight: 700 },
  logoSub: { fontSize: 11, opacity: 0.6, marginTop: 1 },
  nav: { flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px', borderRadius: 8, border: 'none',
    color: 'rgba(255,255,255,0.85)', cursor: 'pointer',
    width: '100%', textAlign: 'left', transition: 'background .15s',
  },
  navIcon: { fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0 },
  navLabel: { flex: 1, fontSize: 14 },
  badge: {
    background: '#DC2626', color: '#fff',
    fontSize: 11, fontWeight: 700,
    padding: '1px 7px', borderRadius: 10, flexShrink: 0,
  },
  bottom: {
    padding: '12px 16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  adminRow: { display: 'flex', alignItems: 'center', gap: 10 },
  adminAvatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'rgba(255,255,255,0.2)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 13, fontWeight: 700, flexShrink: 0,
  },
  adminName: { fontSize: 13, fontWeight: 600 },
  adminRole: { fontSize: 11, opacity: 0.6, marginTop: 1 },
};
