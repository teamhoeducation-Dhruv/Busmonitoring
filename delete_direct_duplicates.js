
import admin from "firebase-admin";
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function deleteDirectDuplicates() {
    console.log("--- Starting Direct Duplicate Deletion ---\nFollowing user-specified path: districts > students");
    let totalDuplicatesRemoved = 0;

    const districtsSnapshot = await db.collection('districts').get();
    console.log(`Found ${districtsSnapshot.size} districts to scan.`);

    for (const districtDoc of districtsSnapshot.docs) {
        const districtId = districtDoc.id;
        const studentsRef = districtDoc.ref.collection('students');
        const studentsSnapshot = await studentsRef.get();

        if (studentsSnapshot.empty) {
            console.log(`\nDistrict: ${districtId} - No students found, skipping.`);
            continue;
        }

        console.log(`\nScanning District: ${districtId} (${studentsSnapshot.size} students)...`);

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
        let duplicatesInDistrict = 0;

        for (const [name, docs] of studentsByName.entries()) {
            if (docs.length > 1) {
                // Keep the first doc, delete the rest
                const docsToDelete = docs.slice(1);
                console.log(`  - Found ${docs.length} records for name: "${name}". Removing ${docsToDelete.length}.`);
                docsToDelete.forEach(doc => {
                    batch.delete(doc.ref);
                    duplicatesInDistrict++;
                });
            }
        }

        if (duplicatesInDistrict > 0) {
            await batch.commit();
            console.log(`  - Successfully deleted ${duplicatesInDistrict} duplicates from ${districtId}.`);
            totalDuplicatesRemoved += duplicatesInDistrict;
        } else {
            console.log("  - No duplicates found in this district.");
        }
    }

    console.log("\n--- Deletion Complete ---");
    if (totalDuplicatesRemoved > 0) {
        console.log(`SUCCESS: Removed a total of ${totalDuplicatesRemoved} duplicate students.`);
    } else {
        console.log("No duplicates were found across any district's 'students' collection.");
    }
}

deleteDirectDuplicates().catch(error => {
    console.error("An error occurred during the deletion process:", error);
});
