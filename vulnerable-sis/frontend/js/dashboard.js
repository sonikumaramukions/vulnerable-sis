// VULNERABILITY: No authentication check on page load
window.onload = function() {
    loadUserInfo();
    loadDashboardData();
};

function loadUserInfo() {
    // VULNERABILITY: Trusting client-side storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userName = getCookie('userName') || user.name || 'Student';
    
    // VULNERABILITY: XSS - innerHTML without sanitization
    document.getElementById('userName').innerHTML = userName;
    
    // VULNERABILITY: Loading user photo from untrusted source
    const userPhoto = document.getElementById('userPhoto');
    if (user.photo) {
        userPhoto.src = user.photo;
    }
}

function loadDashboardData() {
    // VULNERABILITY: No authentication token required
    fetch('/api/announcements')
        .then(res => res.json())
        .then(data => {
            document.getElementById('announcementCount').textContent = data.length || 0;
        })
        .catch(err => console.error('Error loading announcements:', err));
    
    // VULNERABILITY: Loading sensitive data without authorization
    fetch('/api/student/' + getCookie('sessionId'))
        .then(res => res.json())
        .then(data => {
            if (data) {
                document.getElementById('attendancePercent').textContent = (data.attendance || 0) + '%';
                document.getElementById('gpaValue').textContent = (data.gpa || 'N/A');
            }
        })
        .catch(err => console.error('Error loading student data:', err));
}

function loadSection(section) {
    // VULNERABILITY: No authorization check
    const contentSection = document.getElementById('mainContent');
    
    // Update active nav link
    if (event && event.target) {
        const navLink = event.target.closest('.nav-link');
        if (navLink) {
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            navLink.classList.add('active');
        }
    }
    
    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    }
    
    // VULNERABILITY: Loading content without validation
    switch(section) {
        case 'announcements':
            loadAnnouncements();
            break;
        case 'noticeboard':
            loadNoticeBoard();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'myinfo':
            loadMyInfo();
            break;
        default:
            if (contentSection) {
                contentSection.innerHTML = '<h2>' + section + '</h2><p>Content coming soon...</p>';
            }
    }
}

function loadAnnouncements() {
    fetch('/api/announcements')
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('mainContent');
            // VULNERABILITY: XSS - rendering unsanitized HTML
            container.innerHTML = data.map(ann => `
                <div class="announcement-item">
                    <h3>${ann.title}</h3>
                    <div class="announcement-content">${ann.content}</div>
                    <small>Date: ${ann.date}</small>
                </div>
            `).join('');
        });
}

function loadNoticeBoard() {
    window.location.href = 'noticeboard.html';
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
        sidebar.classList.toggle('collapsed');
    }
}

function toggleNavSection(section) {
    const nav = document.getElementById(section + '-nav');
    if (nav) {
        nav.classList.toggle('collapsed');
    }
}

function loadDocuments() {
    window.location.href = 'documents.html';
}

function loadMyInfo() {
    const userId = getCookie('sessionId');
    fetch('/api/student/' + userId)
        .then(res => res.json())
        .then(data => {
            const container = document.getElementById('mainContent');
            // VULNERABILITY: XSS - displaying user data without sanitization
            container.innerHTML = `
                <div class="profile-info">
                    <h2>My Information</h2>
                    <p><strong>Name:</strong> ${data.name || 'N/A'}</p>
                    <p><strong>Student ID:</strong> ${data.student_id || 'N/A'}</p>
                    <p><strong>Email:</strong> ${data.email || 'N/A'}</p>
                    <p><strong>Course:</strong> ${data.course || 'N/A'}</p>
                    <p><strong>Semester:</strong> ${data.semester || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${data.phone || 'N/A'}</p>
                    <p><strong>Address:</strong> ${data.address || 'N/A'}</p>
                </div>
            `;
        });
}

function logout() {
    // VULNERABILITY: Not invalidating server-side session
    localStorage.clear();
    document.cookie.split(";").forEach(function(c) { 
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    window.location.href = 'login.html';
}

function showNotifications() {
    alert('Notifications feature coming soon!');
}

function showUserMenu() {
    alert('User menu feature coming soon!');
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

