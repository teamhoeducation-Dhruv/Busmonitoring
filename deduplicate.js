
import admin from "firebase-admin";
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeDuplicateStudents() {
    console.log("--- Starting duplicate student removal process ---");
    let totalDuplicatesRemoved = 0;

    // Get all districts
    const districtsSnapshot = await db.collection('districts').get();
    console.log(`Found ${districtsSnapshot.size} districts to scan.`);

    // Iterate through each district
    for (const districtDoc of districtsSnapshot.docs) {
        console.log(`\nScanning district: ${districtDoc.id}...`);
        const schoolsSnapshot = await districtDoc.ref.collection('schools').get();

        // Iterate through each school in the district
        for (const schoolDoc of schoolsSnapshot.docs) {
            const schoolRef = schoolDoc.ref;
            const studentsRef = schoolRef.collection('students');
            const studentsSnapshot = await studentsRef.get();

            if (studentsSnapshot.empty) {
                continue; // Skip if no students in the school
            }

            const seenNames = new Set();
            const batch = db.batch();
            let duplicatesInSchool = 0;

            // Iterate through each student in the school
            for (const studentDoc of studentsSnapshot.docs) {
                const studentData = studentDoc.data();
                const studentName = studentData.name;

                // A name is required to check for duplicates
                if (!studentName || typeof studentName !== 'string') {
                    continue;
                }

                const normalizedName = studentName.trim().toLowerCase();

                if (seenNames.has(normalizedName)) {
                    // This is a duplicate, mark it for deletion
                    batch.delete(studentDoc.ref);
                    duplicatesInSchool++;
                } else {
                    // This is the first time we've seen this name in this school
                    seenNames.add(normalizedName);
                }
            }

            // If duplicates were found in this school, commit the batch
            if (duplicatesInSchool > 0) {
                console.log(`- Found ${duplicatesInSchool} duplicate(s) in school ${schoolDoc.id}. Removing...`);
                await batch.commit();
                totalDuplicatesRemoved += duplicatesInSchool;
            }
        }
    }

    if (totalDuplicatesRemoved > 0) {
        console.log(`\n--- Success: Removed a total of ${totalDuplicatesRemoved} duplicate students. ---`);
    } else {
        console.log("\n--- Finished: No duplicate students found. ---");
    }
}

removeDuplicateStudents().catch(console.error).finally(() => {
    // Optional: Close the app if running in a script-only environment
    // admin.app().delete();
});
