
import admin from "firebase-admin";
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function removeDuplicateStudentsV2() {
    console.log("--- Starting ROBUST duplicate student removal process (v2) ---");
    let totalDuplicatesRemoved = 0;

    const districtsSnapshot = await db.collection('districts').get();
    console.log(`Found ${districtsSnapshot.size} districts to scan.`);

    for (const districtDoc of districtsSnapshot.docs) {
        console.log(`\nScanning district: ${districtDoc.id}...`);
        const schoolsSnapshot = await districtDoc.ref.collection('schools').get();

        for (const schoolDoc of schoolsSnapshot.docs) {
            const studentsRef = schoolDoc.ref.collection('students');
            const studentsSnapshot = await studentsRef.get();

            if (studentsSnapshot.size < 2) {
                continue; // No possibility of duplicates if less than 2 students
            }

            // Group students by their normalized name
            const studentsByName = new Map();
            studentsSnapshot.forEach(doc => {
                const data = doc.data();
                const name = data.name;
                if (name && typeof name === 'string') {
                    const normalizedName = name.trim().toLowerCase();
                    if (!studentsByName.has(normalizedName)) {
                        studentsByName.set(normalizedName, []);
                    }
                    studentsByName.get(normalizedName).push(doc);
                }
            });

            const batch = db.batch();
            let duplicatesInSchool = 0;

            // Iterate through the grouped students
            for (const [name, docs] of studentsByName.entries()) {
                if (docs.length > 1) {
                    // We found duplicates for this name.
                    // Keep the first one, delete the rest.
                    const docsToDelete = docs.slice(1);
                    
                    docsToDelete.forEach(doc => {
                        batch.delete(doc.ref);
                        duplicatesInSchool++;
                    });
                }
            }

            if (duplicatesInSchool > 0) {
                console.log(`- Found and removed ${duplicatesInSchool} duplicate(s) for school ${schoolDoc.id}.`);
                await batch.commit();
                totalDuplicatesRemoved += duplicatesInSchool;
            }
        }
    }

    if (totalDuplicatesRemoved > 0) {
        console.log(`\n--- SUCCESS: Removed a total of ${totalDuplicatesRemoved} duplicate students. ---`);
    } else {
        console.log("\n--- Finished: No duplicate students were found across any school. The data is clean. ---");
    }
}

removeDuplicateStudentsV2().catch(console.error);

