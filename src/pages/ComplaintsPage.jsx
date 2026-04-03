import React, { useState } from 'react';
import { db } from '../firebase'; // Убедись, что путь к firebase.js верный
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

export default function ComplaintsPage({ reports = [] }) {
  // Храним текст ответов для каждой жалобы отдельно
  const [replyTexts, setReplyTexts] = useState({});

  const formatTime = (ts) => {
    if (!ts || !ts.toDate) return 'Синхронизация...';
    try {
      return ts.toDate().toLocaleString('ru-RU');
    } catch (e) {
      return 'Ошибка даты';
    }
  };

  // ФУНКЦИЯ ОТПРАВКИ ОТВЕТА В FIREBASE
  const handleSendMessage = async (id) => {
    const text = replyTexts[id];
    if (!text || !text.trim()) {
      alert("Напишите текст ответа!");
      return;
    }

    try {
      const reportRef = doc(db, "reports", id);
      await updateDoc(reportRef, {
        adminReply: text,
        status: 'Отвечено',
        replyTimestamp: serverTimestamp()
      });
      
      // Очищаем поле ввода для этой конкретной жалобы
      setReplyTexts(prev => ({ ...prev, [id]: '' }));
      alert("Ответ успешно отправлен жителю!");
    } catch (e) {
      console.error("Ошибка:", e);
      alert("Не удалось отправить ответ. Проверь консоль.");
    }
  };

  const complaints = reports.filter(r => r.type && !r.type.includes('SOS'));

  return (
    <div style={s.container}>
      <header style={s.header}>
        <div>
          <h1 style={s.title}>Реестр обращений жителей</h1>
          <p style={s.subTitle}>Прямая связь и модерация заявок</p>
        </div>
        <div style={s.countBadge}>{complaints.length}</div>
      </header>

      {complaints.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 60, marginBottom: 20 }}>📋</div>
          <h2 style={{ fontSize: 18, color: '#1c1c1e' }}>Жалоб пока нет</h2>
        </div>
      ) : (
        <div style={s.list}>
          {complaints.map((item) => (
            <div key={item.id} style={s.card}>
              <div style={s.cardHeader}>
                <div style={s.userInfo}>
                  <div style={s.avatar}>{item.user ? item.user[0] : 'Г'}</div>
                  <div>
                    <div style={s.userName}>{item.user || 'Гость'}</div>
                    <div style={s.userType}>Житель Алатауского района</div>
                  </div>
                </div>
                <div style={s.time}>{formatTime(item.timestamp)}</div>
              </div>

              <div style={s.content}>
                {item.type && item.type.includes('[') && (
                  <div style={s.categoryTag}>
                    {item.type.split(']')[0].replace('[', '')}
                  </div>
                )}
                <p style={s.text}>
                  {item.type && item.type.includes(']') ? item.type.split(']')[1] : item.type}
                </p>
              </div>

              {/* ОТОБРАЖЕНИЕ СУЩЕСТВУЮЩЕГО ОТВЕТА */}
              {item.adminReply && (
                <div style={s.adminReplyBox}>
                  <div style={s.adminReplyTitle}>Ваш предыдущий ответ:</div>
                  <div style={s.adminReplyText}>{item.adminReply}</div>
                </div>
              )}

              {/* ПОЛЕ ВВОДА НОВОГО ОТВЕТА */}
              <div style={s.replyArea}>
                <textarea
                  style={s.textarea}
                  placeholder="Введите текст сообщения для жителя..."
                  value={replyTexts[item.id] || ''}
                  onChange={(e) => setReplyTexts(prev => ({ ...prev, [item.id]: e.target.value }))}
                />
                <div style={s.footer}>
                  <div style={s.statusInfo}>
                    <span style={{...s.statusDot, background: item.adminReply ? '#34C759' : '#FF9500'}} />
                    {item.adminReply ? 'Отвечено' : 'Ожидает ответа'}
                  </div>
                  <div style={s.actions}>
                    <button 
                      style={s.btnSend} 
                      onClick={() => handleSendMessage(item.id)}
                    >
                      Отправить сообщение ✉️
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── СТИЛИ ──────────────────────────────────────────────────────────────
const s = {
  container: { padding: '40px', maxWidth: '900px', margin: '0 auto', boxSizing: 'border-box', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' },
  title: { fontSize: '28px', fontWeight: 800, color: '#1c1c1e', margin: 0 },
  subTitle: { fontSize: '15px', color: '#8E8E93', marginTop: '4px' },
  countBadge: { background: '#2563EB', color: '#fff', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700 },
  
  list: { display: 'flex', flexDirection: 'column', gap: '24px' },
  card: { background: '#fff', borderRadius: '24px', padding: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', border: '1px solid #E5E5EA' },
  
  cardHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '16px' },
  userInfo: { display: 'flex', gap: '12px', alignItems: 'center' },
  avatar: { width: '40px', height: '40px', background: '#F2F2F7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#2563EB' },
  userName: { fontSize: '16px', fontWeight: 700 },
  userType: { fontSize: '12px', color: '#8E8E93' },
  time: { fontSize: '13px', color: '#AEAEB2' },

  categoryTag: { display: 'inline-block', background: '#E8F0FF', color: '#2563EB', padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, marginBottom: '10px' },
  text: { fontSize: '16px', color: '#3A3A3C', lineHeight: 1.5, marginBottom: '20px' },

  adminReplyBox: { background: '#F0F7FF', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #2563EB', marginBottom: '16px' },
  adminReplyTitle: { fontSize: '12px', fontWeight: 800, color: '#2563EB', marginBottom: '4px', textTransform: 'uppercase' },
  adminReplyText: { fontSize: '14px', color: '#1c1c1e' },

  replyArea: { marginTop: '16px' },
  textarea: { width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #E5E5EA', background: '#F9F9FB', fontSize: '14px', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', marginBottom: '12px', outline: 'none' },

  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #F2F2F7' },
  statusInfo: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#1c1c1e' },
  statusDot: { width: '8px', height: '8px', borderRadius: '50%' },
  btnSend: { background: '#2563EB', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '14px', fontWeight: 700, cursor: 'pointer' },

  emptyState: { textAlign: 'center', marginTop: '80px', padding: '60px', background: '#fff', borderRadius: '24px', border: '2px dashed #E5E5EA' }
};