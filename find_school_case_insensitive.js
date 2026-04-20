
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// --- CONFIGURATION ---
const schoolCodesToFind = ["c-510", "pb-551"]; // The codes to check, will be checked case-insensitively

// ---------------------

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function findSchoolsCaseInsensitive() {
  console.log(`🕵️  Searching for school codes: ${schoolCodesToFind.join(', ')} (case-insensitive)`);

  const lowerCaseCodes = schoolCodesToFind.map(c => c.toLowerCase());

  try {
    // 1. Check in 'schools' collection group
    console.log(`\n--- Searching in 'schools' collection group ---`);
    const schoolsSnapshot = await db.collectionGroup('schools').get();
    let schoolsFound = [];
    schoolsSnapshot.forEach(doc => {
      const data = doc.data();
      const diasCode = data.dias_code;
      if (diasCode && lowerCaseCodes.includes(diasCode.toLowerCase())) {
        console.log(`  ✅ Found match in 'schools':`);
        console.log(`     - Path: ${doc.ref.path}`);
        console.log(`     - Stored dias_code: "${diasCode}"`);
        console.log(`     - Full data: ${JSON.stringify(data)}`);
        schoolsFound.push(diasCode);
      }
    });
    if (schoolsFound.length === 0) {
      console.log(`  ℹ️  No matches found in the 'schools' collection group.`);
    }

    // 2. Check in 'students' collection group
    console.log(`\n--- Searching in 'students' collection group ---`);
    const studentsSnapshot = await db.collectionGroup('students').get();
    let studentsFound = new Set(); // Use a Set to only log for a school code once
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      const schoolCode = data.school_dias_code;
      if (schoolCode && lowerCaseCodes.includes(schoolCode.toLowerCase()) && !studentsFound.has(schoolCode.toLowerCase())) {
        console.log(`  ✅ Found match in 'students':`);
        console.log(`     - Path: ${doc.ref.path}`);
        console.log(`     - Stored school_dias_code: "${schoolCode}"`);
        studentsFound.add(schoolCode.toLowerCase());
        // Do not log the full data as it's just a student record
      }
    });
    if (studentsFound.size === 0) {
      console.log(`  ℹ️  No matches found in the 'students' collection group.`);
    }

    console.log('\n--- Scan Complete ---');

  } catch (error) {
    console.error("❌ A critical error occurred during the scan:", error);
  }
}

findSchoolsCaseInsensitive();
