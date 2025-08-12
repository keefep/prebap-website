// Mock database for demo (in production, this would be a real backend)
const mockDB = {
  users: new Map(),
  events: new Map(),
  chats: new Map()
};

// Current user state
let currentUser = null;
let currentMonth = new Date();
let selectedDate = null;
let chatWithUser = null;

// Utility functions
const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Initialize demo data
function initDemoData() {
  // Add some demo users
  const demoUsers = [
    { id: '1', email: 'demo@example.com', password: 'demo123', fullName: 'Fr. John Smith', phone: '+91 98200 12345', parish: 'St. Mary\'s Church', role: 'priest', bio: 'Parish priest overseeing Pre-Bap programs' },
    { id: '2', email: 'coordinator@example.com', password: 'demo123', fullName: 'Maria Rodriguez', phone: '+91 98200 23456', parish: 'St. Mary\'s Church', role: 'coordinator', bio: 'Pre-Bap program coordinator' },
    { id: '3', email: 'leader@example.com', password: 'demo123', fullName: 'Thomas Wilson', phone: '+91 98200 34567', parish: 'St. Mary\'s Church', role: 'team-leader', bio: 'Team leader for Pre-Bap sessions' }
  ];
  
  demoUsers.forEach(user => {
    mockDB.users.set(user.id, { ...user, password: user.password }); // In real app, hash passwords
  });

  // Add some demo events
  const demoEvents = [
    { id: '1', userId: '2', title: 'Session 1: Introduction', date: '2025-01-15', startTime: '18:00', endTime: '20:00', location: 'Parish Hall', description: 'Welcome and introduction to Baptism', eventType: 'session' },
    { id: '2', userId: '2', title: 'Session 2: Roles & Responsibilities', date: '2025-01-22', startTime: '18:00', endTime: '20:00', location: 'Parish Hall', description: 'Understanding parental and godparent roles', eventType: 'session' },
    { id: '3', userId: '1', title: 'Baptism Ceremony', date: '2025-01-25', startTime: '10:00', endTime: '12:00', location: 'Main Church', description: 'Baptism ceremony for new members', eventType: 'baptism' }
  ];
  
  demoEvents.forEach(event => {
    mockDB.events.set(event.id, event);
  });
}

// Authentication functions
function login(email, password) {
  const user = Array.from(mockDB.users.values()).find(u => u.email === email && u.password === password);
  if (user) {
    currentUser = { ...user };
    delete currentUser.password; // Don't store password in session
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    showDashboard();
    return true;
  }
  return false;
}

async function register(userData) {
  if (userData.password !== userData.confirmPassword) {
    alert('Passwords do not match');
    return false;
  }
  
  try {
    // Create form data instead of JSON to avoid CORS
    const formData = new FormData();
    formData.append('fullName', userData.fullName);
    formData.append('email', userData.email);
    formData.append('phone', userData.phone);
    formData.append('parish', userData.parish);
    formData.append('role', userData.role);
    formData.append('bio', userData.bio || '');
    
    const response = await fetch('https://script.google.com/macros/s/AKfycbzzoZE_3T8XYr_riERzcfBRvqt6Ldmn1hr61pdqLccCpt77Mq0mGVEatLYfy5PoPBbJhg/exec', {
      method: 'POST',
      body: formData  // No headers, just form data
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Also add to local mockDB for demo purposes
      const newUser = {
        id: String(Date.now()),
        ...userData,
        bio: userData.bio || ''
      };
      mockDB.users.set(newUser.id, newUser);
      
      alert('Registration successful! Please login.');
      return true;
    } else {
      alert('Registration failed: ' + (result.error || 'Unknown error'));
      return false;
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('Registration failed: Network error. Please try again.');
    return false;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  showWelcomeScreen();
}

// UI State Management
function showWelcomeScreen() {
  el('#welcomeScreen').style.display = 'block';
  el('#dashboard').style.display = 'none';
  el('#userInfo').style.display = 'none';
  el('#loginBtn').style.display = 'inline-flex';
}

function showDashboard() {
  el('#welcomeScreen').style.display = 'none';
  el('#dashboard').style.display = 'block';
  el('#userInfo').style.display = 'flex';
  el('#loginBtn').style.display = 'none';
  
  el('#userName').textContent = currentUser.fullName;
  el('#welcomeUserName').textContent = currentUser.fullName;
  
  renderCalendar();
  renderEvents();
}

// Calendar functions
function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  el('#currentMonth').textContent = `${monthNames[month]} ${year}`;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const calendarDays = el('#calendarDays');
  calendarDays.innerHTML = '';
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    
    if (date.getMonth() !== month) {
      dayEl.classList.add('other-month');
    }
    
    if (date.toDateString() === new Date().toDateString()) {
      dayEl.classList.add('today');
    }
    
    const dateEl = document.createElement('div');
    dateEl.className = 'date';
    dateEl.textContent = date.getDate();
    dayEl.appendChild(dateEl);
    
    // Add events for this date
    const events = getEventsForDate(date);
    if (events.length > 0) {
      const eventsEl = document.createElement('div');
      eventsEl.className = 'events';
      events.forEach(event => {
        const eventEl = document.createElement('div');
        eventEl.className = 'calendar-event';
        eventEl.textContent = event.title;
        eventEl.title = `${event.title} - ${event.startTime} to ${event.endTime}`;
        eventEl.addEventListener('click', () => showEventDetails(event));
        eventsEl.appendChild(eventEl);
      });
      dayEl.appendChild(eventsEl);
    }
    
    dayEl.addEventListener('click', () => selectDate(date));
    calendarDays.appendChild(dayEl);
  }
}

function getEventsForDate(date) {
  const dateStr = date.toISOString().split('T')[0];
  return Array.from(mockDB.events.values()).filter(event => event.date === dateStr);
}

function selectDate(date) {
  selectedDate = date;
  el('#addEventForm input[name="date"]').value = date.toISOString().split('T')[0];
  showModal('addEventModal');
}

function renderEvents() {
  const eventsList = el('#eventsList');
  const events = Array.from(mockDB.events.values())
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 10); // Show next 10 events
  
  eventsList.innerHTML = '';
  
  if (events.length === 0) {
    eventsList.innerHTML = '<p class="muted">No upcoming events</p>';
    return;
  }
  
  events.forEach(event => {
    const eventEl = document.createElement('div');
    eventEl.className = 'event-item';
    
    const user = mockDB.users.get(event.userId);
    eventEl.innerHTML = `
      <div class="event-header">
        <div class="event-title">${event.title}</div>
        <div class="event-meta">
          <span>${new Date(event.date).toLocaleDateString()}</span>
          <span>${event.startTime} - ${event.endTime}</span>
          <span>${user?.fullName || 'Unknown'}</span>
        </div>
      </div>
      <div class="event-description">${event.description}</div>
      <div class="event-actions">
        <button class="btn ghost small" onclick="showEventDetails('${event.id}')">View Details</button>
        ${event.userId === currentUser.id ? `<button class="btn ghost small" onclick="deleteEvent('${event.id}')">Delete</button>` : ''}
        ${event.userId !== currentUser.id ? `<button class="btn ghost small" onclick="startChat('${event.userId}')">Chat with ${user?.fullName || 'User'}</button>` : ''}
      </div>
    `;
    
    eventsList.appendChild(eventEl);
  });
}

// Event management
function addEvent(eventData) {
  const newEvent = {
    id: String(Date.now()),
    userId: currentUser.id,
    ...eventData
  };
  
  mockDB.events.set(newEvent.id, newEvent);
  renderCalendar();
  renderEvents();
  hideModal('addEventModal');
  el('#addEventForm').reset();
}

function deleteEvent(eventId) {
  if (confirm('Are you sure you want to delete this event?')) {
    mockDB.events.delete(eventId);
    renderCalendar();
    renderEvents();
  }
}

function showEventDetails(event) {
  const eventObj = typeof event === 'string' ? mockDB.events.get(event) : event;
  if (!eventObj) return;
  
  const user = mockDB.users.get(eventObj.userId);
  alert(`
Event Details:
Title: ${eventObj.title}
Date: ${new Date(eventObj.date).toLocaleDateString()}
Time: ${eventObj.startTime} - ${eventObj.endTime}
Location: ${eventObj.location}
Description: ${eventObj.description}
Organizer: ${user?.fullName || 'Unknown'}
  `);
}

// Chat functions
function startChat(userId) {
  chatWithUser = mockDB.users.get(userId);
  if (!chatWithUser) return;
  
  el('#chatUserName').textContent = chatWithUser.fullName;
  showModal('chatModal');
  loadChatMessages();
}

function loadChatMessages() {
  const chatId = [currentUser.id, chatWithUser.id].sort().join('-');
  const messages = mockDB.chats.get(chatId) || [];
  
  const chatMessages = el('#chatMessages');
  chatMessages.innerHTML = '';
  
  messages.forEach(msg => {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-message ${msg.userId === currentUser.id ? 'own' : ''}`;
    msgEl.innerHTML = `
      <div class="sender">${msg.userName}</div>
      <div class="text">${msg.text}</div>
    `;
    chatMessages.appendChild(msgEl);
  });
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function sendChatMessage(text) {
  if (!text.trim() || !chatWithUser) return;
  
  const chatId = [currentUser.id, chatWithUser.id].sort().join('-');
  const messages = mockDB.chats.get(chatId) || [];
  
  const newMessage = {
    id: String(Date.now()),
    userId: currentUser.id,
    userName: currentUser.fullName,
    text: text.trim(),
    timestamp: new Date()
  };
  
  messages.push(newMessage);
  mockDB.chats.set(chatId, messages);
  
  el('#chatInput').value = '';
  loadChatMessages();
}

// Modal management
function showModal(modalId) {
  el(`#${modalId}`).style.display = 'flex';
}

function hideModal(modalId) {
  el(`#${modalId}`).style.display = 'none';
}

// Profile management
function updateProfile(profileData) {
  const user = mockDB.users.get(currentUser.id);
  if (!user) return;
  
  Object.assign(user, profileData);
  mockDB.users.set(currentUser.id, user);
  
  currentUser = { ...user };
  delete currentUser.password;
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  
  el('#userName').textContent = currentUser.fullName;
  el('#welcomeUserName').textContent = currentUser.fullName;
  
  hideModal('profileModal');
  alert('Profile updated successfully!');
}

// Event listeners
function initEventListeners() {
  // Login/Register
  el('#loginBtn').addEventListener('click', () => showModal('loginModal'));
  el('#getStartedBtn').addEventListener('click', () => showModal('loginModal'));
  
  // Modal close buttons
  els('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Auth tabs
  els('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      els('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      el('#loginForm').style.display = tab === 'login' ? 'grid' : 'none';
      el('#registerForm').style.display = tab === 'register' ? 'grid' : 'none';
    });
  });
  
  // Login form
  el('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    if (login(email, password)) {
      hideModal('loginModal');
      e.target.reset();
    } else {
      alert('Invalid email or password');
    }
  });
  
  // Register form
  el('#registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const userData = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      phone: formData.get('phone'),
      parish: formData.get('parish'),
      role: formData.get('role'),
      password: formData.get('password'),
      confirmPassword: formData.get('confirmPassword')
    };
    
    if (register(userData)) {
      e.target.reset();
      // Switch to login tab
      els('.tab-btn')[0].click();
    }
  });
  
  // Dashboard actions
  el('#logoutBtn').addEventListener('click', logout);
  el('#profileBtn').addEventListener('click', () => {
    const form = el('#profileForm');
    form.elements.fullName.value = currentUser.fullName;
    form.elements.phone.value = currentUser.phone;
    form.elements.parish.value = currentUser.parish;
    form.elements.role.value = currentUser.role;
    form.elements.bio.value = currentUser.bio || '';
    showModal('profileModal');
  });
  
  el('#addEventBtn').addEventListener('click', () => showModal('addEventModal'));
  
  // Profile form
  el('#profileForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profileData = {
      fullName: formData.get('fullName'),
      phone: formData.get('phone'),
      parish: formData.get('parish'),
      bio: formData.get('bio')
    };
    updateProfile(profileData);
  });
  
  // Add event form
  el('#addEventForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const eventData = {
      title: formData.get('title'),
      date: formData.get('date'),
      startTime: formData.get('startTime'),
      endTime: formData.get('endTime'),
      location: formData.get('location'),
      description: formData.get('description'),
      eventType: formData.get('eventType')
    };
    addEvent(eventData);
  });
  
  // Calendar navigation
  el('#prevMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });
  
  el('#nextMonth').addEventListener('click', () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });
  
  // Chat
  el('#sendChatBtn').addEventListener('click', () => {
    const input = el('#chatInput');
    sendChatMessage(input.value);
  });
  
  el('#chatInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendChatMessage(e.target.value);
    }
  });
  
  // Close modals on outside click
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
      e.target.style.display = 'none';
    }
  });
}

// Initialize
function init() {
  el('#yearNow').textContent = String(new Date().getFullYear());
  
  initDemoData();
  initEventListeners();
  
  // Check if user is already logged in
  const savedUser = localStorage.getItem('currentUser');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      showDashboard();
    } catch (e) {
      localStorage.removeItem('currentUser');
      showWelcomeScreen();
    }
  } else {
    showWelcomeScreen();
  }
}

document.addEventListener('DOMContentLoaded', init);
