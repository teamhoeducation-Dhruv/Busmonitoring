
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Deletes all schools with IDs starting with 'unknown_school_' and their associated students.
 */
async function deleteUnknownData() {
  console.log("🔥 Starting deletion process for 'unknown_school' data...");

  const districtsSnapshot = await db.collection('districts').get();
  if (districtsSnapshot.empty) {
    console.log("No districts found. Exiting.");
    return;
  }

  console.log(`Found ${districtsSnapshot.size} districts. Checking each for unknown data...`);

  for (const districtDoc of districtsSnapshot.docs) {
    const districtId = districtDoc.id;
    const districtName = districtDoc.data().name;
    console.log(`\nChecking district: ${districtName} (${districtId})`);

    const schoolsRef = districtDoc.ref.collection('schools');
    const studentsRef = districtDoc.ref.collection('students');

    // Find all schools with 'unknown_school_' prefix
    const schoolsSnapshot = await schoolsRef.get();
    const schoolsToDelete = [];
    schoolsSnapshot.forEach(doc => {
      if (doc.id.startsWith('unknown_school_')) {
        schoolsToDelete.push(doc.id);
      }
    });

    if (schoolsToDelete.length === 0) {
      console.log("  - No schools with 'unknown_school_' prefix found.");
      continue;
    }

    console.log(`  - Found ${schoolsToDelete.length} schools to delete.`);

    // Batch delete schools
    let schoolBatch = db.batch();
    let schoolDeleteCount = 0;
    for (const schoolId of schoolsToDelete) {
        const schoolRef = schoolsRef.doc(schoolId);
        schoolBatch.delete(schoolRef);
        schoolDeleteCount++;
        if(schoolDeleteCount % 400 === 0){
             await schoolBatch.commit();
             schoolBatch = db.batch();
        }
    }
    await schoolBatch.commit();
    console.log(`  - ✅ Deleted ${schoolDeleteCount} school documents.`);


    // Batch delete associated students
    // We need to do this in chunks because a 'where-in' query can only handle up to 30 items.
    const studentChunkSize = 30;
    let studentDeleteCount = 0;
    for (let i = 0; i < schoolsToDelete.length; i += studentChunkSize) {
        const schoolIdChunk = schoolsToDelete.slice(i, i + studentChunkSize);
        const studentsQuery = studentsRef.where('school_dias_code', 'in', schoolIdChunk);
        const studentsSnapshot = await studentsQuery.get();

        if (!studentsSnapshot.empty) {
            let studentBatch = db.batch();
            studentsSnapshot.forEach(doc => {
                studentBatch.delete(doc.ref);
                studentDeleteCount++;
            });
            await studentBatch.commit();
        }
    }
    if (studentDeleteCount > 0) {
      console.log(`  - ✅ Deleted ${studentDeleteCount} associated student documents.`);
    } else {
      console.log(`  - No associated students found to delete.`);
    }
  }

  console.log("\n--- ✅ Data deletion complete. ---");
}

deleteUnknownData().catch(error => {
  console.error("❌ A critical error occurred during the data deletion process:", error);
});
