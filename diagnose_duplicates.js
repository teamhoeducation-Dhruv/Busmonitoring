
import admin from "firebase-admin";
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function diagnoseDuplicateStudents() {
    console.log("--- Starting Duplicate Diagnosis Script ---");
    console.log("This script will NOT delete any data. It will only report potential duplicates.");
    let potentialDuplicatesFound = 0;

    const districtsSnapshot = await db.collection('districts').get();
    
    for (const districtDoc of districtsSnapshot.docs) {
        const schoolsSnapshot = await districtDoc.ref.collection('schools').get();

        for (const schoolDoc of schoolsSnapshot.docs) {
            const studentsRef = schoolDoc.ref.collection('students');
            const studentsSnapshot = await studentsRef.get();

            if (studentsSnapshot.size < 2) {
                continue;
            }

            // Group students by a normalized name
            const studentsByName = new Map();
            studentsSnapshot.forEach(doc => {
                const studentData = doc.data();
                const name = studentData.name;
                
                if (name && typeof name === 'string' && name.trim().length > 0) {
                    const normalizedName = name.trim().toLowerCase();
                    if (!studentsByName.has(normalizedName)) {
                        studentsByName.set(normalizedName, []);
                    }
                    studentsByName.get(normalizedName).push({ id: doc.id, data: studentData });
                }
            });

            // Report any groups that have more than one member
            for (const [name, docs] of studentsByName.entries()) {
                if (docs.length > 1) {
                    potentialDuplicatesFound++;
                    console.log(`\n--- Potential Duplicate Group Found ---`);
                    console.log(`District: ${districtDoc.id}, School: ${schoolDoc.id}`);
                    console.log(`Name: "${name}" (Found ${docs.length} times)`);
                    console.log("Document IDs:");
                    docs.forEach(doc => {
                        console.log(`  - ${doc.id}`);
                    });
                }
            }
        }
    }

    console.log("\n--- Diagnosis Complete ---");
    if (potentialDuplicatesFound > 0) {
        console.log(`Found ${potentialDuplicatesFound} group(s) of potential duplicates.`);
        console.log("Please review the logs above. No data has been changed.");
    } else {
        console.log("The script could not find any documents with matching names within the same school.");
        console.log("This confirms the issue is not simple name duplication within schools.");
    }
}

diagnoseDuplicateStudents().catch(error => {
    console.error("An error occurred during the diagnosis process:", error);
});
