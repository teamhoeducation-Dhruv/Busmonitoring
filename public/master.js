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

// --- Performance Report DOM Elements ---
const performanceReportCollapsibleButton = document.getElementById('performance-report-collapsible-button');
const performanceReportCollapsibleContent = document.getElementById('performance-report-collapsible-content');
const performanceStartDate = document.getElementById('performance-start-date');
const performanceEndDate = document.getElementById('performance-end-date');
const generatePerformanceReportBtn = document.getElementById('generate-performance-report');
const downloadPerformanceReportBtn = document.getElementById('download-performance-report');
const performanceReportTableBody = document.getElementById('performance-report-table-body');

// --- Routemaster Report DOM Elements ---
const routemasterCollapsibleButton = document.getElementById('routemaster-collapsible-button');
const routemasterCollapsibleContent = document.getElementById('routemaster-collapsible-content');
const routemasterStartDate = document.getElementById('routemaster-start-date');
const routemasterEndDate = document.getElementById('routemaster-end-date');
const generateRouteMasterReportBtn = document.getElementById('generate-routemaster-report');
const downloadRouteMasterReportBtn = document.getElementById('download-routemaster-report');
const routemasterReportTableBody = document.getElementById('routemaster-report-table-body');

// --- Download Buttons ---
const downloadDailyLogBtn = document.getElementById("download-daily-log");
const downloadNotSubmittedBtn = document.getElementById("download-not-submitted");
const downloadDailyRemarksBtn = document.getElementById("download-daily-remarks");
const downloadStudentRemarksBtn = document.getElementById("download-student-remarks");
const downloadMasterStudentListBtn = document.getElementById("download-master-student-list");
const downloadMasterSchoolListBtn = document.getElementById('download-master-school-list');
const downloadDistrictSummaryBtn = document.getElementById('download-district-summary');
// --- Global State ---
let allEnrolledStudents = [];
let allSchools = [];
let currentDailySubmissions = [];
let currentDailyRemarks = [];
let currentStudentRemarks = [];
let currentPerformanceReportData = [];
let currentRouteMasterReportData = [];
let currentNotSubmittedSchools = [];
let currentCombinedSubmissions = []; // To track both real and virtual rows
let map = null;
let mapMarkers = [];

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

// Reporting Event Listeners
if(performanceReportCollapsibleButton) performanceReportCollapsibleButton.addEventListener('click', () => toggleCollapsible(performanceReportCollapsibleContent, performanceReportCollapsibleButton));
if(generatePerformanceReportBtn) generatePerformanceReportBtn.addEventListener('click', generatePerformanceReport);
if(downloadPerformanceReportBtn) downloadPerformanceReportBtn.addEventListener('click', downloadPerformanceReport);

if(routemasterCollapsibleButton) routemasterCollapsibleButton.addEventListener('click', () => toggleCollapsible(routemasterCollapsibleContent, routemasterCollapsibleButton));
if(generateRouteMasterReportBtn) generateRouteMasterReportBtn.addEventListener('click', generateRouteMasterReport);
if(downloadRouteMasterReportBtn) downloadRouteMasterReportBtn.addEventListener('click', downloadRouteMasterReport);

// Download Listeners
if(downloadDailyLogBtn) downloadDailyLogBtn.addEventListener('click', downloadDailySubmissionLog);
if(downloadNotSubmittedBtn) downloadNotSubmittedBtn.addEventListener('click', downloadNotSubmittedList);
if(downloadDailyRemarksBtn) downloadDailyRemarksBtn.addEventListener('click', downloadDailyRemarks);
if(downloadStudentRemarksBtn) downloadStudentRemarksBtn.addEventListener('click', downloadStudentRemarks);
if(downloadMasterStudentListBtn) downloadMasterStudentListBtn.addEventListener('click', downloadMasterStudentList);
if(downloadMasterSchoolListBtn) downloadMasterSchoolListBtn.addEventListener('click', downloadMasterSchoolList);
if(downloadDistrictSummaryBtn) downloadDistrictSummaryBtn.addEventListener('click', downloadDistrictSummary);

// --- Tracking Event Listeners ---
const liveTrackingBtn = document.getElementById('live-tracking-btn');
const trackingModal = document.getElementById('tracking-modal');
const closeModalBtn = document.querySelector('.close-modal');

if (liveTrackingBtn) {
    liveTrackingBtn.addEventListener('click', () => trackAllBuses());
}

if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
        trackingModal.style.display = 'none';
        if (map) {
            map.remove();
            map = null;
            mapMarkers = [];
        }
    });
}

window.addEventListener('click', (event) => {
    if (event.target === trackingModal) {
        trackingModal.style.display = 'none';
        if (map) {
            map.remove();
            map = null;
            mapMarkers = [];
        }
    }
});

// --- Data Loading ---
async function loadInitialData() {
    const baseUrl = '../api/data.php'; 
    const [stResp, scResp] = await Promise.all([
        fetch(`${baseUrl}?action=all_students`),
        fetch(`${baseUrl}?action=all_schools`)
    ]);
    
    if (!stResp.ok || !scResp.ok) {
        console.error("Failed to load initial data");
        return;
    }

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
    populateSchoolFilter('all', allEnrolledStudents, schoolFilter);
    populateDistrictFilter(allEnrolledStudents, allStudentsDistrictFilter);
    populateSchoolFilter('all', allEnrolledStudents, allStudentsSchoolFilter);
    
    // Explicitly set defaults to ensure "All" is selected
    districtFilter.value = 'all';
    schoolFilter.value = 'all';
    allStudentsDistrictFilter.value = 'all';
    allStudentsSchoolFilter.value = 'all';
    
    await applyAllFilters();
    renderAllStudentsTable();
}

async function applyAllFilters() {
    if (!allEnrolledStudents || allEnrolledStudents.length === 0) return; // Wait until data is loaded
    
    const selectedDate = datePicker.value || new Date().toISOString().split('T')[0];
    const baseUrl = '../api/data.php';

    const [subResp, remResp] = await Promise.all([
        fetch(`${baseUrl}?action=daily_submissions&date=${selectedDate}`),
        fetch(`${baseUrl}?action=daily_remarks&date=${selectedDate}`)
    ]);
    
    currentDailySubmissions = await subResp.json();
    currentDailyRemarks = await remResp.json();
    
    // Safety: ensure data is arrays
    if (!Array.isArray(currentDailySubmissions)) currentDailySubmissions = [];
    if (!Array.isArray(currentDailyRemarks)) currentDailyRemarks = [];

    const selectedDistrict = districtFilter.value;
    const selectedSchool = schoolFilter.value;
    const searchTerm = searchInput.value.toLowerCase();

    // 1. Filter submissions
    const filteredSubmissions = currentDailySubmissions.filter(s =>
        (selectedDistrict === 'all' || s.district_name === selectedDistrict) && 
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
    
    // Schools that submitted remarks
    const schoolsWithRemarks = new Set(currentDailyRemarks.map(r => r.school_dias_code));
    const schoolsWithSubmissions = new Set(currentDailySubmissions.map(s => s.school_dias_code));
    
    // Remark-only schools: submitted a remark but NO student data
    const remarkOnlySchoolIds = new Set([...schoolsWithRemarks].filter(id => !schoolsWithSubmissions.has(id)));
    
    const studentsUnderRemark = relevantStudents.filter(s => remarkOnlySchoolIds.has(s.school_dias_code));
    const notUpdated = Math.max(0, relevantStudents.length - submittedStudentIds.size - studentsUnderRemark.length);

    // Synthesis: Add "Virtual" submissions for students in remark-only schools 
    // so they show up in the table as "Submitted (Under Remark)"
    const virtualSubmissions = studentsUnderRemark.map(s => {
        const schoolRemark = currentDailyRemarks.find(r => r.school_dias_code === s.school_dias_code);
        const timeStr = schoolRemark ? new Date(schoolRemark.timestamp).toLocaleTimeString() : 'N/A';
        
        return {
            district_name: s.district,
            school_name: s.school_name,
            student_name: s.name,
            traveling_bus: null, 
            status_label: 'Under Remark',
            submission_timestamp: timeStr
        };
    });

    updateStats(relevantStudents.length, traveling, notTraveling, studentsUnderRemark.length, notUpdated);
    
    // Combine real submissions and virtual ones for global state
    currentCombinedSubmissions = [...filteredSubmissions, ...virtualSubmissions];
    renderSubmissions(currentCombinedSubmissions);
    
    // Logs
    currentStudentRemarks = filteredSubmissions.filter(s => s.remarks);
    renderStudentRemarksLog(currentStudentRemarks);
    filterAndRenderDailyRemarks(selectedDistrict, selectedSchool, currentDailyRemarks);

    // 3. Not submitted list
    const nsResp = await fetch(`../api/data.php?action=not_submitted_schools&date=${selectedDate}`);
    currentNotSubmittedSchools = await nsResp.json();
    renderNotSubmittedSchools(currentNotSubmittedSchools);
}

function updateStats(total, traveling, notTraveling, underRemark, notUpdated) {
    totalStudentsEl.textContent = total;
    travelingBusEl.textContent = traveling;
    notTravelingBusEl.textContent = notTraveling;
    studentsUnderRemarkEl.textContent = underRemark;
    notUpdatedEl.textContent = notUpdated;
}

function renderSubmissions(submissions) {
    if (!studentsTableBody) return;
    studentsTableBody.innerHTML = '';
    if (submissions.length === 0) {
        studentsTableBody.innerHTML = '<tr><td colspan="5">No data for selected filters.</td></tr>';
        return;
    }
    submissions.forEach(sub => {
        const row = studentsTableBody.insertRow();
        let statusHtml = '';
        if (sub.status_label === 'Under Remark') {
            statusHtml = '<span class="status-remark">Under Remark</span>';
        } else {
            statusHtml = sub.traveling_bus ? '<span class="status-submitted">Traveling</span>' : '<span class="status-not-submitted">Not Traveling</span>';
        }
        
        let trackBtnHtml = '';
        if (sub.bus_number || sub.busNo) {
            const busNo = sub.bus_number || sub.busNo;
            trackBtnHtml = `<button class="track-btn" onclick="window.trackIndividualBus('${busNo}')">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 0.9rem; height: 0.9rem;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>Track</button>`;
        }

        row.innerHTML = `<td>${sub.district_name || 'N/A'}</td><td>${sub.school_name}</td><td>${sub.student_name} ${trackBtnHtml}</td><td>${statusHtml}</td><td>${sub.submission_timestamp}</td>`;
    });
}

function renderAllStudentsTable() {
    const district = allStudentsDistrictFilter.value;
    const school = allStudentsSchoolFilter.value;
    const students = allEnrolledStudents.filter(s => (district === 'all' || s.district === district) && (school === 'all' || s.school_dias_code === school));

    // Update Summary Labels
    if (allStudentsTotalStudentsEl) allStudentsTotalStudentsEl.textContent = students.length;
    if (allStudentsTotalSchoolsEl) allStudentsTotalSchoolsEl.textContent = new Set(students.map(s => s.school_dias_code)).size;

    allStudentsTableBody.innerHTML = '';
    students.forEach(s => {
        const row = allStudentsTableBody.insertRow();
        row.innerHTML = `<td>${s.district}</td><td>${s.school_name}</td><td>${s.name}</td><td>${s.standard}</td>`;
    });
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

function renderNotSubmittedSchools(notSubmittedSchools) {
    if (!notSubmittedListContainer) return;
    notSubmittedListContainer.innerHTML = '';

    if (notSubmittedSchools.length === 0) {
        notSubmittedListContainer.innerHTML = '<p>All schools have submitted.</p>';
        return;
    }
    const byDistrict = notSubmittedSchools.reduce((acc, school) => {
        const district = school.district || 'Unknown';
        if (!acc[district]) acc[district] = [];
        acc[district].push(school);
        return acc;
    }, {});
    Object.keys(byDistrict).sort().forEach(district => {
        const schools = byDistrict[district];
        const group = document.createElement('div');
        group.className = 'district-group';
        group.innerHTML = `<div class="district-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">${district} <span class="count">(${schools.length})</span></div><ul style="display:none;">${schools.map(s => `<li>${s.name} (${s.id})</li>`).join('')}</ul>`;
        notSubmittedListContainer.appendChild(group);
    });
    
    renderDistrictSummary(notSubmittedSchools);
}

function renderStudentRemarksLog(submissions) {
    if (!remarksLogContainer) return;
    remarksLogContainer.innerHTML = '';
    if (submissions.length === 0) {
        remarksLogContainer.innerHTML = '<p>No student remarks for this date.</p>';
        return;
    }
    const table = document.createElement('table');
    table.className = 'remarks-table';
    table.innerHTML = `<thead><tr><th>Time</th><th>School</th><th>Student</th><th>Remark</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    submissions.forEach(sub => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${new Date(sub.submission_timestamp).toLocaleTimeString()}</td><td>${sub.school_name}</td><td>${sub.student_name}</td><td>${sub.remarks}</td>`;
    });
    remarksLogContainer.appendChild(table);
}

function renderDailyRemarksLog(remarks) {
    if (!dailyRemarksLogContainer) return;
    dailyRemarksLogContainer.innerHTML = '';
    if (remarks.length === 0) {
        dailyRemarksLogContainer.innerHTML = '<p>No daily school remarks for this date.</p>';
        return;
    }

    // Add Summary Box (from original Firebase code)
    const uniqueDistricts = new Set(remarks.map(r => r.district_id));
    const uniqueSchools = new Set(remarks.map(r => r.school_dias_code));
    const summaryBox = document.createElement('div');
    summaryBox.className = 'remarks-summary';
    summaryBox.innerHTML = `
        <div class="summary-item">Districts with Remarks: <strong>${uniqueDistricts.size}</strong></div>
        <div class="summary-item">Schools with Remarks: <strong>${uniqueSchools.size}</strong></div>
    `;
    dailyRemarksLogContainer.appendChild(summaryBox);

    const table = document.createElement('table');
    table.className = 'remarks-table';
    table.innerHTML = `<thead><tr><th>Time</th><th>School</th><th>Reason</th></tr></thead><tbody></tbody>`;
    const tbody = table.querySelector('tbody');
    remarks.forEach(r => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${new Date(r.timestamp).toLocaleTimeString()}</td><td>${r.school_name} (${r.school_dias_code})</td><td>${r.remark}</td>`;
    });
    dailyRemarksLogContainer.appendChild(table);
}

function filterAndRenderDailyRemarks(district, school, remarks) {
    let filtered = remarks;
    if (district !== 'all') filtered = filtered.filter(r => r.district_name === district); 
    if (school !== 'all') filtered = filtered.filter(r => r.school_dias_code === school);
    renderDailyRemarksLog(filtered);
}

function renderDistrictSummary(notSubmittedSchools) {
    if (!districtSummaryList) return;
    districtSummaryList.innerHTML = '';

    const byDistrict = notSubmittedSchools.reduce((acc, school) => {
        const district = school.district || 'Unknown';
        acc[district] = (acc[district] || 0) + 1;
        return acc;
    }, {});

    const table = document.createElement('table');
    table.className = 'summary-table';
    table.innerHTML = '<thead><tr><th>District</th><th>Not Submitted Count</th></tr></thead><tbody></tbody>';
    const tbody = table.querySelector('tbody');

    Object.keys(byDistrict).sort().forEach(district => {
        const row = tbody.insertRow();
        row.innerHTML = `<td>${district}</td><td>${byDistrict[district]}</td>`;
    });
    districtSummaryList.appendChild(table);
}

// --- Reports ---
async function generatePerformanceReport() {
    const start = performanceStartDate.value;
    const end = performanceEndDate.value;
    if (!start || !end) return alert('Select range');

    performanceReportTableBody.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
    const resp = await fetch(`../api/data.php?action=performance_report&startDate=${start}&endDate=${end}`);
    currentPerformanceReportData = await resp.json();
    renderPerformanceReport();
}

function renderPerformanceReport() {
    performanceReportTableBody.innerHTML = '';
    currentPerformanceReportData.forEach(d => {
        const rate = d.total_days > 0 ? ((d.days_submitted / d.total_days) * 100).toFixed(1) : 0;
        const row = performanceReportTableBody.insertRow();
        row.innerHTML = `<td>${d.district_name}</td><td>${d.school_name}</td><td>${d.total_days}</td><td>${d.days_submitted}</td><td>${d.days_not_submitted}</td><td>${rate}%</td><td>${d.remarks_only_days}</td>`;
    });
}

async function generateRouteMasterReport() {
    const start = routemasterStartDate.value;
    const end = routemasterEndDate.value;
    if (!start || !end) return alert('Select range');

    routemasterReportTableBody.innerHTML = '<tr><td colspan="3">Loading...</td></tr>';
    const resp = await fetch(`../api/data.php?action=routemaster_report&startDate=${start}&endDate=${end}`);
    currentRouteMasterReportData = await resp.json();
    renderRouteMasterReport();
}

function renderRouteMasterReport() {
    routemasterReportTableBody.innerHTML = '';
    currentRouteMasterReportData.forEach(d => {
        const row = routemasterReportTableBody.insertRow();
        row.innerHTML = `<td>${d.route || 'N/A'}</td><td>${d.traveling}</td><td>${d.not_traveling}</td>`;
    });
}

// --- Downloads ---
function downloadCSV(data, filename, header = null) {
    let csv = Papa.unparse(data);
    if (header) {
        csv = header + '\r\n' + csv;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
}

function downloadDailySubmissionLog() {
    if (!currentCombinedSubmissions.length) return alert('No data');
    const header = `Report Date: ${datePicker.value}`;
    const data = currentCombinedSubmissions.map(s => ({
        Date: s.date || datePicker.value,
        District: s.district_name,
        School: s.school_name,
        Student: s.student_name,
        Status: s.status_label || (s.traveling_bus ? 'Traveling' : 'Not Traveling'),
        Time: s.submission_timestamp
    }));
    downloadCSV(data, `Daily_Log_${datePicker.value}.csv`, header);
}

function downloadNotSubmittedList() {
    if (!currentNotSubmittedSchools.length) return alert('No data');
    const header = `Report Date: ${datePicker.value}`;
    downloadCSV(currentNotSubmittedSchools, `Not_Submitted_${datePicker.value}.csv`, header);
}

function downloadDailyRemarks() {
    if (!currentDailyRemarks.length) return alert('No data');
    const header = `Report Date: ${datePicker.value}`;
    downloadCSV(currentDailyRemarks, `Daily_Remarks_${datePicker.value}.csv`, header);
}

function downloadStudentRemarks() {
    const remarks = currentDailySubmissions.filter(s => s.remarks);
    if (!remarks.length) return alert('No data');
    const header = `Report Date: ${datePicker.value}`;
    downloadCSV(remarks, `Student_Remarks_${datePicker.value}.csv`, header);
}

function downloadMasterStudentList() {
    downloadCSV(allEnrolledStudents, 'Master_Student_List.csv');
}

function downloadMasterSchoolList() {
    downloadCSV(allSchools, 'Master_School_List.csv');
}

function downloadDistrictSummary() {
    const summary = Array.from(districtSummaryList.querySelectorAll('tr')).slice(1).map(tr => ({
        District: tr.cells[0].innerText,
        Count: tr.cells[1].innerText
    }));
    downloadCSV(summary, `District_Summary_${datePicker.value}.csv`);
}

function downloadPerformanceReport() {
    if (!currentPerformanceReportData.length) return alert('Generate report first');
    const header = `Report Period: ${performanceStartDate.value} to ${performanceEndDate.value}`;
    downloadCSV(currentPerformanceReportData, `Performance_Report_${performanceStartDate.value}_to_${performanceEndDate.value}.csv`, header);
}

function downloadRouteMasterReport() {
    if (!currentRouteMasterReportData.length) return alert('Generate report first');
    const header = `Routewise Travel Log from ${routemasterStartDate.value} to ${routemasterEndDate.value}`;
    downloadCSV(currentRouteMasterReportData, `Routewise_Report_${routemasterStartDate.value}_to_${routemasterEndDate.value}.csv`, header);
}

// --- Tracking Functions ---
async function initMap(lat, lng, zoom = 12) {
    if (map) {
        map.remove();
        map = null;
    }
    
    map = L.map('map-container').setView([lat, lng], zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    mapMarkers = [];
}

window.trackIndividualBus = async function(busNo) {
    const trackingModal = document.getElementById('tracking-modal');
    const modalTitle = document.getElementById('modal-title');
    const trackingInfo = document.getElementById('tracking-info');
    
    modalTitle.textContent = `Tracking Bus: ${busNo}`;
    trackingModal.style.display = 'block';
    trackingInfo.style.display = 'none';
    
    // Show loading state in map
    const container = document.getElementById('map-container');
    container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#64748b;">Fetching live location...</div>';

    try {
        const response = await fetch(`../api/tracking.php?action=get_location&bus_no=${encodeURIComponent(busNo)}`);
        const data = await response.json();
        
        if (!response.ok || !data || data.length === 0) {
            container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#ef4444;">${data.error || 'Live location not available for this bus.'}</div>`;
            return;
        }

        // Response is an array, take first element
        const vehicle = data[0];
        const lat = parseFloat(vehicle.lattitude);
        const lng = parseFloat(vehicle.longitude);

        if (isNaN(lat) || isNaN(lng)) {
            container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#ef4444;">Invalid GPS coordinates received.</div>`;
            return;
        }

        container.innerHTML = ''; // Clear loading
        await initMap(lat, lng, 15);

        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`
            <b>Bus No:</b> ${vehicle.busNo || busNo}<br>
            <b>Vehicle No:</b> ${vehicle.vehicleNo}<br>
            <b>Location:</b> ${vehicle.location}<br>
            <b>Speed:</b> ${vehicle.speed} km/h<br>
            <b>Status:</b> ${vehicle.running === "1" ? "Running" : "Idle"}
        `).openPopup();
        
        // Show info panel
        trackingInfo.style.display = 'block';
        trackingInfo.innerHTML = `
            <div class="info-grid">
                <div class="info-item"><label>Last Updated</label><span>${vehicle.receivedDate}</span></div>
                <div class="info-item"><label>Speed</label><span>${vehicle.speed} km/h</span></div>
                <div class="info-item"><label>Location</label><span>${vehicle.location}</span></div>
                <div class="info-item"><label>Route</label><span>${vehicle.routename || 'N/A'}</span></div>
            </div>
        `;

    } catch (e) {
        console.error("Tracking Error:", e);
        container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#ef4444;">A connection error occurred.</div>';
    }
};

async function trackAllBuses() {
    const trackingModal = document.getElementById('tracking-modal');
    const modalTitle = document.getElementById('modal-title');
    const trackingInfo = document.getElementById('tracking-info');
    
    modalTitle.textContent = `All Active Buses - Live View`;
    trackingModal.style.display = 'block';
    trackingInfo.style.display = 'none';
    
    const container = document.getElementById('map-container');
    container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#64748b;">Scanning for all active buses...</div>';

    try {
        const response = await fetch(`../api/tracking.php?action=get_all_active&date=${datePicker.value}`);
        const vehicles = await response.json();
        
        if (!response.ok || !Array.isArray(vehicles) || vehicles.length === 0) {
            container.innerHTML = `<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#64748b;">No active buses found with GPS data for this date.</div>`;
            return;
        }

        container.innerHTML = ''; // Clear loading
        
        // Find center of all buses or use a default (Gujarat center)
        let totalLat = 0, totalLng = 0, count = 0;
        vehicles.forEach(v => {
            const lat = parseFloat(v.lattitude);
            const lng = parseFloat(v.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                totalLat += lat;
                totalLng += lng;
                count++;
            }
        });

        const startLat = count > 0 ? (totalLat / count) : 22.2587;
        const startLng = count > 0 ? (totalLng / count) : 71.1924;
        
        await initMap(startLat, startLng, 8);

        vehicles.forEach(v => {
            const lat = parseFloat(v.lattitude);
            const lng = parseFloat(v.longitude);
            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng]).addTo(map);
                marker.bindPopup(`
                    <b>Bus No:</b> ${v.busNo}<br>
                    <b>Vehicle No:</b> ${v.vehicleNo}<br>
                    <b>Speed:</b> ${v.speed} km/h<br>
                    <b>Depot:</b> ${v.depotname}<br>
                    <button class="track-btn" style="margin-top:5px; width:100%;" onclick="window.trackIndividualBus('${v.vehicleNo}')">View Details</button>
                `);
                mapMarkers.push(marker);
            }
        });
        
        if (count > 1) {
            const bounds = L.latLngBounds(vehicles.map(v => [parseFloat(v.lattitude), parseFloat(v.longitude)]).filter(p => !isNaN(p[0])));
            map.fitBounds(bounds, { padding: [50, 50] });
        }

    } catch (e) {
        console.error("Global Tracking Error:", e);
        container.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; background:#f1f5f9; color:#ef4444;">Failed to fetch fleet data.</div>';
    }
}

checkAuthStatus();
