// --- DOM Elements ---
const userInfo = document.getElementById("user-info");
const logoutButton = document.getElementById("logout-button");
const totalStudentsEl = document.getElementById("total-students");
const travelingBusEl = document.getElementById("traveling-bus");
const notTravelingBusEl = document.getElementById("not-traveling-bus");
const studentsUnderRemarkEl = document.getElementById("students-under-remark");
const notUpdatedEl = document.getElementById("not-updated");
const studentsTableBody = document.getElementById("students-table-body");
const searchInput = document.getElementById("search-input");
const remarksLogContainer = document.getElementById("remarks-log");
const dailyRemarksLogContainer = document.getElementById("daily-remarks-log");
const datePicker = document.getElementById("date-picker");
const districtFilter = document.getElementById("district-filter");
const schoolFilter = document.getElementById("school-filter");

const collapsibleButton = document.getElementById("collapsible-button");
const collapsibleContent = document.getElementById("collapsible-content");
const allStudentsTableBody = document.getElementById("all-students-table-body");
const allStudentsDistrictFilter = document.getElementById("all-students-district-filter");
const allStudentsSchoolFilter = document.getElementById("all-students-school-filter");
const allStudentsTotalStudentsEl = document.getElementById('all-students-total-students');
const allStudentsTotalSchoolsEl = document.getElementById('all-students-total-schools');

const notSubmittedCollapsibleButton = document.getElementById('not-submitted-collapsible-button');
const notSubmittedCollapsibleContent = document.getElementById('not-submitted-collapsible-content');
const notSubmittedListContainer = document.getElementById('not-submitted-list');

const districtSummaryCollapsibleButton = document.getElementById('district-summary-collapsible-button');
const districtSummaryCollapsibleContent = document.getElementById('district-summary-collapsible-content');
const districtSummaryList = document.getElementById('district-summary-list');

// --- Global State ---
let allEnrolledStudents = [];
let allSchools = [];
let currentDailySubmissions = [];
let currentDailyRemarks = [];
let currentStudentRemarks = [];

// --- Authentication ---
async function checkAuthStatus() {
    try {
        const response = await fetch('../api/auth.php?action=status');
        const data = await response.json();
        
        if (response.ok && data.status === 'logged_in' && data.user.role === 'admin') {
            userInfo.textContent = `Logged in as: ${data.user.email}`;
            if (datePicker) datePicker.value = new Date().toISOString().split('T')[0];
            await loadInitialData();
        } else {
            window.location.href = "login.html";
        }
    } catch (e) {
        window.location.href = "login.html";
    }
}

// --- Event Listeners ---
logoutButton.addEventListener("click", async () => {
    await fetch('../api/auth.php?action=logout');
    window.location.href = "login.html";
});

datePicker.addEventListener('change', applyAllFilters);
districtFilter.addEventListener('change', () => { populateSchoolFilter(districtFilter.value, allEnrolledStudents, schoolFilter); applyAllFilters(); });
schoolFilter.addEventListener('change', applyAllFilters);
searchInput.addEventListener('input', applyAllFilters);
allStudentsDistrictFilter.addEventListener('change', () => { populateSchoolFilter(allStudentsDistrictFilter.value, allEnrolledStudents, allStudentsSchoolFilter); renderAllStudentsTable(); });
allStudentsSchoolFilter.addEventListener('change', renderAllStudentsTable);

if(collapsibleButton) collapsibleButton.addEventListener('click', () => toggleCollapsible(collapsibleContent, collapsibleButton));
if(notSubmittedCollapsibleButton) notSubmittedCollapsibleButton.addEventListener('click', () => toggleCollapsible(notSubmittedCollapsibleContent, notSubmittedCollapsibleButton));
if(districtSummaryCollapsibleButton) districtSummaryCollapsibleButton.addEventListener('click', () => toggleCollapsible(districtSummaryCollapsibleContent, districtSummaryCollapsibleButton));

// --- Data Loading ---
async function loadInitialData() {
    const [stResp, scResp] = await Promise.all([
        fetch('../api/data.php?action=all_students'),
        fetch('../api/data.php?action=all_schools')
    ]);
    
    allEnrolledStudents = await stResp.json();
    allSchools = await scResp.json();
    
    // Standardize attributes for frontend logic
    allEnrolledStudents = allEnrolledStudents.map(s => ({
        ...s,
        district: s.district_name,
    }));
    
    allSchools = allSchools.map(s => ({
        ...s,
        district: s.district_name,
    }));

    populateDistrictFilter(allEnrolledStudents, districtFilter);
    populateDistrictFilter(allEnrolledStudents, allStudentsDistrictFilter);
    
    applyAllFilters();
    renderAllStudentsTable();
}

async function applyAllFilters() {
    const selectedDate = datePicker.value;
    const [subResp, remResp] = await Promise.all([
        fetch(`../api/data.php?action=daily_submissions&date=${selectedDate}`),
        fetch(`../api/data.php?action=daily_remarks&date=${selectedDate}`)
    ]);
    
    currentDailySubmissions = await subResp.json();
    currentDailyRemarks = await remResp.json();

    const selectedDistrict = districtFilter.value;
    const selectedSchool = schoolFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    // 1. Filter submissions
    const filteredSubmissions = currentDailySubmissions.filter(s =>
        (selectedDistrict === 'all' || String(s.district_id) === selectedDistrict) && 
        (selectedSchool === 'all' || s.school_dias_code === selectedSchool) &&
        (!searchTerm || s.student_name?.toLowerCase().includes(searchTerm))
    );

    let traveling = 0, notTraveling = 0;
    filteredSubmissions.forEach(s => s.traveling_bus ? traveling++ : notTraveling++);

    // 2. Stats and tables
    const relevantStudents = allEnrolledStudents.filter(s =>
        (selectedDistrict === 'all' || s.district === selectedDistrict) &&
        (selectedSchool === 'all' || s.school_dias_code === selectedSchool)
    );
    
    const submittedStudentIds = new Set(filteredSubmissions.map(s => s.student_id));
    const notUpdated = Math.max(0, relevantStudents.length - submittedStudentIds.size);

    updateStats(relevantStudents.length, traveling, notTraveling, 0, notUpdated);
    renderSubmissions(filteredSubmissions);
    renderNotSubmittedSchools();
}

function updateStats(total, traveling, notTraveling, underRemark, notUpdated) {
    totalStudentsEl.textContent = total;
    travelingBusEl.textContent = traveling;
    notTravelingBusEl.textContent = notTraveling;
    studentsUnderRemarkEl.textContent = underRemark;
    notUpdatedEl.textContent = notUpdated;
}

function renderSubmissions(submissions) {
    studentsTableBody.innerHTML = '';
    submissions.forEach(sub => {
        const row = studentsTableBody.insertRow();
        row.innerHTML = `<td>${sub.district_id}</td><td>${sub.school_name}</td><td>${sub.student_name}</td><td>${sub.traveling_bus ? 'Traveling' : 'Not Traveling'}</td><td>${sub.submission_timestamp}</td>`;
    });
}

function renderNotSubmittedSchools() {
    notSubmittedListContainer.innerHTML = '<p>Check historical reports for detailed nonsubmission list.</p>';
}

function toggleCollapsible(content, header) {
    const isHidden = content.style.display === 'none' || !content.style.display;
    content.style.display = isHidden ? 'block' : 'none';
}

function populateDistrictFilter(list, element) {
    const districts = [...new Set(list.map(s => s.district).filter(Boolean))].sort();
    element.innerHTML = '<option value="all">All Districts</option>';
    districts.forEach(d => element.add(new Option(d, d)));
}

function populateSchoolFilter(district, list, element) {
    const schools = [...new Set(list.filter(s => (district === 'all' || s.district === district)).map(s => `${s.school_name}|${s.school_dias_code}`))].sort();
    element.innerHTML = '<option value="all">All Schools</option>';
    schools.forEach(s => {
        const [name, dias] = s.split('|');
        element.add(new Option(`${name} (${dias})`, dias));
    });
}

function renderAllStudentsTable() {
    const district = allStudentsDistrictFilter.value;
    const school = allStudentsSchoolFilter.value;
    const students = allEnrolledStudents.filter(s => (district === 'all' || s.district === district) && (school === 'all' || s.school_dias_code === school));

    allStudentsTableBody.innerHTML = '';
    students.forEach(s => {
        const row = allStudentsTableBody.insertRow();
        row.innerHTML = `<td>${s.district}</td><td>${s.school_name}</td><td>${s.name}</td><td>${s.standard}</td>`;
    });
}

checkAuthStatus();
