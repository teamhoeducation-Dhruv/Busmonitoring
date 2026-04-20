
// debug-student-data.js
// This script fetches and displays a single student record to inspect its data structure.

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
    const serviceAccountRaw = fs.readFileSync(path.join(__dirname, 'serviceAccountKey.json'));
    const serviceAccount = JSON.parse(serviceAccountRaw);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    process.exit(1);
}

const db = admin.firestore();

async function inspectStudentData() {
    console.log('--- Fetching a sample student record to inspect fields ---');
    try {
        const districtsSnapshot = await db.collection('districts').limit(1).get();
        if (districtsSnapshot.empty) {
            console.log('No districts found.');
            return;
        }

        const firstDistrict = districtsSnapshot.docs[0];
        console.log(`Searching for students in district: ${firstDistrict.id}...`);

        const studentsSnapshot = await firstDistrict.ref.collection('students').limit(1).get();
        if (studentsSnapshot.empty) {
            console.log('No students found in this district.');
            return;
        }

        const studentDoc = studentsSnapshot.docs[0];
        const studentData = studentDoc.data();

        console.log('\n--- Sample Student Record ---');
        console.log('Document ID:', studentDoc.id);
        console.log('Data:', JSON.stringify(studentData, null, 2));
        console.log('\n--- End of Sample ---');
        console.log('\nPlease review the fields above. The report script was looking for `route_name`, `beneficiary_villages`, `school_name`, and `bus_number`.');

    } catch (error) {
        console.error('\nAn error occurred during inspection:', error);
    } finally {
        await admin.app().delete();
    }
}

inspectStudentData();
