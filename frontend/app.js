const API_URL = 'http://127.0.0.1:8000';

function toggleAuth() {
    const login = document.getElementById('login-container');
    const register = document.getElementById('register-container');
    if (login.style.display === 'none') {
        login.style.display = 'block';
        register.style.display = 'none';
    } else {
        login.style.display = 'none';
        register.style.display = 'block';
    }
}

// Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        try {
            const response = await fetch(`${API_URL}/token`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('token', data.access_token);
                window.location.href = 'dashboard.html';
            } else {
                alert('Login failed. Check your credentials.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

// Register
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-password').value;

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ full_name: name, email, password })
            });

            if (response.ok) {
                alert('Registration successful! Please login.');
                toggleAuth();
            } else {
                alert('Registration failed.');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
}

async function loadUserData() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/users/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        const user = await response.json();
        document.getElementById('welcome-msg').innerText = `Hi, ${user.full_name.split(' ')[0]}`;
    }
}

async function loadHistory() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/attendance/history`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        const history = await response.json();
        const historyBody = document.getElementById('history-body');
        if (historyBody) {
            historyBody.innerHTML = history.reverse().map(entry => `
                <tr>
                    <td>${new Date(entry.check_in).toLocaleDateString()}</td>
                    <td class="status-checkin">${new Date(entry.check_in).toLocaleTimeString()}</td>
                    <td class="status-checkout">${entry.check_out ? new Date(entry.check_out).toLocaleTimeString() : '--:--'}</td>
                    <td>${entry.check_out ? 'Completed' : 'Active'}</td>
                </tr>
            `).join('');

            // If active session, disable check-in and enable check-out
            const activeSession = history.find(e => !e.check_out);
            if (activeSession) {
                document.getElementById('checkin-btn').disabled = true;
                document.getElementById('checkin-btn').style.opacity = '0.5';
                document.getElementById('checkout-btn').onclick = () => checkOut(activeSession.id);
            } else {
                document.getElementById('checkout-btn').disabled = true;
                document.getElementById('checkout-btn').style.opacity = '0.5';
            }
        }
    }
}

async function checkIn() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/attendance/checkin`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        loadHistory();
    }
}

async function checkOut(id) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_URL}/attendance/checkout/${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (response.ok) {
        loadHistory();
    }
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}
