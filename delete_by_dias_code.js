
// delete_by_dias_code.js

// This script is for administrative purposes to delete specific school and student data
// based on a list of school_dias_codes.
// Make sure to backup your data before running this script.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// --- Firebase Initialization ---
// IMPORTANT: Use the same Firebase config as your project
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

// --- Main Deletion Logic ---

// List of school_dias_codes to delete
const codesToDelete = ['24220505603','24220505602'];

async function deleteSpecificData() {
    console.log("--- Starting deletion process for specific school and student data ---");
    console.log("Target school DIAS codes:", codesToDelete.join(', '));

    let totalSchoolsDeleted = 0;
    let totalStudentsDeleted = 0;

    try {
        const districtsRef = collection(db, 'districts');
        const districtsSnapshot = await getDocs(districtsRef);

        if (districtsSnapshot.empty) {
            console.log("No districts found. Exiting.");
            return;
        }

        console.log(`\nFound ${districtsSnapshot.size} districts to scan.`);

        for (const districtDoc of districtsSnapshot.docs) {
            console.log(`\nScanning district: ${districtDoc.id}...`);

            const schoolsRef = collection(districtDoc.ref, 'schools');
            const studentsRef = collection(districtDoc.ref, 'students');
            const batch = writeBatch(db);
            let schoolsDeletedInDistrict = 0;
            let studentsDeletedInDistrict = 0;

            // --- Find and delete schools ---
            const schoolQuery = query(schoolsRef, where('dias_code', 'in', codesToDelete));
            const schoolsSnapshot = await getDocs(schoolQuery);

            if (!schoolsSnapshot.empty) {
                schoolsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (school): ${districtDoc.id}/${doc.id} (DIAS: ${doc.data().dias_code})`);
                    batch.delete(doc.ref);
                    schoolsDeletedInDistrict++;
                });
            } else {
                console.log("  - No schools with the specified DIAS codes found in this district.");
            }


            // --- Find and delete students ---
            const studentQuery = query(studentsRef, where('school_dias_code', 'in', codesToDelete));
            const studentsSnapshot = await getDocs(studentQuery);

            if (!studentsSnapshot.empty) {
                 studentsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (student): ${districtDoc.id}/${doc.id} (School DIAS: ${doc.data().school_dias_code})`);
                    batch.delete(doc.ref);
                    studentsDeletedInDistrict++;
                });
            } else {
                 console.log("  - No students with the specified school DIAS codes found in this district.");
            }


            // --- Commit the batch for the district ---
            if(schoolsDeletedInDistrict > 0 || studentsDeletedInDistrict > 0) {
                await batch.commit();
                console.log(`  - ✅ Committed deletions for district ${districtDoc.id}.`);
                console.log(`    - Deleted ${schoolsDeletedInDistrict} school(s).`);
                console.log(`    - Deleted ${studentsDeletedInDistrict} student(s).`);
                totalSchoolsDeleted += schoolsDeletedInDistrict;
                totalStudentsDeleted += studentsDeletedInDistrict;
            } else {
                console.log(`  - No matching data to delete in district ${districtDoc.id}.`)
            }
        }

        console.log("\n--- Deletion process finished! ---");
        console.log(`✅ Total schools deleted: ${totalSchoolsDeleted}`);
        console.log(`✅ Total students deleted: ${totalStudentsDeleted}`);


    } catch (error) {
        console.error("\n--- 💥 An error occurred during the deletion process ---", error);
    }
}

// To run this script, you would create a simple HTML file to act as a runner.
// 1. Create a file named 'run_delete_script.html'
// 2. Paste the following content into it:
/*
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Run Deletion Script</title>
</head>
<body>
    <h1>Deletion Script Runner</h1>
    <p>Open the browser console to see the script output.</p>
    <p>This script will delete school and student data for the following DIAS codes: 24261304001, 24261302001, 24261413401.</p>
    <button id="run-script-button">Run Deletion Script</button>

    <script type="module">
        import { deleteSpecificData } from './delete_by_dias_code.js';

        document.getElementById('run-script-button').addEventListener('click', () => {
            if(confirm("Are you sure you want to permanently delete this data? This action cannot be undone.")) {
                console.log("User confirmed. Running deletion script...");
                deleteSpecificData();
            } else {
                console.log("User cancelled the operation.");
            }
        });
    </script>
</body>
</html>
*/
// 3. Open 'run_delete_script.html' in your browser and click the button.
