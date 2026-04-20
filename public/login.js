// --- DOM Elements ---
const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");
const loginButton = document.getElementById("login-button");

// --- Gatekeeper and Redirect Logic ---
// We check our PHP backend to see if the session is already active
async function checkAuthStatus() {
    try {
        const response = await fetch('../api/auth.php?action=status');
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'logged_in') {
                handleRedirect(data.user);
            }
        }
    } catch (e) {
        console.error("Auth status check failed", e);
    }
}

// Replicating the previous Role-based routing logic 
function handleRedirect(user) {
    loginButton.textContent = "Success! Redirecting...";
    loginButton.disabled = true;

    const email = user.email;
    const role = user.role;
    const MASTER_EMAILS = ["master@cotd.com", "master1@cotd.com", "master2@cotd.com"];

    if (role === 'admin' || MASTER_EMAILS.includes(email)) {
        window.location.href = "master.html"; 
    } else if (role === 'school') {
        window.location.href = "school.html";
    } else if (role === 'district') {
        const district = email.split('@')[0].toLowerCase();
        window.location.href = `district.html?district=${district}`;
    } else {
        errorMessage.textContent = "Unknown user role. Please contact support.";
        errorMessage.style.display = 'block';
        loginButton.textContent = "Login";
        loginButton.disabled = false;
    }
}

// Determine session state on page load
checkAuthStatus();

// --- Login Form Submission ---
loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    // Reset UI
    errorMessage.style.display = 'none';
    loginButton.disabled = true;
    loginButton.textContent = "Logging In...";

    try {
        const response = await fetch('../api/auth.php?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.status === 'success') {
            if (data.csrf_token) {
                sessionStorage.setItem('csrf_token', data.csrf_token);
            }
            handleRedirect(data.user);
        } else {
            throw new Error(data.error || "Invalid username or password.");
        }
    } catch (error) {
        // Handle login failure
        errorMessage.textContent = "Error: " + error.message; 
        errorMessage.style.display = 'block';
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }
});
