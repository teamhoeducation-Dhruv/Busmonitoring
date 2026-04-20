// public/register.js

document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registration-form');
    const districtSelect = document.getElementById('district_id');
    const talukaSelect = document.getElementById('taluka_id');
    const submitBtn = document.getElementById('submit-btn');
    const messageBox = document.getElementById('registration-message');

    // 1. Load Districts
    const loadDistricts = async () => {
        try {
            const response = await fetch('../api/data.php?action=districts');
            const districts = await response.json();
            
            districts.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.name;
                districtSelect.appendChild(opt);
            });
        } catch (error) {
            console.error('Failed to load districts:', error);
        }
    };

    // 2. Load Talukas when District changes
    districtSelect.addEventListener('change', async () => {
        const districtId = districtSelect.value;
        talukaSelect.innerHTML = '<option value="">Select Taluka</option>';
        
        if (!districtId) {
            talukaSelect.disabled = true;
            return;
        }

        try {
            talukaSelect.disabled = false;
            const response = await fetch(`../api/data.php?action=talukas&district_id=${districtId}`);
            const talukas = await response.json();
            
            talukas.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.textContent = t.name;
                talukaSelect.appendChild(opt);
            });
        } catch (error) {
            console.error('Failed to load talukas:', error);
        }
    });

    // 3. Handle Registration Submission
    registrationForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirm_password').value,
            district_id: districtSelect.value,
            taluka_id: talukaSelect.value,
            school_name: document.getElementById('school_name').value,
            dias_code: document.getElementById('dias_code').value
        };

        // Client-side validation
        if (formData.password !== formData.confirm_password) {
            showMessage('Passwords do not match.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registering...';
        hideMessage();

        try {
            const response = await fetch('../api/register.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                showMessage('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                showMessage(result.error || 'Registration failed.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Register School';
            }
        } catch (error) {
            showMessage('Network error. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Register School';
        }
    });

    function showMessage(text, type) {
        messageBox.textContent = text;
        messageBox.className = type === 'success' ? 'msg-success' : 'msg-error';
        messageBox.style.display = 'block';
    }

    function hideMessage() {
        messageBox.style.display = 'none';
    }

    loadDistricts();
});
