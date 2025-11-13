// VULNERABILITY: No server-side validation for section loading
const sections = {
    home: function() {
        return '<div class="welcome-section"><h2>Welcome to Student Information System</h2></div>';
    },
    
    feedback: function() {
        return `
            <div class="feedback-section">
                <h2>Submit Feedback</h2>
                <form id="feedbackForm" onsubmit="submitFeedback(event)">
                    <textarea id="feedbackText" placeholder="Enter your feedback..." required></textarea>
                    <button type="submit" class="btn-submit">Submit</button>
                </form>
            </div>
        `;
    },
    
    courses: function() {
        return '<h2>My Courses</h2><p>Course information will be displayed here.</p>';
    }
};

function submitFeedback(event) {
    event.preventDefault();
    const comment = document.getElementById('feedbackText').value;
    const studentId = getCookie('sessionId');
    
    // VULNERABILITY: XSS - storing unsanitized input
    fetch('/api/feedback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            studentId: studentId,
            comment: comment
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Feedback submitted successfully!');
            document.getElementById('feedbackForm').reset();
        }
    });
}

