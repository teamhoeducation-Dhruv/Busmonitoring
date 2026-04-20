// --- DOM Elements ---
const userInfo = document.getElementById("user-info");
const logoutButton = document.getElementById("logout-button");
const totalStudentsEl = document.getElementById("total-students");
const travelingBusEl = document.getElementById("traveling-bus");
const notTravelingBusEl = document.getElementById("not-traveling-bus");
const notUpdatedEl = document.getElementById("not-updated");
const schoolFilter = document.getElementById("school-filter");
const studentsTableBody = document.getElementById("students-table-body");
const searchInput = document.getElementById("search-input");
const selectAllCheckbox = document.getElementById("select-all-checkbox");
const addStudentButton = document.getElementById('add-student-button');
const addStudentFormContainer = document.getElementById('add-student-form-container');
const addStudentForm = document.getElementById('add-student-form');
const studentSchoolSelector = document.getElementById('student-school-selector');
const studentNameInput = document.getElementById("student-name-input");
const studentStandardInput = document.getElementById("student-standard-input");
const saveButton = document.getElementById('save-button'); // Added if exists in HTML

let districtStudents = [];
let allDistrictSchools = [];
let currentDistrictSlug = null;
let isDataLoading = false; 

// --- Authentication ---
async function checkAuthStatus() {
    try {
        const response = await fetch('../api/auth.php?action=status');
        const data = await response.json();
        
        if (response.ok && data.status === 'logged_in' && data.user.role === 'district') {
            userInfo.textContent = `Logged in as: ${data.user.email}`;
            currentDistrictSlug = data.user.district_slug;
            
            if (!currentDistrictSlug) {
                alert("Error: No district associated with this account.");
                window.location.href = "login.html";
                return;
            }
            
            await loadDistrictData();
        } else {
            window.location.href = "login.html";
        }
    } catch (e) {
        console.error("Auth check failed", e);
        window.location.href = "login.html";
    }
}

function getHeaders() {
    return {
        'Content-Type': 'application/json',
        'X-CSRF-Token': sessionStorage.getItem('csrf_token') || ''
    };
}

// --- Event Listeners ---
logoutButton.addEventListener("click", async () => {
    await fetch('../api/auth.php?action=logout');
    window.location.href = "login.html";
});

schoolFilter.addEventListener('change', renderDashboard);
searchInput.addEventListener('input', renderDashboard);

selectAllCheckbox.addEventListener("change", () => {
    const checkboxes = studentsTableBody.querySelectorAll('.student-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
});

addStudentButton.addEventListener('click', () => {
    addStudentFormContainer.style.display = addStudentFormContainer.style.display === 'none' ? 'block' : 'none';
    addStudentButton.classList.toggle('active');
});

addStudentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const schoolData = studentSchoolSelector.value.split('|');
    const schoolCode = schoolData[0];
    const studentName = studentNameInput.value.trim();
    const studentStandard = studentStandardInput.value.trim();

    if (!schoolCode || !studentName || !studentStandard) {
        alert('Please fill out all required fields.');
        return;
    }

    try {
        const response = await fetch('../api/add_student.php', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                name: studentName,
                school_dias_code: schoolCode,
                standard: studentStandard,
                districtSlug: currentDistrictSlug
            })
        });
        
        const data = await response.json();
        if (response.ok) {
            alert('Student added successfully!');
            addStudentForm.reset();
            addStudentFormContainer.style.display = 'none';
            addStudentButton.classList.remove('active');
            await loadDistrictData();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Error adding student:', error);
        alert('Failed to add student: ' + error.message);
    }
});

if (saveButton) {
    saveButton.addEventListener('click', async () => {
        const rows = studentsTableBody.querySelectorAll('tr');
        const updates = [];
        
        rows.forEach(row => {
            const checkbox = row.querySelector('.student-checkbox');
            if (checkbox && checkbox.checked) {
                const studentId = checkbox.dataset.studentId;
                // Since this page might be for traveling/not-traveling status
                // We'll need to know which status to set. 
                // In the original district.js, it seems it just renders the table.
                // Let's assume there are radio buttons or checkboxes for status in the row.
                const traveling = row.querySelector('.traveling-radio')?.checked || false;
                const notTraveling = row.querySelector('.not-traveling-radio')?.checked || false;
                
                if (traveling || notTraveling) {
                    updates.push({
                        studentId: studentId,
                        traveling_bus: traveling,
                        not_traveling_bus: notTraveling
                    });
                }
            }
        });

        if (updates.length > 0) {
            try {
                const response = await fetch('../api/submit.php', {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ updates })
                });
                if (response.ok) {
                    alert('Status updated successfully!');
                    await loadDistrictData();
                }
            } catch (e) {
                alert('Update failed');
            }
        }
    });
}

// --- Data Loading ---
async function loadDistrictData() {
    if (!currentDistrictSlug || isDataLoading) return;
    isDataLoading = true;

    try {
        // Fetch Schools
        const sResp = await fetch(`../api/data.php?action=schools&districtSlug=${currentDistrictSlug}`);
        allDistrictSchools = await sResp.json();
        
        // Fetch Students
        const stResp = await fetch(`../api/data.php?action=students&districtSlug=${currentDistrictSlug}`);
        const loadedStudents = await stResp.json();
        
        districtStudents = loadedStudents.map(s => ({
            ...s,
            normalized_school_code: String(s.school_dias_code || '').trim().toLowerCase(),
            normalized_school_name: String(s.school_name || 'Unknown School').trim().toLowerCase(),
            normalized_student_name: String(s.name || '').trim().toLowerCase()
        }));

        populateSchoolFilter(allDistrictSchools);
        populateAddStudentSchoolSelector(allDistrictSchools);
        renderDashboard();

    } catch (error) {
        console.error("Error loading district data: ", error);
    } finally {
        isDataLoading = false;
    }
}

// --- UI Population ---
function populateSchoolFilter(schools) {
    const currentSelection = schoolFilter.value;
    schoolFilter.innerHTML = '<option value="all">All Schools</option>';
    schools.sort((a,b) => (a.name || '').localeCompare(b.name || '')).forEach(school => {
        const option = document.createElement('option');
        option.value = school.dias_code.toLowerCase();
        option.textContent = `${school.name} (${school.dias_code})`;
        schoolFilter.appendChild(option);
    });
    schoolFilter.value = currentSelection || 'all';
}

function populateAddStudentSchoolSelector(schools) {
    studentSchoolSelector.innerHTML = '<option value="">Select School</option>';
    schools.sort((a,b) => (a.name || '').localeCompare(b.name || '')).forEach(school => {
        const option = document.createElement('option');
        option.value = `${school.dias_code}|${school.name}`;
        option.textContent = `${school.name} (${school.dias_code})`;
        studentSchoolSelector.appendChild(option);
    });
}

// --- Dashboard Rendering ---
function renderDashboard() {
    const selectedSchool = schoolFilter.value;
    const searchTerm = searchInput.value.toLowerCase().trim();

    let filteredStudents = districtStudents;

    if (selectedSchool !== 'all') {
        filteredStudents = filteredStudents.filter(s => s.normalized_school_code === selectedSchool);
    }

    if (searchTerm) {
        filteredStudents = filteredStudents.filter(student =>
            student.normalized_student_name.includes(searchTerm) ||
            student.normalized_school_name.includes(searchTerm)
        );
    }
    
    selectAllCheckbox.checked = false;
    updateStats(filteredStudents);
    renderStudents(filteredStudents);
}

function updateStats(students) {
    let travelingCount = 0;
    let notTravelingCount = 0;

    students.forEach(student => {
        if (student.traveling_bus) travelingCount++;
        else if (student.not_traveling_bus) notTravelingCount++;
    });

    const totalStudents = students.length;
    const submittedCount = travelingCount + notTravelingCount;
    const notUpdatedCount = totalStudents - submittedCount;

    totalStudentsEl.textContent = totalStudents;
    travelingBusEl.textContent = travelingCount;
    notTravelingBusEl.textContent = notTravelingCount;
    notUpdatedEl.textContent = notUpdatedCount;
}

function renderStudents(students) {
    studentsTableBody.innerHTML = '';
    if (students.length === 0) {
        studentsTableBody.innerHTML = '<tr><td colspan="9">No student data available for this selection.</td></tr>';
        return;
    }

    students.forEach(student => {
        const row = document.createElement('tr');
        let status = '<span class="status-not-updated">Not Updated</span>';
        if (student.traveling_bus) status = '<span class="status-submitted">Traveling by Bus</span>';
        else if (student.not_traveling_bus) status = '<span class="status-not-submitted">Not Traveling</span>';

        row.innerHTML = `
            <td><input type="checkbox" class="student-checkbox" data-student-id="${student.id}"></td>
            <td>${student.school_name || 'Unknown School'} (${student.school_dias_code})</td>
            <td>${student.name || 'Unknown Student'}</td>
            <td>${student.standard || 'N/A'}</td>
            <td>${student.route || 'N/A'}</td>
            <td>${student.beneficiary_villages || 'N/A'}</td>
            <td>${student.address || 'N/A'}</td>
            <td>${status}</td>
            <td>${student.updated_at || 'N/A'}</td>
        `;
        studentsTableBody.appendChild(row);
    });
}

// Start Auth Check
checkAuthStatus();
