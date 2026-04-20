
// terminal_delete.js

// This script uses the Firebase Admin SDK to delete data from the terminal.
// It requires a service account key to authenticate.

const admin = require('firebase-admin');

// --- Configuration ---

// The DIAS codes for the schools and associated students you want to delete.
const CODES_TO_DELETE = ['24261304001', '24261302001', '24261413401'];

// IMPORTANT: Path to your Firebase service account key JSON file.
// For security, we recommend setting this as an environment variable.
// For example: export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!serviceAccountPath) {
    console.error(`
💥 ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable not set.
This variable must point to your Firebase service account key JSON file.

Please follow these steps:
1. Go to your Firebase Project Settings -> Service accounts.
2. Click "Generate new private key" and download the JSON file.
3. Place the file in your project directory (e.g., as 'serviceAccountKey.json').
4. Set the environment variable before running the script:
   (Linux/macOS): export GOOGLE_APPLICATION_CREDENTIALS="./serviceAccountKey.json"
   (Windows CMD):  set GOOGLE_APPLICATION_CREDENTIALS=.\serviceAccountKey.json
   (Windows PS):   $env:GOOGLE_APPLICATION_CREDENTIALS = ".\serviceAccountKey.json"
5. Run the script again: node terminal_delete.js
    `);
    process.exit(1);
}

let serviceAccount;
try {
    serviceAccount = require(serviceAccountPath);
} catch (error) {
    console.error(`\n💥 ERROR: Could not load the service account key file from the path: ${serviceAccountPath}`);
    console.error("Please make sure the file exists and the path is correct.");
    process.exit(1);
}


// Initialize the Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// --- Deletion Logic ---

async function deleteData() {
    console.log("--- Starting deletion process for the following DIAS codes ---");
    console.log(CODES_TO_DELETE.join(', '));
    console.log("----------------------------------------------------------\n");

    let totalSchoolsDeleted = 0;
    let totalStudentsDeleted = 0;

    try {
        const districtsSnapshot = await db.collection('districts').get();
        if (districtsSnapshot.empty) {
            console.log("No districts found. Nothing to do.");
            return;
        }

        for (const districtDoc of districtsSnapshot.docs) {
            const districtId = districtDoc.id;
            console.log(`Scanning District: ${districtId}...`);

            const batch = db.batch();
            let itemsInBatch = 0;

            // --- Delete Schools ---
            const schoolsRef = db.collection('districts').doc(districtId).collection('schools');
            const schoolQuery = schoolsRef.where('dias_code', 'in', CODES_TO_DELETE);
            const schoolsSnapshot = await schoolQuery.get();

            if (!schoolsSnapshot.empty) {
                schoolsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (school): ${doc.data().name} (DIAS: ${doc.data().dias_code})`);
                    batch.delete(doc.ref);
                    itemsInBatch++;
                    totalSchoolsDeleted++;
                });
            }

            // --- Delete Students ---
            const studentsRef = db.collection('districts').doc(districtId).collection('students');
            const studentQuery = studentsRef.where('school_dias_code', 'in', CODES_TO_DELETE);
            const studentsSnapshot = await studentQuery.get();

            if (!studentsSnapshot.empty) {
                studentsSnapshot.forEach(doc => {
                    console.log(`  - Marking for deletion (student): ${doc.data().name} from school ${doc.data().school_dias_code}`);
                    batch.delete(doc.ref);
                    itemsInBatch++;
                    totalStudentsDeleted++;
                });
            }

            // Commit the batch if there are items to delete
            if (itemsInBatch > 0) {
                await batch.commit();
                console.log(`  ✅ Committed ${itemsInBatch} deletions in district ${districtId}.\n`);
            } else {
                console.log("  - No matching data found in this district.\n");
            }
        }

        console.log("--- Deletion process finished! ---");
        console.log(`- Total schools deleted: ${totalSchoolsDeleted}`);
        console.log(`- Total students deleted: ${totalStudentsDeleted}`);
        console.log("------------------------------------");

    } catch (error) {
        console.error("\n💥 An error occurred during the deletion process:", error);
    }
}

// Run the deletion function
deleteData();
