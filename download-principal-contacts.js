
// This script downloads principal contact information from the Firestore database.
//
// To run this script:
// 1. Make sure you have Node.js installed.
// 2. Install the required dependency by running: npm install firebase-admin
// 3. Download your Firebase service account key from the Firebase Console:
//    Project Settings > Service Accounts > Generate new private key.
//    Save the downloaded JSON file in the same directory as this script,
//    and rename it to '''serviceAccountKey.json'''.
// 4. Run the script from your terminal: node download-principal-contacts.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// --- Firebase Admin Initialization ---
// The service account key is expected to be in a file named serviceAccountKey.json
try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('Error: Could not find or parse serviceAccountKey.json.');
    console.error('Please download it from your Firebase project settings and place it in the same directory as this script.');
    process.exit(1);
}


const db = admin.firestore();

/**
 * Fetches all school data from Firestore and generates a CSV file
 * with principal contact information.
 */
async function downloadPrincipalContacts() {
    console.log('Connecting to Firestore and fetching school data...');

    try {
        const schoolsSnapshot = await db.collectionGroup('schools').get();

        if (schoolsSnapshot.empty) {
            console.log('No schools were found in the database.');
            return;
        }

        // --- CSV Data Preparation ---
        // These are the columns for the CSV file.
        const headers = ['District', 'School Name', 'Principal Name', 'Principal Contact'];

        // Map the data from Firestore docs to an array of arrays.
        // I am assuming the field names for the principal are 'principal_name' and 'principal_contact'.
        // If your database uses different fields, you will need to update them below.
        const records = schoolsSnapshot.docs.map(doc => {
            const school = doc.data();
            return [
                `"${school.district || 'N/A'}"`,
                `"${school.name || 'N/A'}"`,
                `"${school.principal_name || 'N/A'}"`,
                `"${school.principal_contact || 'N/A'}"`
            ].join(',');
        });

        // Combine headers and records into a single CSV string.
        const csvContent = [headers.join(','), ...records].join('\n');

        // --- File Creation ---
        const fileName = 'principal-contacts.csv';
        const filePath = path.join(__dirname, fileName);

        fs.writeFileSync(filePath, csvContent);

        console.log('\nSuccess!');
        console.log(`Downloaded contact information for ${schoolsSnapshot.size} principals.`);
        console.log(`The file has been saved as: ${filePath}`);

    } catch (error) {
        console.error('\nAn error occurred while generating the report:', error);
    } finally {
        // Close the Firestore connection
        admin.app().delete();
    }
}

// --- Run the Script ---
downloadPrincipalContacts();
