// 1. ВСЕ ИМПОРТЫ СТРОГО ВВЕРХУ
import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

// Импорты страниц и компонентов
import Sidebar from './components/Sidebar';
import DashboardPage from './pages/DashboardPage';
import NotificationsPage from './pages/NotificationsPage';
import ComplaintsPage from './pages/ComplaintsPage'; // Убедись, что импорт есть
import { ResidentsPage, MapPage } from './pages/OtherPages';

// ── ЭКРАН ЛОГИНА ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('admin@alatau.kz');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!password) { setError('Введите пароль'); return; }
    setLoading(true);
    setTimeout(() => {
      if (password === 'admin123' || password === '123') {
        onLogin();
      } else {
        setError('Неверный пароль. Подсказка: admin123');
        setLoading(false);
      }
    }, 800);
  }

  return (
    <div style={ls.page}>
      <div style={ls.card}>
        <div style={ls.logoRow}>
          <span style={{ fontSize: 40 }}>🏛</span>
          <div>
            <div style={ls.logoTitle}>Алатау</div>
            <div style={ls.logoSub}>Портал администрации района</div>
          </div>
        </div>
        <h2 style={ls.heading}>Вход в систему</h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={ls.label}>Email</label>
            <input style={ls.input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label style={ls.label}>Пароль</label>
            <input style={ls.input} type="password" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} placeholder="••••••••" />
          </div>
          {error && <div style={ls.error}>{error}</div>}
          <button type="submit" disabled={loading} style={{ ...ls.btn, opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Проверка...' : 'Войти'}
          </button>
        </form>
        <div style={ls.hint}>Тестовый доступ: пароль <code>admin123</code></div>
      </div>
    </div>
  );
}

// ── ОСНОВНОЕ ПРИЛОЖЕНИЕ ──────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [page, setPage] = useState('dashboard');
  const [reports, setReports] = useState([]);

  // Реальное время из Firebase
  useEffect(() => {
    if (!loggedIn) return;

    try {
      const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReports(data);
      }, (err) => {
        console.error("Ошибка Firestore:", err);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("Ошибка подключения:", e);
    }
  }, [loggedIn]);

  if (!loggedIn) return <LoginScreen onLogin={() => setLoggedIn(true)} />;

  // Функция для безопасного отображения даты (ЧТОБЫ НЕ БЫЛО БЕЛОГО ЭКРАНА)
  const formatTime = (ts) => {
    if (!ts || !ts.toDate) return 'Синхронизация...';
    return ts.toDate().toLocaleString('ru-RU');
  };

  const pages = {
    dashboard: (
      <div style={{ padding: '30px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 20 }}>Живая лента Alatau Smart City</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reports.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#8E8E93' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>📡</div>
              Ждем сигналов из приложения...
            </div>
          ) : (
            reports.map(report => (
              <div key={report.id} style={{
                background: '#fff', padding: 20, borderRadius: 12, 
                borderLeft: report.type?.includes('SOS') ? '8px solid #DC2626' : '8px solid #2563EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div style={{ fontWeight: 'bold', fontSize: 17 }}>{report.user || 'Гость'}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{formatTime(report.timestamp)}</div>
                </div>
                <div style={{ color: '#4B5563', marginTop: 8, fontSize: 15 }}>{report.type}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#10B981', marginTop: 10, textTransform: 'uppercase' }}>
                  Статус: {report.status || 'Новый'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    ),
    complaints:    <ComplaintsPage reports={reports} />,
    notifications: <NotificationsPage />,
    residents:     <ResidentsPage />,
    map:           <MapPage />,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar 
        active={page} 
        onNav={setPage} 
        unread={{ complaints: reports.filter(r => r.status === 'new').length }} 
      />
      <main style={{ marginLeft: '260px', flex: 1, minHeight: '100vh' }}>
        {pages[page] || pages.dashboard}
      </main>
    </div>
  );
}

// ── СТИЛИ ЛОГИНА ──────────────────────────────────────────────────────────────
const ls = {
  page: { minHeight: '100vh', background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'sans-serif' },
  card: { background: '#fff', borderRadius: 24, padding: '40px 36px', width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  logoRow: { display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 },
  logoTitle: { fontSize: 24, fontWeight: 800, color: '#111827' },
  logoSub: { fontSize: 13, color: '#6B7280' },
  heading: { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 20 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  input: { width: '100%', padding: '12px 16px', border: '1.5px solid #E5E7EB', borderRadius: 12, fontSize: 15, boxSizing: 'border-box', outline: 'none' },
  error: { background: '#FEF2F2', color: '#DC2626', fontSize: 13, padding: '10px', borderRadius: 10, marginTop: 10 },
  btn: { background: '#2563EB', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontSize: 16, fontWeight: 700, cursor: 'pointer', width: '100%', marginTop: 10 },
  hint: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 16 },
};