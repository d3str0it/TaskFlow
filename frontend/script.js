
const API_BASE = 'http://127.0.0.1:8000/api';

let token = localStorage.getItem('access_token');
let currentFilter = 'all';
let tasks = [];

const authPage = document.getElementById('auth-page');
const tasksPage = document.getElementById('tasks-page');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const toggleLink = document.getElementById('toggle-link');
const toggleText = document.getElementById('toggle-text');
const authError = document.getElementById('auth-error');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const remainingCount = document.getElementById('remaining-count');
const totalCount = document.getElementById('total-count');
const filterBtns = document.querySelectorAll('.filter-btn');

let isLoginMode = true;

toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    if (isLoginMode) {
        authTitle.textContent = 'Вход';
        authSubmit.textContent = 'Войти';
        toggleText.textContent = 'Нет аккаунта?';
        toggleLink.textContent = 'Зарегистрироваться';
    } else {
        authTitle.textContent = 'Регистрация';
        authSubmit.textContent = 'Зарегистрироваться';
        toggleText.textContent = 'Уже есть аккаунт?';
        toggleLink.textContent = 'Войти';
    }
    authError.textContent = '';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    
    try {
        if (isLoginMode) {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка входа');
            }
            
            const data = await response.json();
            token = data.access_token;
            localStorage.setItem('access_token', token);
            authError.textContent = '';
            loadUser();
            
        } else {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Ошибка регистрации');
            }
            
            authError.textContent = '✅ Успешно! Теперь войдите.';
            isLoginMode = true;
            authTitle.textContent = 'Вход';
            authSubmit.textContent = 'Войти';
            toggleText.textContent = 'Нет аккаунта?';
            toggleLink.textContent = 'Зарегистрироваться';
            document.getElementById('auth-username').value = '';
            document.getElementById('auth-password').value = '';
        }
    } catch (error) {
        authError.textContent = error.message;
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('access_token');
    token = null;
    showAuthPage();
});

async function loadUser() {
    if (!token) {
        showAuthPage();
        return;
    }
    
    try {
        
        const payload = JSON.parse(atob(token.split('.')[1]));
        usernameDisplay.textContent = payload.sub || 'User';
        showTasksPage();
        await loadTasks();
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        localStorage.removeItem('access_token');
        token = null;
        showAuthPage();
    }
}

function showAuthPage() {
    authPage.style.display = 'block';
    tasksPage.style.display = 'none';
    document.getElementById('user-info').style.display = 'none';
}

function showTasksPage() {
    authPage.style.display = 'none';
    tasksPage.style.display = 'block';
    document.getElementById('user-info').style.display = 'flex';
}

async function loadTasks() {
    if (!token) return;
    
    const params = new URLSearchParams({ limit: 100 });
    if (currentFilter === 'active') params.append('completed', 'false');
    if (currentFilter === 'completed') params.append('completed', 'true');
    
    try {
        const response = await fetch(`${API_BASE}/tasks?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                token = null;
                showAuthPage();
                return;
            }
            throw new Error('Ошибка загрузки задач');
        }
        
        const data = await response.json();
        tasks = data.tasks;
        renderTasks();
        updateStats();
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

function renderTasks() {
    if (tasks.length === 0) {
        taskList.innerHTML = '<li style="text-align:center;color:#999;padding:30px;">Нет задач 🎉</li>';
        return;
    }
    
    taskList.innerHTML = tasks.map(task => `
        <li class="${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id})">
            <div>
                <span class="task-title">${escapeHtml(task.title)}</span>
                ${task.description ? `<span class="task-description">${escapeHtml(task.description)}</span>` : ''}
            </div>
            <span class="task-meta">${new Date(task.created_at).toLocaleDateString()}</span>
            <button class="delete-btn" onclick="deleteTask(${task.id})">🗑️</button>
        </li>
    `).join('');
}

function updateStats() {
    const remaining = tasks.filter(t => !t.completed).length;
    remainingCount.textContent = remaining;
    totalCount.textContent = tasks.length;
}

taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = taskInput.value.trim();
    if (!title) return;
    
    try {
        const response = await fetch(`${API_BASE}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description: '' })
        });
        
        if (!response.ok) throw new Error('Ошибка создания задачи');
        
        taskInput.value = '';
        await loadTasks();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось создать задачу');
    }
});

window.toggleTask = async function(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: !task.completed })
        });
        
        if (!response.ok) throw new Error('Ошибка обновления');
        await loadTasks();
    } catch (error) {
        console.error('Ошибка:', error);
    }
};

window.deleteTask = async function(id) {
    if (!confirm('Удалить задачу?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Ошибка удаления');
        await loadTasks();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось удалить задачу');
    }
};


filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        loadTasks();
    });
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

if (token) {
    loadUser();
} else {
    showAuthPage();
}