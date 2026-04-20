
// backup-data.js
// This script creates a complete backup of the 'districts' collection and its subcollections.

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

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    if (error.code === 'ENOENT') { // File not found
        console.error('Error: Could not find serviceAccountKey.json.');
        console.error('Please download it from your Firebase project settings and place it in the same directory as this script.');
    } else {
        console.error('Error parsing serviceAccountKey.json:', error.message);
    }
    process.exit(1);
}

const db = admin.firestore();

/**
 * Creates a backup of the 'districts' collection and its 'schools' and 'students' subcollections.
 * The backup will be stored in a new collection named 'districts_backup'.
 */
async function backupData() {
    console.log('--- Starting Firestore data backup process ---');
    const sourceCollection = 'districts';
    const backupCollection = 'districts_backup';
    const BATCH_SIZE = 400; // Firestore batch limit is 500 operations

    try {
        const districtsSnapshot = await db.collection(sourceCollection).get();

        if (districtsSnapshot.empty) {
            console.log(`Source collection "${sourceCollection}" is empty. Nothing to back up.`);
            return;
        }

        console.log(`Found ${districtsSnapshot.size} districts to back up.`);

        let batch = db.batch();
        let operationCount = 0;
        let totalDocsBackedUp = 0;

        for (const districtDoc of districtsSnapshot.docs) {
            // 1. Copy the district document itself
            const backupDistrictRef = db.collection(backupCollection).doc(districtDoc.id);
            batch.set(backupDistrictRef, districtDoc.data());
            operationCount++;

            console.log(`Backing up district: ${districtDoc.id}`);

            // 2. Copy the 'schools' subcollection
            const schoolsSnapshot = await districtDoc.ref.collection('schools').get();
            if (!schoolsSnapshot.empty) {
                console.log(`  - Found ${schoolsSnapshot.size} schools.`);
                for (const schoolDoc of schoolsSnapshot.docs) {
                    const backupSchoolRef = backupDistrictRef.collection('schools').doc(schoolDoc.id);
                    batch.set(backupSchoolRef, schoolDoc.data());
                    operationCount++;
                    if (operationCount >= BATCH_SIZE) {
                        await batch.commit();
                        batch = db.batch();
                        operationCount = 0;
                    }
                }
            }

            // 3. Copy the 'students' subcollection
            const studentsSnapshot = await districtDoc.ref.collection('students').get();
             if (!studentsSnapshot.empty) {
                console.log(`  - Found ${studentsSnapshot.size} students.`);
                for (const studentDoc of studentsSnapshot.docs) {
                    const backupStudentRef = backupDistrictRef.collection('students').doc(studentDoc.id);
                    batch.set(backupStudentRef, studentDoc.data());
                    operationCount++;
                    if (operationCount >= BATCH_SIZE) {
                        await batch.commit();
                        batch = db.batch();
                        operationCount = 0;
                    }
                }
            }
            
            totalDocsBackedUp += (1 + schoolsSnapshot.size + studentsSnapshot.size);
        }

        // Commit any remaining operations in the last batch
        if (operationCount > 0) {
            await batch.commit();
        }

        console.log('\n--- Backup process finished successfully! ---');
        console.log(`✅ Copied all data from '${sourceCollection}' to '${backupCollection}'.`);
        console.log(`✅ Total documents backed up: ${totalDocsBackedUp}`);

    } catch (error) {
        console.error('\n--- 💥 An error occurred during the backup process ---', error);
    } finally {
        // Gracefully close the Firestore connection.
        await admin.app().delete();
    }
}

// --- Run the Script ---
backupData();
