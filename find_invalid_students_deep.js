
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * Scans all student records nested under schools and reports any that are missing a valid name field.
 */
async function findInvalidStudentsDeep() {
  console.log("🕵️  Starting deep scan for student records with missing names (districts -> schools -> students)...");

  const districtsSnapshot = await db.collection('districts').get();
  if (districtsSnapshot.empty) {
    console.log("No districts found. Exiting.");
    return;
  }

  let invalidStudentCount = 0;

  for (const districtDoc of districtsSnapshot.docs) {
    const districtId = districtDoc.id;
    const schoolsRef = districtDoc.ref.collection('schools');
    const schoolsSnapshot = await schoolsRef.get();

    if (schoolsSnapshot.empty) {
      continue; // Skip if no schools in the district
    }

    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      const studentsRef = schoolDoc.ref.collection('students');
      const studentsSnapshot = await studentsRef.get();

      if (studentsSnapshot.empty) {
        continue; // Skip if no students in the school
      }

      studentsSnapshot.forEach(studentDoc => {
        const studentData = studentDoc.data();
        
        // Check if both potential name fields are missing, null, empty, or 'N/A'
        const hasName = studentData && 
                        ( (studentData.name && String(studentData.name).trim() !== 'N/A' && String(studentData.name).trim() !== '') || 
                          (studentData.student_name && String(studentData.student_name).trim() !== 'N/A' && String(studentData.student_name).trim() !== '') );

        if (!hasName) {
          invalidStudentCount++;
          console.log(`
--- ⚠️ Found Invalid Student Record ---`);
          console.log(`  - District ID: ${districtId}`);
          console.log(`  - School ID: ${schoolId}`);
          console.log(`  - Student Document ID: ${studentDoc.id}`);
          console.log(`  - Full Data: ${JSON.stringify(studentData)}`);
        }
      });
    }
  }

  if (invalidStudentCount === 0) {
    console.log("\n--- ✅ Success: All student records appear to have valid name fields in the deep scan. ---");
  } else {
    console.log(`\n--- 📊 Scan Complete: Found a total of ${invalidStudentCount} invalid student records. ---`);
    console.log("Please review the records listed above. These are the true source of the error.");
  }
}

findInvalidStudentsDeep().catch(error => {
  console.error("❌ A critical error occurred during the deep data scan:", error);
});
