// Shared in-memory store using localStorage for persistence across pages
// In production, replace with real API calls

const KEYS = {
  complaints: 'alatau_admin_complaints',
  notifications: 'alatau_admin_notifications',
  residents: 'alatau_admin_residents',
};

// ── Initial seed data ──────────────────────────────────────────────────────

const SEED_COMPLAINTS = [
  { id: 'C-10042', category: 'Яма на дороге',    text: 'Большая яма на ул. Момышулы 89, опасно для машин', address: 'ул. Момышулы, 89', status: 'new',        priority: 'high',   author: 'Айбек С.',    phone: '+7 777 123 4567', date: '2024-03-19T08:12:00', assignee: null, comments: [] },
  { id: 'C-10041', category: 'Нет освещения',    text: 'Три фонаря не работают на пр. Алатауском возле школы', address: 'пр. Алатауский, 12', status: 'in_progress', priority: 'medium', author: 'Гульнара А.', phone: '+7 701 987 6543', date: '2024-03-18T21:45:00', assignee: 'Ержан М.', comments: [{ author: 'Ержан М.', text: 'Выехала бригада, проверят завтра', date: '2024-03-19T09:00:00' }] },
  { id: 'C-10040', category: 'Мусор',            text: 'Контейнеры переполнены уже 3 дня, мусор на земле', address: 'мкр. Думан, д. 5', status: 'done',        priority: 'low',    author: 'Нурлан Б.',   phone: '+7 705 555 0011', date: '2024-03-17T10:30:00', assignee: 'Алия К.', comments: [{ author: 'Алия К.', text: 'Вывоз произведён', date: '2024-03-18T14:00:00' }] },
  { id: 'C-10039', category: 'Опасная стройка',  text: 'Стройка без ограждения, дети играют рядом', address: 'ул. Байзакова, 34', status: 'new',        priority: 'high',   author: 'Дина С.',     phone: '+7 747 222 3344', date: '2024-03-19T07:55:00', assignee: null, comments: [] },
  { id: 'C-10038', category: 'Прорыв трубы',     text: 'Вода течёт из-под асфальта уже 2 часа', address: 'ул. Алтын Орда, 7', status: 'in_progress', priority: 'high',   author: 'Серик Т.',    phone: '+7 771 444 5566', date: '2024-03-19T06:30:00', assignee: 'Данияр У.', comments: [] },
  { id: 'C-10037', category: 'Нет освещения',    text: 'Весь квартал без света с вечера', address: 'мкр. Байтерек', status: 'done',        priority: 'medium', author: 'Айгерим Н.',  phone: '+7 700 111 2233', date: '2024-03-16T20:10:00', assignee: 'Ержан М.', comments: [] },
  { id: 'C-10036', category: 'Яма на дороге',    text: 'Яма после ремонта стала больше', address: 'ул. Момышулы, 12', status: 'new',        priority: 'medium', author: 'Болат Ж.',    phone: '+7 702 666 7788', date: '2024-03-15T15:20:00', assignee: null, comments: [] },
  { id: 'C-10035', category: 'Мусор',            text: 'Стихийная свалка у гаражей', address: 'ул. Байзакова, 90', status: 'rejected',    priority: 'low',    author: 'Камила Р.',   phone: '+7 778 999 0000', date: '2024-03-14T11:00:00', assignee: 'Алия К.', comments: [{ author: 'Алия К.', text: 'Не наша зона ответственности, передано в КСК', date: '2024-03-15T09:00:00' }] },
];

const SEED_NOTIFICATIONS = [
  { id: 'N-001', type: 'emergency', title: 'Задымление на ул. Алтын Орда', body: 'Камера #45 зафиксировала дым. Пожарные выехали.', priority: 'critical', status: 'active',  date: '2024-03-19T11:05:00', target: 'all' },
  { id: 'N-002', type: 'flood',     title: 'Подтопление дороги',            body: 'пр. Алатауский, 5 — уровень воды повышен.', priority: 'high',     status: 'active',  date: '2024-03-19T10:47:00', target: 'all' },
  { id: 'N-003', type: 'info',      title: 'Плановое отключение воды',      body: 'ул. Момышулы 1–50. 19.03 с 10:00 до 18:00.', priority: 'medium',   status: 'sent',    date: '2024-03-18T16:00:00', target: 'zone_momyshy' },
  { id: 'N-004', type: 'road',      title: 'Перекрытие дороги',             body: 'ул. Байзакова закрыта для ремонта до 20.03.', priority: 'medium',   status: 'sent',    date: '2024-03-17T08:00:00', target: 'all' },
  { id: 'N-005', type: 'event',     title: 'Субботник в парке Алатау',      body: '23.03.2024 в 10:00. Приглашаем всех!',        priority: 'low',      status: 'draft',   date: '2024-03-19T09:00:00', target: 'all' },
];

const SEED_RESIDENTS = [
  { id: 'R-001', name: 'Айбек Сейткали',   phone: '+7 777 123 4567', address: 'ул. Момышулы, 89, кв. 12',   complaints: 3, registered: '2023-05-10', active: true },
  { id: 'R-002', name: 'Гульнара Ахметова', phone: '+7 701 987 6543', address: 'пр. Алатауский, 12, кв. 34', complaints: 5, registered: '2023-02-14', active: true },
  { id: 'R-003', name: 'Нурлан Байжанов',   phone: '+7 705 555 0011', address: 'мкр. Думан, д. 5, кв. 7',    complaints: 1, registered: '2023-08-22', active: true },
  { id: 'R-004', name: 'Дина Сейтова',      phone: '+7 747 222 3344', address: 'ул. Байзакова, 34, кв. 19',  complaints: 4, registered: '2022-11-30', active: true },
  { id: 'R-005', name: 'Серик Токтаров',    phone: '+7 771 444 5566', address: 'ул. Алтын Орда, 7, кв. 3',   complaints: 2, registered: '2024-01-05', active: true },
];

// ── Store helpers ──────────────────────────────────────────────────────────

function load(key, seed) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  } catch { return seed; }
}

function save(key, data) {
  try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ── Complaints ─────────────────────────────────────────────────────────────

export function getComplaints() { return load(KEYS.complaints, SEED_COMPLAINTS); }

export function saveComplaints(data) { save(KEYS.complaints, data); }

export function updateComplaint(id, changes) {
  const list = getComplaints().map(c => c.id === id ? { ...c, ...changes } : c);
  saveComplaints(list);
  return list;
}

export function addComplaintComment(id, comment) {
  const list = getComplaints().map(c => {
    if (c.id !== id) return c;
    return { ...c, comments: [...(c.comments || []), { ...comment, date: new Date().toISOString() }] };
  });
  saveComplaints(list);
  return list;
}

export function addComplaint(complaint) {
  const list = getComplaints();
  const id = 'C-' + (10000 + list.length + 1 + Math.floor(Math.random() * 100));
  const newItem = { id, status: 'new', date: new Date().toISOString(), assignee: null, comments: [], priority: 'medium', ...complaint };
  const updated = [newItem, ...list];
  saveComplaints(updated);
  return updated;
}

// ── Notifications ──────────────────────────────────────────────────────────

export function getNotifications() { return load(KEYS.notifications, SEED_NOTIFICATIONS); }

export function saveNotifications(data) { save(KEYS.notifications, data); }

export function addNotification(notif) {
  const list = getNotifications();
  const id = 'N-' + String(list.length + 1).padStart(3, '0');
  const newItem = { id, date: new Date().toISOString(), status: 'draft', ...notif };
  const updated = [newItem, ...list];
  saveNotifications(updated);
  return updated;
}

export function sendNotification(id) {
  const list = getNotifications().map(n => n.id === id ? { ...n, status: 'sent', sentAt: new Date().toISOString() } : n);
  saveNotifications(list);
  return list;
}

// ── Residents ──────────────────────────────────────────────────────────────

export function getResidents() { return load(KEYS.residents, SEED_RESIDENTS); }

// ── Stats ──────────────────────────────────────────────────────────────────

export function getStats() {
  const complaints = getComplaints();
  const notifications = getNotifications();
  return {
    total:       complaints.length,
    new:         complaints.filter(c => c.status === 'new').length,
    inProgress:  complaints.filter(c => c.status === 'in_progress').length,
    done:        complaints.filter(c => c.status === 'done').length,
    rejected:    complaints.filter(c => c.status === 'rejected').length,
    highPriority:complaints.filter(c => c.priority === 'high' && c.status !== 'done').length,
    notifActive: notifications.filter(n => n.status === 'active').length,
    notifDraft:  notifications.filter(n => n.status === 'draft').length,
    avgResponse: '4.2ч',
    satisfaction: 87,
  };
}

// ── Formatters ─────────────────────────────────────────────────────────────

export const STATUS_LABELS = {
  new:         { label: 'Новая',       color: '#DC2626', bg: '#FEF2F2' },
  in_progress: { label: 'В работе',    color: '#D97706', bg: '#FFFBEB' },
  done:        { label: 'Выполнено',   color: '#16A34A', bg: '#F0FDF4' },
  rejected:    { label: 'Отклонено',   color: '#6B7280', bg: '#F3F4F6' },
};

export const PRIORITY_LABELS = {
  high:   { label: 'Высокий', color: '#DC2626', bg: '#FEF2F2' },
  medium: { label: 'Средний', color: '#D97706', bg: '#FFFBEB' },
  low:    { label: 'Низкий',  color: '#16A34A', bg: '#F0FDF4' },
};

export const NOTIF_TYPE_ICONS = {
  emergency: '🚨',
  flood:     '💧',
  road:      '🚧',
  info:      'ℹ️',
  event:     '📢',
};

export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'только что';
  if (m < 60) return `${m} мин. назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ч. назад`;
  return `${Math.floor(h / 24)} д. назад`;
}

export const ASSIGNEES = ['Ержан М.', 'Алия К.', 'Данияр У.', 'Зарина Б.', 'Руслан Н.'];
export const CATEGORIES = ['Яма на дороге', 'Нет освещения', 'Мусор', 'Опасная стройка', 'Прорыв трубы', 'Другое'];
