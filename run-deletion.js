
// run-deletion.js
// This is a Node.js script to delete specific school and student data based on DIAS codes.

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Helper for __dirname in ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Firebase Admin Initialization ---
try {
    const serviceAccountRaw = fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'));
    const serviceAccount = JSON.parse(serviceAccountRaw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    process.exit(1);
}

const db = admin.firestore();

// --- Main Deletion Logic ---

// List of school_dias_codes to delete
const codesToDelete = ['24310402102','24310404409','24310404906','24310405902','24310408106','24310408404','24310408405','24310408903','24310410502','24310412308','24310413101','24310413404','24310413606','24310413706','24310414603'];

async function deleteSpecificData() {
    console.log("--- Starting deletion process for specific school and student data ---");
    console.log("Target school DIAS codes:", codesToDelete.join(', '));

    let totalSchoolsDeleted = 0;
    let totalStudentsDeleted = 0;

    try {
        const districtsRef = db.collection('districts');
        const districtsSnapshot = await districtsRef.get();

        if (districtsSnapshot.empty) {
            console.log("No districts found. Exiting.");
            return;
        }

        console.log(`\nFound ${districtsSnapshot.size} districts to scan.`);

        for (const districtDoc of districtsSnapshot.docs) {
            console.log(`\nScanning district: ${districtDoc.id}...`);

            const schoolsRef = districtDoc.ref.collection('schools');
            const studentsRef = districtDoc.ref.collection('students');
            const batch = db.batch();
            let schoolsDeletedInDistrict = 0;
            let studentsDeletedInDistrict = 0;

            // --- Find and delete schools ---
            const schoolQuery = schoolsRef.where('dias_code', 'in', codesToDelete);
            const schoolsSnapshot = await schoolQuery.get();

            if (!schoolsSnapshot.empty) {
                schoolsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (school): ${districtDoc.id}/${doc.id} (DIAS: ${doc.data().dias_code})`);
                    batch.delete(doc.ref);
                    schoolsDeletedInDistrict++;
                });
            }

            // --- Find and delete students ---
            const studentQuery = studentsRef.where('school_dias_code', 'in', codesToDelete);
            const studentsSnapshot = await studentQuery.get();

            if (!studentsSnapshot.empty) {
                 studentsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (student): ${districtDoc.id}/${doc.id} (School DIAS: ${doc.data().school_dias_code})`);
                    batch.delete(doc.ref);
                    studentsDeletedInDistrict++;
                });
            }

            // --- Commit the batch for the district ---
            if (schoolsDeletedInDistrict > 0 || studentsDeletedInDistrict > 0) {
                await batch.commit();
                console.log(`  - ✅ Committed deletions for district ${districtDoc.id}.`);
                console.log(`    - Deleted ${schoolsDeletedInDistrict} school(s).`);
                console.log(`    - Deleted ${studentsDeletedInDistrict} student(s).`);
                totalSchoolsDeleted += schoolsDeletedInDistrict;
                totalStudentsDeleted += studentsDeletedInDistrict;
            } else {
                console.log(`  - No matching data to delete in district ${districtDoc.id}.`);
            }
        }

        console.log("\n--- Deletion process finished! ---");
        console.log(`✅ Total schools deleted: ${totalSchoolsDeleted}`);
        console.log(`✅ Total students deleted: ${totalStudentsDeleted}`);

    } catch (error) {
        console.error("\n--- 💥 An error occurred during the deletion process ---", error);
    } finally {
        await admin.app().delete();
    }
}

// --- Run the Script ---
deleteSpecificData();
