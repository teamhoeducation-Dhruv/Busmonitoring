
// This script downloads principal contact information from the Firestore database.
//
// To run this script:
// 1. Make sure you have Node.js installed.
// 2. If you haven't already, install the required dependency by running: npm install firebase-admin
// 3. Download your Firebase service account key from the Firebase Console:
//    Project Settings > Service Accounts > Generate new private key.
//    Save the downloaded JSON file in the same directory as this script,
//    and rename it to '''serviceAccountKey.json'''.
// 4. Run the script from your terminal: node download-principals.js

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
 * Fetches all school data from Firestore and generates a CSV file
 * with principal contact information, ensuring proper character encoding.
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
        const headers = ['District', 'School Name', 'Principal Name', 'Principal Contact'];
        const records = schoolsSnapshot.docs.map(doc => {
            const school = doc.data();
            const district = school.district || 'N/A';
            const name = school.name || 'N/A';
            const principalName = school.principal_name || 'N/A';
            const principalContact = school.principal_contact || 'N/A';
            
            return `"${district}","${name}","${principalName}","${principalContact}"`;
        });

        const csvContent = [headers.join(','), ...records].join('\n');

        // --- File Creation with UTF-8 Encoding ---
        const fileName = 'principal-contacts.csv';
        const filePath = path.join(__dirname, fileName);
        
        // Add a Byte Order Mark (BOM) for Excel compatibility with UTF-8
        const bom = '\uFEFF';

        fs.writeFileSync(filePath, bom + csvContent, 'utf8');

        console.log('\nSuccess!');
        console.log(`Downloaded contact information for ${schoolsSnapshot.size} principals.`);
        console.log(`The file has been saved as: ${filePath}`);
        console.log('The CSV file has been saved with UTF-8 encoding to support special characters.');

    } catch (error) {
        console.error('\nAn error occurred while generating the report:', error);
    } finally {
        await admin.app().delete();
    }
}

// --- Run the Script ---
downloadPrincipalContacts();
