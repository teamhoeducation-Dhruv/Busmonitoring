
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Deletes a specific list of invalid student records from the database.
 */
async function deleteInvalidStudents() {
  console.log("🗑️  Starting deletion of specific invalid student records...");

  const invalidStudents = [
    {
      districtId: "Bharuch",
      studentId: "Bharuch-unknown_school_484-UnknownStudent484-484",
    },
    {
      districtId: "Narmada",
      studentId: "Narmada-24200101802-UnknownStudent2009-2009",
    },
    {
      districtId: "Panchamahal",
      studentId: "Panchamahal-24170103005-UnknownStudent1802-1802",
    },
  ];

  let successCount = 0;

  for (const record of invalidStudents) {
    try {
      const studentRef = db.collection('districts').doc(record.districtId).collection('students').doc(record.studentId);
      await studentRef.delete();
      console.log(`  - ✅ Successfully deleted student: ${record.studentId} from district: ${record.districtId}`);
      successCount++;
    } catch (error) {
      console.error(`  - ❌ Failed to delete student: ${record.studentId}. Reason:`, error);
    }
  }

  if (successCount === invalidStudents.length) {
    console.log("\n--- ✅ Success: All targeted invalid student records have been deleted. ---");
  } else {
    console.log(`\n--- ⚠️ Warning: Only deleted ${successCount} out of ${invalidStudents.length} records. Please review the errors above. ---`);
  }
}

deleteInvalidStudents().catch(error => {
  console.error("❌ A critical error occurred during the deletion process:", error);
});
