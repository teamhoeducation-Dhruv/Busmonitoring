import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, getDocs, getDoc, doc, setDoc, writeBatch } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

// --- Firebase and Chart.js Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyCoMoMKUwuDW_9ZmfwuyWRhKBaWDCb0UJg",
    authDomain: "cotd-survey-b19cf.firebaseapp.com",
    projectId: "cotd-survey-b19cf",
    storageBucket: "cotd-survey-b19cf.appspot.com",
    messagingSenderId: "1046494039326",
    appId: "1:1046494039326:web:54477d764d528bf52c8d0f",
    measurementId: "G-7YXL7CZLGL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
Chart.register(ChartDataLabels);

// --- Constants and DOM Elements ---
const ADMIN_EMAILS = ["master1@cotd.com", "master2@cotd.com"];
const notSubmittedList = document.getElementById('not-submitted-list');
const submittedList = document.getElementById('submitted-list');
const adminContainer = document.getElementById('admin-container');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');
const adminTab = document.getElementById('admin-tab');
const districtTab = document.querySelector('[data-tab="district-dashboard"]');
const tabs = document.querySelectorAll('.tab-link');
const tabContents = document.querySelectorAll('.tab-content');
const districtFilterSelect = document.getElementById('district-filter-select');
const filterButton = document.getElementById('filter-button');
const clearFilterButton = document.getElementById('clear-filter-button');
const exportExcelButton = document.getElementById('export-excel-button');
const schoolFilters = document.getElementById('school-filters');
const schoolFilterSelect = document.getElementById('school-filter-select');
const schoolFilterButton = document.getElementById('school-filter-button');
const schoolClearFilterButton = document.getElementById('school-clear-filter-button');
const excelFileInput = document.getElementById('excel-file-input');
const uploadDataButton = document.getElementById('upload-data-button');
const uploadStatus = document.getElementById('upload-status');
const submitButton = document.getElementById('submit-button');
const toggleSubmittedButton = document.getElementById('toggle-submitted-button');

// --- Authentication Logic ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userInfo.textContent = `Logged in as: ${user.email}`;
        const userIsAdmin = ADMIN_EMAILS.includes(user.email);
        
        adminTab.style.display = userIsAdmin ? 'block' : 'none';
        districtTab.style.display = userIsAdmin ? 'none' : 'block';
        document.getElementById('admin-dashboard-controls').style.display = userIsAdmin ? 'flex' : 'none';

        [...tabs, ...tabContents].forEach(el => el.classList.remove('active'));
        const activeTab = userIsAdmin ? adminTab : districtTab;
        const activeContent = document.getElementById(activeTab.dataset.tab);
        activeTab.classList.add('active');
        if (activeContent) activeContent.classList.add('active');

        if (userIsAdmin) {
            await displayAllDistricts();
            await populateDistrictFilter();
        } else {
            const districtId = user.email.split('@')[0].toLowerCase();
            await displayStudentsForDistrict(districtId);
        }
    } else {
        window.location.href = "login.html";
    }
});

// --- Event Listeners ---
logoutButton.addEventListener('click', () => signOut(auth));

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === tab.dataset.tab) {
                content.classList.add('active');
            }
        });
    });
});

filterButton.addEventListener('click', () => {
    const selectedDistrict = districtFilterSelect.value;
    displayAllDistricts(selectedDistrict);
});

clearFilterButton.addEventListener('click', () => {
    districtFilterSelect.value = "";
    displayAllDistricts();
});

excelFileInput.addEventListener('change', () => {
    uploadDataButton.disabled = !excelFileInput.files.length;
});

uploadDataButton.addEventListener('click', async () => {
    const file = excelFileInput.files[0];
    if (!file) return alert("Please select an Excel file.");

    uploadDataButton.disabled = true;
    uploadDataButton.textContent = 'Uploading...';
    uploadStatus.textContent = 'Preparing to upload...';

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            await populateFirestore(jsonData);
        } catch (error) {
            console.error("Error processing file:", error);
            uploadStatus.textContent = `Error: ${error.message}`;
            alert(`An error occurred while processing the file: ${error.message}`);
        } finally {
            uploadDataButton.disabled = false;
            uploadDataButton.textContent = 'Upload Data';
            excelFileInput.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
});

schoolFilterButton.addEventListener('click', () => {
    if (!auth.currentUser) return;
    const districtId = auth.currentUser.email.split('@')[0].toLowerCase();
    const selectedSchool = schoolFilterSelect.value;
    displayStudentsForDistrict(districtId, selectedSchool);
});

schoolClearFilterButton.addEventListener('click', () => {
    if (!auth.currentUser) return;
    const districtId = auth.currentUser.email.split('@')[0].toLowerCase();
    schoolFilterSelect.value = "";
    displayStudentsForDistrict(districtId);
});

exportExcelButton.addEventListener('click', exportToExcel);

toggleSubmittedButton.addEventListener('click', () => {
    const submittedContainer = document.getElementById('submitted-students-container');
    submittedContainer.classList.toggle('hidden');
    const isHidden = submittedContainer.classList.contains('hidden');
    toggleSubmittedButton.textContent = isHidden ? 'Show Submitted' : 'Hide Submitted';
});

// --- Firestore Data Population (Settings for Fresh Quota) ---
async function populateFirestore(data) {
    const totalRows = data.length;
    uploadStatus.textContent = `Processing ${totalRows} rows...`;
    const BATCH_SIZE = 150;
    const DELAY_BETWEEN_BATCHES = 2000;

    let processedRows = 0;
    for (let i = 0; i < totalRows; i += BATCH_SIZE) {
        const chunk = data.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        let operationsInBatch = 0;

        chunk.forEach(row => {
            const districtName = String(row['District'] || '').trim();
            const studentName = String(row['વિદ્યાર્થીનું નામ'] || '').trim();
            const schoolDiasCode = String(row['શાળાનો ડાયસ કોડ'] || '').trim();

            if (!districtName || !studentName || !schoolDiasCode) return;

            const districtId = districtName.toLowerCase().replace(/\s+/g, '_');

            // District Document
            const districtRef = doc(db, `districts/${districtId}`);
            batch.set(districtRef, { name: districtName }, { merge: true });

            // School Document
            const schoolRef = doc(db, `districts/${districtId}/schools`, schoolDiasCode);
            batch.set(schoolRef, {
                name: String(row['શાળાનું નામ'] || '').trim(),
                district: districtId,
                principal_name: String(row['આચાર્યનું નામ'] || '').trim(),
                principal_contact: String(row['આચાર્યનો કોન્ટેક્ટ નં.'] || '').trim(),
            }, { merge: true });

            // Student Document
            const studentRef = doc(db, `districts/${districtId}/students`, studentName);
            batch.set(studentRef, {
                name: studentName,
                school_dias_code: schoolDiasCode,
                school_name: String(row['શાળાનું નામ'] || '').trim(),
                route: String(row['રૂટ (સ્ટાર્ટિંગ પોઇન્ટ-એન્ડીંગ પોઇન્ટ)'] || '').trim(),
                beneficiary_villages: String(row['લાભાવિંત ગામોના નામ'] || '').trim(),
                standard: String(row['ધોરણ '] || '').trim(), // Corrected header
                address: String(row['એડ્રેસ (પીકઅપ)'] || '').trim(),
                bus_pass_number: String(row['બસપાસ નં.'] || '').trim(),
                bus_number: String(row['બસ નંબર'] || '').trim(),
                bus_time_morning: String(row['બસના સમયની વિગત : સવાર'] || '').trim(),
                bus_time_evening: String(row['બસના સમયની વિગત :સાંજ'] || '').trim(),
                depot_manager_name: String(row['ડેપો મેનેજરનુ નામ'] || '').trim(),
                depot_manager_contact: String(row['ડેપો મેનેજરનો કોન્ટેક્ટ નં.'] || '').trim(),
                traveling_bus: false, 
                not_traveling_bus: false
            }, { merge: true });

            operationsInBatch += 3;
        });

        if (operationsInBatch > 0) {
            const batchNum = Math.floor(i / BATCH_SIZE) + 1;
            const totalBatches = Math.ceil(totalRows / BATCH_SIZE);
            processedRows += chunk.length;
            uploadStatus.textContent = `Uploading batch ${batchNum} of ${totalBatches}... (${processedRows}/${totalRows} rows).`;
            try {
                await batch.commit();
                console.log(`Batch ${batchNum} written successfully.`);
                if (i + BATCH_SIZE < totalRows) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
                }
            } catch (error) {
                console.error("Error writing batch:", error);
                uploadStatus.textContent = `Error on batch ${batchNum}: ${error.message}. You have hit the database free quota. Please upgrade your Firebase plan.`;
                alert(`An error occurred during upload: ${error.message}. This is a hard limit of the free plan. The upload cannot continue.`);
                return;
            }
        }
    }

    uploadStatus.textContent = "Data uploaded successfully!";
    alert("Data uploaded successfully!");
    await displayAllDistricts();
    await populateDistrictFilter();
}

// --- UI Display Functions ---
async function displayStudentsForDistrict(districtId, schoolFilter = null) {
    notSubmittedList.innerHTML = ''; 
    submittedList.innerHTML = '';
    schoolFilters.style.display = 'flex';

    try {
        await populateSchoolFilter(districtId);
        const studentsSnapshot = await getDocs(collection(db, `districts/${districtId}/students`));
        if (studentsSnapshot.empty) {
            notSubmittedList.innerHTML = '<p>No students found for this district.</p>';
            return;
        }

        const schoolsSnapshot = await getDocs(collection(db, `districts/${districtId}/schools`));
        const schoolNames = new Map(schoolsSnapshot.docs.map(d => [d.id, d.data().name]));
        
        const notSubmittedTable = createStudentTable();
        const submittedTable = createStudentStatusTable();
        const notSubmittedTbody = notSubmittedTable.querySelector('tbody');
        const submittedTbody = submittedTable.querySelector('tbody');

        let notSubmittedCount = 0;
        let submittedCount = 0;

        studentsSnapshot.forEach(studentDoc => {
            const studentData = studentDoc.data();
            if (schoolFilter && studentData.school !== schoolFilter) return;

            const schoolName = schoolNames.get(studentData.school) || 'N/A';
            if (studentData.traveling_bus || studentData.not_traveling_bus) {
                const row = createSubmittedStudentRow(studentDoc.id, studentData, schoolName);
                submittedTbody.appendChild(row);
                submittedCount++;
            } else {
                const row = createStudentRow(studentDoc.id, studentData, schoolName);
                notSubmittedTbody.appendChild(row);
                notSubmittedCount++;
            }
        });

        if (notSubmittedCount > 0) {
            notSubmittedList.appendChild(notSubmittedTable);
        } else {
            notSubmittedList.innerHTML = '<p>All students have been submitted.</p>';
        }

        if (submittedCount > 0) {
            submittedList.appendChild(submittedTable);
        } else {
            submittedList.innerHTML = '<p>No students have been submitted yet.</p>';
        }

    } catch (error) {
        console.error("Error displaying district students:", error);
        notSubmittedList.innerHTML = `<p>Error: Could not load district data. This is likely a Firestore rules issue. (${error.message})</p>`;
    }
}

async function displayAllDistricts(filter = null) {
    adminContainer.innerHTML = '';
    try {
        const districtsSnapshot = await getDocs(collection(db, 'districts'));
        if (districtsSnapshot.empty) {
            adminContainer.innerHTML = '<p>No districts found.</p>';
            return;
        }

        let districtsToDisplay = 0;
        let totalStudents = 0;
        for (const districtDoc of districtsSnapshot.docs) {
            const districtId = districtDoc.id;
            const districtData = districtDoc.data();

            if (!districtData || !districtData.name) continue;
            if (filter && districtId !== filter) continue;

            districtsToDisplay++;
            const studentsSnapshot = await getDocs(collection(db, `districts/${districtId}/students`));
            const studentCount = studentsSnapshot.size;
            totalStudents += studentCount;

            const districtItem = document.createElement('div');
            districtItem.className = 'district';
            districtItem.innerHTML = `
                <h3>
                    <div class="district-header-left">${districtData.name} <span class="student-count">(${studentCount} Students)</span></div>
                    <div>
                        <button class="show-chart-button" data-district-id="${districtId}">Show Chart</button>
                        <button class="show-details-button">Show Details</button>
                    </div>
                </h3>
                <div class="district-content-wrapper">
                    <div class="details-container" style="display: none;"></div>
                    <div class="chart-container" style="display: none;"><canvas id="chart-${districtId}"></canvas></div>
                </div>
            `;

            const detailsContainer = districtItem.querySelector('.details-container');
            if (studentCount > 0) {
                const table = createStudentStatusTable(studentsSnapshot);
                detailsContainer.appendChild(table);
            } else {
                detailsContainer.innerHTML = '<p>No students in this district.</p>';
            }
            
            adminContainer.appendChild(districtItem);
        }
        document.getElementById('total-student-count').textContent = totalStudents;

        if (districtsToDisplay === 0 && filter) {
            adminContainer.innerHTML = `<p>District "${filter}" not found.</p>`;
        }
    } catch (error) {
        console.error("Error displaying all districts:", error);
        adminContainer.innerHTML = `<p>Error loading districts: ${error.message}</p>`;
    }
}

// --- UI Helper Functions ---

function createStudentTable() {
    const table = document.createElement('table');
    table.className = 'students-table';
    table.innerHTML = `<thead><tr><th>Student Name</th><th>School</th><th>Traveling</th><th>Not Traveling</th></tr></thead><tbody></tbody>`;
    return table;
}

function createSubmittedStudentRow(studentId, studentData, schoolName) {
    const row = document.createElement('tr');
    let status = 'Not Updated';
    if (studentData.traveling_bus) status = 'Traveling by Bus';
    else if (studentData.not_traveling_bus) status = 'Not Traveling by Bus';
    row.innerHTML = `<td>${studentData.name || 'N/A'}</td><td>${schoolName}</td><td>${status}</td>`;
    return row;
}

function createStudentRow(studentId, studentData, schoolName) {
    const row = document.createElement('tr');
    row.dataset.studentId = studentId;
    row.innerHTML = `<td>${studentData.name || 'N/A'}</td><td>${schoolName}</td>`;

    const travelingCell = document.createElement('td');
    const notTravelingCell = document.createElement('td');
    const travelingCheckbox = createStatusCheckbox(studentData.traveling_bus);
    const notTravelingCheckbox = createStatusCheckbox(studentData.not_traveling_bus);

    travelingCheckbox.addEventListener('change', () => {
        if (travelingCheckbox.checked) notTravelingCheckbox.checked = false;
    });
    notTravelingCheckbox.addEventListener('change', () => {
        if (notTravelingCheckbox.checked) travelingCheckbox.checked = false;
    });

    travelingCell.appendChild(travelingCheckbox);
    notTravelingCell.appendChild(notTravelingCheckbox);
    row.appendChild(travelingCell);
    row.appendChild(notTravelingCell);

    return row;
}

function createStatusCheckbox(isChecked) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!isChecked;
    return checkbox;
}

function createStudentStatusTable(studentsSnapshot) {
    const table = document.createElement('table');
    table.className = 'students-table';
    table.innerHTML = `<thead><tr><th>Student Name</th><th>School</th><th>Status</th></tr></thead><tbody></tbody>`;
    if (studentsSnapshot) {
        const tbody = table.querySelector('tbody');
        studentsSnapshot.forEach(studentDoc => {
            const studentData = studentDoc.data();
            let status = 'Not Updated';
            if (studentData.traveling_bus) status = 'Traveling by Bus';
            else if (studentData.not_traveling_bus) status = 'Not Traveling by Bus';
            tbody.innerHTML += `<tr><td>${studentDoc.id}</td><td>${studentData.school_name}</td><td>${status}</td></tr>`;
        });
    }
    return table;
}

async function renderPieChart(districtId, canvasId) {
    const studentsSnapshot = await getDocs(collection(db, `districts/${districtId}/students`));
    let traveling = 0;
    let notTraveling = 0;
    let notUpdated = 0;

    studentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.traveling_bus) {
            traveling++;
        } else if (data.not_traveling_bus) {
            notTraveling++;
        } else {
            notUpdated++;
        }
    });

    const ctx = document.getElementById(canvasId).getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Traveling by Bus', 'Not Traveling by Bus', 'Not Updated'],
            datasets: [{
                data: [traveling, notTraveling, notUpdated],
                backgroundColor: ['#28a745', '#dc3545', '#ffc107'],
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                datalabels: {
                    formatter: (value, ctx) => {
                        let sum = 0;
                        let dataArr = ctx.chart.data.datasets[0].data;
                        dataArr.map(data => {
                            sum += data;
                        });
                        let percentage = (value * 100 / sum).toFixed(2) + "%";
                        return percentage;
                    },
                    color: '#fff',
                }
            }
        }
    });
}


// --- Firestore Update and Utility Functions ---
submitButton.addEventListener('click', async () => {
    if (!auth.currentUser) return alert('You must be logged in to submit.');
    const districtId = auth.currentUser.email.split('@')[0].toLowerCase();
    const rows = notSubmittedList.querySelectorAll('tbody tr');
    const batch = writeBatch(db);

    rows.forEach(row => {
        const studentId = row.dataset.studentId;
        const travelingCheckbox = row.querySelector('td:nth-child(3) input');
        const notTravelingCheckbox = row.querySelector('td:nth-child(4) input');
        
        if(travelingCheckbox.checked || notTravelingCheckbox.checked) {
            const studentRef = doc(db, `districts/${districtId}/students`, studentId);
            batch.update(studentRef, {
                traveling_bus: travelingCheckbox.checked,
                not_traveling_bus: notTravelingCheckbox.checked
            });
        }
    });

    try {
        await batch.commit();
        alert('Selections submitted successfully!');
        await displayStudentsForDistrict(districtId, schoolFilterSelect.value);
    } catch (error) {
        console.error("Error submitting selections:", error);
        alert(`Failed to submit: ${error.message}`);
    }
});


async function populateDistrictFilter() {
    districtFilterSelect.innerHTML = '<option value="">All Districts</option>';
    try {
        const districtsSnapshot = await getDocs(collection(db, 'districts'));
        districtsSnapshot.docs
            .sort((a, b) => (a.data()?.name || '').localeCompare(b.data()?.name || ''))
            .forEach(doc => {
                const data = doc.data();
                if (data?.name) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = data.name;
                    districtFilterSelect.appendChild(option);
                }
            });
    } catch (error) {
        console.error("Error populating district filter:", error);
    }
}

async function populateSchoolFilter(districtId) {
    schoolFilterSelect.innerHTML = '<option value="">All Schools</option>';
    try {
        const schoolsSnapshot = await getDocs(collection(db, `districts/${districtId}/schools`));
        schoolsSnapshot.docs
            .sort((a, b) => (a.data()?.name || '').localeCompare(b.data()?.name || ''))
            .forEach(doc => {
                const data = doc.data();
                if (data?.name) {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = data.name;
                    schoolFilterSelect.appendChild(option);
                }
            });
    } catch(error) {
        console.error("Error populating school filter:", error);
    }
}

async function exportToExcel() {
    const filter = districtFilterSelect.value;
    const data = [];
    try {
        const districtsSnapshot = await getDocs(collection(db, 'districts'));
        for (const districtDoc of districtsSnapshot.docs) {
            const districtId = districtDoc.id;
            const districtData = districtDoc.data();
            if (!districtData || !districtData.name) continue;
            if (filter && districtId !== filter) continue;

            const studentsSnapshot = await getDocs(collection(db, `districts/${districtId}/students`));
            for (const studentDoc of studentsSnapshot.docs) {
                const studentData = studentDoc.data();
                let status = 'Not Updated';
                if (studentData.traveling_bus) status = 'Traveling by Bus';
                else if (studentData.not_traveling_bus) status = 'Not Traveling by Bus';
                
                data.push({
                    District: districtData.name,
                    "Student Name": studentDoc.id,
                    "School Name": studentData.school_name || "N/A",
                    Status: status
                });
            }
        }

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
        XLSX.writeFile(workbook, "student_data_export.xlsx");
    } catch (error) {
        console.error("Error exporting to Excel:", error);
        alert(`Could not export data: ${error.message}`);
    }
}

document.addEventListener('click', e => {
    const target = e.target;
    if (target.classList.contains('show-details-button')) {
        const details = target.closest('.district').querySelector('.details-container');
        const isVisible = details.style.display === 'block';
        details.style.display = isVisible ? 'none' : 'block';
        target.textContent = isVisible ? 'Show Details' : 'Hide Details';
    }

    if (target.classList.contains('show-chart-button')) {
        const districtId = target.dataset.districtId;
        const chartContainer = target.closest('.district').querySelector('.chart-container');
        const canvasId = `chart-${districtId}`;
        const isVisible = chartContainer.style.display === 'block';
        
        chartContainer.style.display = isVisible ? 'none' : 'block';
        target.textContent = isVisible ? 'Show Chart' : 'Hide Chart';

        if (!isVisible) {
            renderPieChart(districtId, canvasId);
        }
    }
});