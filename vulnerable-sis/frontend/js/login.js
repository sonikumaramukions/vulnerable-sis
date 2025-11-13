// VULNERABILITY: Client-side validation can be bypassed
function handleLogin(event) {
    event.preventDefault();
    
    const loginId = document.getElementById('loginId').value;
    const password = document.getElementById('password').value;
    const userType = document.querySelector('input[name="userType"]:checked').value;
    const isAdmin = document.getElementById('isAdmin').value;
    
    // VULNERABILITY: Credentials sent in plain text
    const loginData = {
        loginId: loginId,
        password: password,
        userType: userType,
        isAdmin: isAdmin
    };
    
    // VULNERABILITY: No HTTPS enforcement
    fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include', // VULNERABILITY: Sends cookies
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // VULNERABILITY: Storing sensitive data in localStorage
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('sessionId', data.user.id);
            
            // VULNERABILITY: Redirect without validation
            window.location.href = 'dashboard.html';
        } else {
            // VULNERABILITY: XSS - displaying unsanitized error message
            document.getElementById('errorMessage').innerHTML = data.message || 'Login failed';
            document.getElementById('errorMessage').style.display = 'block';
        }
    })
    .catch(error => {
        // VULNERABILITY: Exposing error details
        document.getElementById('errorMessage').innerHTML = 'Error: ' + error.message;
        document.getElementById('errorMessage').style.display = 'block';
    });
    
    return false;
}

function togglePassword() {
    const passwordInput = document.getElementById('password');
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
    } else {
        passwordInput.type = 'password';
    }
}

function forgotPassword() {
    const email = prompt('Enter your email address:');
    if (email) {
        // VULNERABILITY: No email validation
        fetch('/api/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: email })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // VULNERABILITY: Exposing reset token
                alert('Reset token: ' + data.resetToken);
            } else {
                alert('Error: ' + data.message);
            }
        });
    }
}

function newRegistration() {
    alert('Registration feature coming soon!');
}

