// --- DOM Elements ---
const userInfo = document.getElementById("user-info");
const schoolInfo = document.getElementById("school-info");
const logoutButton = document.getElementById("logout-button");
const totalStudentsEl = document.getElementById("total-students");
const submittedTodayEl = document.getElementById("submitted-today");
const pendingUpdateEl = document.getElementById("pending-update");
const addStudentForm = document.getElementById("add-student-form");
const studentNameInput = document.getElementById("student-name-input");
const studentLevelInput = document.getElementById("student-level-input");
const studentStandardInput = document.getElementById("student-standard-input");
const dailyRemarkForm = document.getElementById("daily-remark-form");
const dailyRemarkInput = document.getElementById("daily-remark-input");
const notSubmittedList = document.getElementById("not-submitted-list");
const submittedList = document.getElementById("submitted-list");
const submitButton = document.getElementById("submit-button");
const enrolledStudentsTableContainer = document.getElementById("enrolled-students-table-container");

// --- Global State ---
let currentDistrictSlug = null;
let currentSchoolId = null;
let currentSchoolName = null;
let allSchoolStudents = [];

// --- Constants ---
const STANDARD_MAP = {
    primary: Array.from({ length: 8 }, (_, i) => `Standard ${i + 1}`),
    secondary: ["Standard 9", "Standard 10"],
    'higher-secondary': ["Standard 11", "Standard 12"],
    college: Array.from({ length: 4 }, (_, i) => `Year ${i + 1}`)
};

// --- Authentication ---
async function checkAuthStatus() {
    try {
        const response = await fetch('../api/auth.php?action=status');
        const data = await response.json();
        
        if (response.ok && data.status === 'logged_in') {
            userInfo.textContent = `Logged in as: ${data.user.email}`;
            
            // Fetch school info using the DISE code from the user session
            const diasCode = data.user.school_dias_code;
            if (!diasCode) {
                schoolInfo.textContent = "Error: Non-school account detected.";
                return;
            }

            const sResp = await fetch(`../api/data.php?action=school_info&diasCode=${diasCode}`);
            const schoolData = await sResp.json();
            
            if (schoolData.error) {
                schoolInfo.textContent = "Error: School details not found for this account.";
                return;
            }
            
            currentDistrictSlug = schoolData.district_slug;
            currentSchoolId = schoolData.dias_code;
            currentSchoolName = schoolData.name;
            await loadDashboardData();
            setupCollapsibles();
        } else {
            window.location.href = "login.html";
        }
    } catch (e) {
        window.location.href = "login.html";
    }
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
    };
}

// --- UI Helper Functions ---
function populateStandardDropdown(levelDropdown, standardDropdown, selectedLevel = '') {
    const level = selectedLevel || levelDropdown.value;
    standardDropdown.innerHTML = '<option value="">Select Standard/Year</option>';
    if (level && STANDARD_MAP[level]) {
        STANDARD_MAP[level].forEach(std => {
            standardDropdown.add(new Option(std, std));
        });
    }
}

function getLevelForStandard(standard) {
    for (const level in STANDARD_MAP) {
        if (STANDARD_MAP[level].includes(standard)) return level;
    }
    return '';
}

function setupCollapsibles() {
    document.querySelectorAll(".collapsible-button").forEach(button => {
        button.addEventListener("click", function() {
            const container = this.closest('.collapsible-container');
            const content = container.querySelector('.collapsible-content');
            const icon = this.querySelector('.icon');
            const isHidden = content.style.display === "none" || !content.style.display;
            content.style.display = isHidden ? "block" : "none";
            if (icon) icon.textContent = isHidden ? "-" : "+";
        });
    });
}

function setupEventListeners() {
    logoutButton.addEventListener("click", async () => {
        await fetch('../api/auth.php?action=logout');
        window.location.href = "login.html";
    });

    studentLevelInput.addEventListener('change', () => populateStandardDropdown(studentLevelInput, studentStandardInput));

    addStudentForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const studentData = {
            name: document.getElementById("student-name-input").value.trim(),
            standard: document.getElementById("student-standard-input").value.trim(),
            bus_number: document.getElementById("bus-number-input").value.trim(),
            bus_pass_number: document.getElementById("bus-pass-number-input").value.trim(),
            bus_time_morning: document.getElementById("bus-time-morning-input").value.trim(),
            bus_time_evening: document.getElementById("bus-time-evening-input").value.trim(),
            school_dias_code: currentSchoolId,
            districtSlug: currentDistrictSlug
        };

        try {
            const resp = await fetch('../api/add_student.php', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(studentData)
            });
            if (resp.ok) {
                alert("Student added successfully!");
                addStudentForm.reset();
                await loadDashboardData();
            }
        } catch (error) {
            alert("Failed to add student.");
        }
    });

    dailyRemarkForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const remarkText = dailyRemarkInput.value.trim();
        if (!remarkText) return;

        try {
            const resp = await fetch('../api/submit.php?action=remark', {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({
                    schoolCode: currentSchoolId,
                    remark: remarkText
                })
            });
            if (resp.ok) {
                alert("Daily remark submitted!");
                dailyRemarkInput.disabled = true;
                dailyRemarkForm.querySelector("button").disabled = true;
            }
        } catch (error) {
            alert("Failed to submit remark.");
        }
    });
}

async function loadDashboardData() {
    schoolInfo.textContent = `District: ${currentDistrictSlug} | School: ${currentSchoolName}`;
    const today = new Date().toISOString().split('T')[0];
    
    const [stResp, subResp, remResp] = await Promise.all([
        fetch(`../api/data.php?action=students&schoolCode=${currentSchoolId}`),
        fetch(`../api/data.php?action=daily_submissions&date=${today}`),
        fetch(`../api/data.php?action=daily_remarks&date=${today}`)
    ]);
    
    allSchoolStudents = await stResp.json();
    const todaysSubmissions = (await subResp.json()).filter(s => s.school_dias_code === currentSchoolId);
    const todaysRemarks = await remResp.json();
    const schoolRemark = todaysRemarks.find(r => r.school_dias_code === currentSchoolId);

    const submittedStudentIds = new Set(todaysSubmissions.map(s => s.student_id));

    if (schoolRemark) {
        // Entire school is under remark
        totalStudentsEl.textContent = allSchoolStudents.length;
        submittedTodayEl.textContent = allSchoolStudents.length;
        pendingUpdateEl.textContent = 0;
        
        dailyRemarkInput.value = schoolRemark.remark;
        dailyRemarkInput.disabled = true;
        dailyRemarkForm.querySelector("button").disabled = true;

        renderStudentTable('not-submitted', []);
        renderStudentTable('submitted', todaysSubmissions); 
        // Note: Individual submissions still show if they exist, but the "Pending" is 0
    } else {
        totalStudentsEl.textContent = allSchoolStudents.length;
        submittedTodayEl.textContent = todaysSubmissions.length;
        pendingUpdateEl.textContent = Math.max(0, allSchoolStudents.length - todaysSubmissions.length);

        renderStudentTable('not-submitted', allSchoolStudents.filter(s => !submittedStudentIds.has(s.id)));
        renderStudentTable('submitted', todaysSubmissions);
    }
    
    renderEnrolledStudentsTable(allSchoolStudents);
}

function renderStudentTable(type, data) {
    const container = type === 'not-submitted' ? notSubmittedList : submittedList;
    container.innerHTML = '';
    
    if (type === 'not-submitted') {
        submitButton.style.display = data.length > 0 ? 'block' : 'none';
    }

    if (data.length === 0) {
        container.innerHTML = `<p>${type === 'not-submitted' ? 'All students updated for today.' : 'No submissions yet.'}</p>`;
        return;
    }

    const table = document.createElement('table');
    table.className = 'students-table';
    const headers = type === 'not-submitted' ? ["Name", "Standard", "Traveling", "Not Traveling", "Remarks"] : ["Name", "Standard", "Status", "Time", "Remarks"];
    table.innerHTML = `<thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    data.forEach(item => {
        const row = tbody.insertRow();
        if (type === 'not-submitted') {
            row.dataset.studentId = item.id;
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.standard || 'N/A'}</td>
                <td><input type="checkbox" class="t-cb"></td>
                <td><input type="checkbox" class="nt-cb"></td>
                <td><input type="text" class="r-in"></td>
            `;
        } else {
            row.innerHTML = `<td>${item.student_name}</td><td>${item.standard || 'N/A'}</td><td>${item.traveling_bus ? 'Traveling' : 'Not Traveling'}</td><td>${item.submission_timestamp}</td><td>${item.remarks || ''}</td>`;
        }
    });
    container.appendChild(table);
}

submitButton.addEventListener('click', async () => {
    const rows = notSubmittedList.querySelectorAll('tbody tr');
    const updates = [];
    rows.forEach(row => {
        const t = row.querySelector('.t-cb').checked;
        const nt = row.querySelector('.nt-cb').checked;
        if (t || nt) {
            updates.push({
                studentId: row.dataset.studentId,
                traveling_bus: t,
                not_traveling_bus: nt,
                remarks: row.querySelector('.r-in').value
            });
        }
    });

    if (updates.length > 0) {
        const resp = await fetch('../api/submit.php', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ updates })
        });
        if (resp.ok) {
            alert("Statuses updated!");
            await loadDashboardData();
        }
    }
});

function renderEnrolledStudentsTable(students) {
    enrolledStudentsTableContainer.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'students-table';
    table.innerHTML = `<thead><tr><th>Name</th><th>Standard</th><th>Bus Route</th><th>Actions</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    students.forEach(s => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${s.name}</td><td>${s.standard}</td><td>${s.bus_number || 'N/A'}</td><td><button onclick="confirm('Delete?') && deleteStudent(${s.id})">Delete</button></td>`;
    });
    enrolledStudentsTableContainer.appendChild(table);
}

setupEventListeners();
checkAuthStatus();
