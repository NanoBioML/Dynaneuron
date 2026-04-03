import React, { useState, useEffect } from 'react';
import { getResidents, formatDate } from '../data/store';

export function ResidentsPage() {
  const [residents, setResidents] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { setResidents(getResidents()); }, []);

  const filtered = residents.filter(r =>
    !search || r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search) || r.address.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Жители района</h1>
          <div style={s.pageSubtitle}>{residents.length} зарегистрированных жителей</div>
        </div>
      </div>

      <div style={s.filterBar}>
        <input style={s.search} placeholder="🔍 Поиск по имени, телефону, адресу..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={s.tableCard}>
        <table style={s.table}>
          <thead>
            <tr>
              {['ID', 'Имя', 'Телефон', 'Адрес', 'Жалоб', 'С нами с', 'Статус'].map(h => (
                <th key={h} style={s.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} style={s.tr}>
                <td style={{ ...s.td, color: '#2563EB', fontWeight: 600 }}>{r.id}</td>
                <td style={{ ...s.td, fontWeight: 500 }}>{r.name}</td>
                <td style={s.td}><a href={`tel:${r.phone}`} style={{ color: '#2563EB' }}>{r.phone}</a></td>
                <td style={{ ...s.td, color: '#6B7280' }}>{r.address}</td>
                <td style={s.td}>
                  <span style={{ background: r.complaints > 3 ? '#FEF2F2' : '#F3F4F6', color: r.complaints > 3 ? '#DC2626' : '#374151', padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 }}>
                    {r.complaints}
                  </span>
                </td>
                <td style={{ ...s.td, color: '#9CA3AF' }}>{new Date(r.registered).toLocaleDateString('ru-RU')}</td>
                <td style={s.td}>
                  <span style={{ background: r.active ? '#F0FDF4' : '#F3F4F6', color: r.active ? '#16A34A' : '#6B7280', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                    {r.active ? 'Активен' : 'Неактивен'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function MapPage() {
  const points = [
    { id: 'C-10042', x: 55,  y: 40,  type: 'complaint', label: 'Яма на дороге',    color: '#DC2626' },
    { id: 'C-10041', x: 145, y: 70,  type: 'complaint', label: 'Нет освещения',    color: '#D97706' },
    { id: 'C-10039', x: 235, y: 55,  type: 'complaint', label: 'Опасная стройка',  color: '#DC2626' },
    { id: 'C-10038', x: 90,  y: 140, type: 'complaint', label: 'Прорыв трубы',     color: '#7C3AED' },
    { id: 'N-001',   x: 180, y: 100, type: 'emergency', label: 'Задымление',        color: '#DC2626' },
    { id: 'N-002',   x: 310, y: 160, type: 'flood',     label: 'Подтопление',       color: '#2563EB' },
  ];

  const [hovered, setHovered] = useState(null);

  return (
    <div style={s.page}>
      <div style={s.pageHeader}>
        <div>
          <h1 style={s.pageTitle}>Карта инцидентов</h1>
          <div style={s.pageSubtitle}>Активные жалобы и оповещения на карте района</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* Map */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', position: 'relative' }}>
          <svg width="100%" viewBox="0 0 420 260" style={{ display: 'block' }}>
            {/* Map background */}
            <rect width="420" height="260" fill="#E8F0E4" />
            {/* Roads H */}
            {[48, 100, 148, 202].map((y, i) => <rect key={i} x={0} y={y} width="420" height={i%2===0?9:6} rx={3} fill="#fff" opacity={0.95} />)}
            {/* Roads V */}
            {[52, 118, 200, 262, 338].map((x, i) => <rect key={i} x={x} y={0} width={i%2===0?6:8} height="260" rx={3} fill="#fff" opacity={0.9} />)}
            {/* Parks */}
            <rect x={126} y={57}  width={68} height={37} rx={7} fill="#A8D5A2" />
            <rect x={22}  y={108} width={88} height={36} rx={7} fill="#A8D5A2" />
            <rect x={136} y={157} width={120} height={37} rx={7} fill="#A8D5A2" />
            {/* Blocks */}
            {[[18,8,28,36],[60,8,50,17],[126,8,68,36],[208,8,46,36],[270,8,62,17],[346,8,44,36],[18,60,28,34],[208,60,46,34],[346,60,44,34],[18,108,28,36],[208,108,46,36],[346,108,44,36],[18,157,110,37],[270,157,62,37],[346,157,44,37],[18,210,28,42],[126,210,68,42],[208,210,46,42],[270,210,62,42]].map(([x,y,w,h],i)=>(<rect key={i} x={x} y={y} width={w} height={h} rx={3} fill="#D4C9B8" opacity={0.75}/>))}
            {/* Incident points */}
            {points.map(p => (
              <g key={p.id} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(p)} onMouseLeave={() => setHovered(null)}>
                <circle cx={p.x} cy={p.y} r={16} fill={p.color} opacity={0.2} />
                <circle cx={p.x} cy={p.y} r={8} fill={p.color} />
                <circle cx={p.x} cy={p.y} r={3} fill="#fff" />
              </g>
            ))}
          </svg>
          {/* Tooltip */}
          {hovered && (
            <div style={{ position: 'absolute', top: 12, left: 12, background: '#111827', color: '#fff', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 500, pointerEvents: 'none' }}>
              <div style={{ fontWeight: 700 }}>{hovered.id}</div>
              <div>{hovered.label}</div>
            </div>
          )}
        </div>

        {/* Legend + list */}
        <div style={{ width: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Легенда</div>
            {[['#DC2626','Жалобы / ЧП'], ['#2563EB','Подтопление'], ['#7C3AED','Прорыв трубы'], ['#D97706','Нет освещения']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 13 }}>{label}</span>
              </div>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Инциденты ({points.length})</div>
            {points.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid #F9FAFB', cursor: 'pointer' }} onMouseEnter={() => setHovered(p)} onMouseLeave={() => setHovered(null)}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#2563EB' }}>{p.id}</div>
                  <div style={{ fontSize: 11, color: '#6B7280' }}>{p.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: { padding: '28px 32px', animation: 'fadeIn .25s ease' },
  pageHeader: { marginBottom: 20 },
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#111827' },
  pageSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  filterBar: { marginBottom: 16 },
  search: { width: '100%', maxWidth: 400, padding: '9px 14px', border: '1px solid #E5E7EB', borderRadius: 8, background: '#fff', fontSize: 14, outline: 'none' },
  tableCard: { background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', background: '#F9FAFB', borderBottom: '1px solid #F3F4F6' },
  tr: { borderBottom: '1px solid #F9FAFB' },
  td: { padding: '12px 14px', fontSize: 13, color: '#374151' },
};
