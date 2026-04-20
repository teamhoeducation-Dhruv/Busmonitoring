
// generate-route-report.js
// This script generates a CSV report of all bus routes, district by district.

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
    console.error('Error initializing Firebase Admin SDK:', error.message);
    process.exit(1);
}

const db = admin.firestore();

/**
 * Fetches all student data from Firestore and generates a CSV file
 * with district-wise route information.
 */
async function generateRouteReport() {
    console.log('--- Starting route report generation ---');
    const fileName = 'route-report.csv';
    const filePath = path.join(__dirname, fileName);

    try {
        const districtsSnapshot = await db.collection('districts').get();

        if (districtsSnapshot.empty) {
            console.log('No districts found in the database.');
            return;
        }

        const headers = ['District', 'Route Name', 'Beneficiary Villages', 'School Name', 'Bus Number'];
        const uniqueRoutes = new Map();

        console.log(`Found ${districtsSnapshot.size} districts. Scanning for routes...`);

        for (const districtDoc of districtsSnapshot.docs) {
            const districtName = districtDoc.data().name || districtDoc.id;
            console.log(`Scanning district: ${districtName}`);

            const studentsSnapshot = await districtDoc.ref.collection('students').get();

            if (studentsSnapshot.empty) {
                console.log(`  - No students found in ${districtName}.`);
                continue;
            }

            studentsSnapshot.forEach(studentDoc => {
                const student = studentDoc.data();
                const routeName = student.route; // CORRECTED from route_name

                // Use a composite key of route and school to ensure uniqueness
                const routeKey = `${routeName}-${student.school_name}`;

                if (routeName && !uniqueRoutes.has(routeKey)) {
                    const villages = student.beneficiary_villages || 'N/A';

                    uniqueRoutes.set(routeKey, {
                        district: districtName,
                        routeName: routeName,
                        villages: `"${villages}"`, // Enclose in quotes to handle commas
                        schoolName: student.school_name || 'N/A',
                        busNumber: student.bus_number || 'N/A'
                    });
                }
            });
             console.log(`  - Processed ${studentsSnapshot.size} student records.`);
        }

        // --- CSV Data Preparation ---
        const records = Array.from(uniqueRoutes.values()).map(route => {
            return [
                `"${route.district}"`,
                `"${route.routeName}"`,
                route.villages,
                `"${route.schoolName}"`,
                `"${route.busNumber}"`
            ].join(',');
        });

        if (records.length === 0) {
            console.log('\nNo routes found across all districts.');
            return;
        }

        const csvContent = [headers.join(','), ...records].join('\n');
        const bom = '\uFEFF'; // Add a BOM for proper Excel encoding

        fs.writeFileSync(filePath, bom + csvContent, 'utf8');

        console.log('\n--- Success! ---');
        console.log(`Generated report for ${uniqueRoutes.size} unique routes.`);
        console.log(`The file has been saved as: ${filePath}`);

    } catch (error) {
        console.error('\nAn error occurred while generating the report:', error);
    } finally {
        await admin.app().delete();
    }
}

// --- Run the Script ---
generateRouteReport();
