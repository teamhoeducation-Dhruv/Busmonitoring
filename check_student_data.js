
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Scans all student records and reports any that are missing the 'name' or 'student_name' field.
 */
async function checkStudentData() {
  console.log("🕵️  Starting scan for student records with missing names...");

  const districtsSnapshot = await db.collection('districts').get();
  if (districtsSnapshot.empty) {
    console.log("No districts found. Exiting.");
    return;
  }

  let invalidStudentCount = 0;

  for (const districtDoc of districtsSnapshot.docs) {
    const districtId = districtDoc.id;
    const studentsRef = districtDoc.ref.collection('students');
    const studentsSnapshot = await studentsRef.get();

    if (studentsSnapshot.empty) {
      continue; // Skip if no students in the district
    }

    studentsSnapshot.forEach(studentDoc => {
      const studentData = studentDoc.data();
      // Check if both potential name fields are missing or empty
      const hasName = (studentData.name && String(studentData.name).trim() !== 'N/A' && String(studentData.name).trim() !== '') || 
                      (studentData.student_name && String(studentData.student_name).trim() !== 'N/A' && String(studentData.student_name).trim() !== '');

      if (!hasName) {
        invalidStudentCount++;
        console.log(`
--- ⚠️ Found Invalid Student Record ---`);
        console.log(`  - District ID: ${districtId}`);
        // The school is not directly on the student doc, but the dias code is
        console.log(`  - School DIAS Code: ${studentData.school_dias_code || 'Not Set'}`)
        console.log(`  - Student Document ID: ${studentDoc.id}`);
        console.log(`  - Full Data: ${JSON.stringify(studentData)}`);
      }
    });
  }

  if (invalidStudentCount === 0) {
    console.log("\n--- ✅ Success: All student records appear to have valid name fields. ---");
  } else {
    console.log(`\n--- 📊 Scan Complete: Found a total of ${invalidStudentCount} invalid student records. ---`);
    console.log("Please review the records listed above and manually correct them in the Firestore database.");
  }
}

checkStudentData().catch(error => {
  console.error("❌ A critical error occurred during the data scan:", error);
});
