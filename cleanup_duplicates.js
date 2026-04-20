
import admin from "firebase-admin";
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicateStudents() {
    console.log("--- Starting Duplicate Cleanup Script ---");
    let totalDuplicatesRemoved = 0;

    const districtsSnapshot = await db.collection('districts').get();
    console.log(`Found ${districtsSnapshot.size} districts to scan.`);

    for (const districtDoc of districtsSnapshot.docs) {
        console.log(`\n--- Scanning District: ${districtDoc.id} ---`);
        const schoolsSnapshot = await districtDoc.ref.collection('schools').get();

        for (const schoolDoc of schoolsSnapshot.docs) {
            const schoolId = schoolDoc.id;
            const studentsRef = schoolDoc.ref.collection('students');
            const studentsSnapshot = await studentsRef.get();

            if (studentsSnapshot.size < 2) {
                continue; // Skip if no duplicates are possible
            }

            console.log(`- Checking school: ${schoolId} (${studentsSnapshot.size} students)`);

            // Group students by their normalized name to find duplicates
            const studentsByName = new Map();
            studentsSnapshot.forEach(doc => {
                const studentData = doc.data();
                const name = studentData.name; // The 'name' field from the document
                
                // Ensure name is a non-empty string before processing
                if (name && typeof name === 'string' && name.trim().length > 0) {
                    const normalizedName = name.trim().toLowerCase();
                    if (!studentsByName.has(normalizedName)) {
                        studentsByName.set(normalizedName, []);
                    }
                    studentsByName.get(normalizedName).push(doc);
                }
            });

            const batch = db.batch();
            let duplicatesInSchool = 0;

            // Iterate through the grouped students to find groups with more than one member
            for (const [name, docs] of studentsByName.entries()) {
                if (docs.length > 1) {
                    console.log(`  - Found ${docs.length} records for name: "${name}". Keeping one.`);
                    // Keep the first document, and mark the rest for deletion
                    const docsToDelete = docs.slice(1);
                    
                    docsToDelete.forEach(doc => {
                        batch.delete(doc.ref);
                        duplicatesInSchool++;
                    });
                }
            }

            // If any duplicates were marked for deletion in this school, commit them
            if (duplicatesInSchool > 0) {
                console.log(`  - Deleting ${duplicatesInSchool} duplicate(s) from school ${schoolId}...`);
                await batch.commit();
                totalDuplicatesRemoved += duplicatesInSchool;
                console.log(`  - Deletion successful.`);
            }
        }
    }

    console.log("\n--- Cleanup Complete ---");
    if (totalDuplicatesRemoved > 0) {
        console.log(`SUCCESS: Removed a total of ${totalDuplicatesRemoved} duplicate students from the database.`);
    } else {
        console.log("No duplicate students were found. The database appears to be clean.");
    }
}

cleanupDuplicateStudents().catch(error => {
    console.error("An error occurred during the cleanup process:", error);
});
