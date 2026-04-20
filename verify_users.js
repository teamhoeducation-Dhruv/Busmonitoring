import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// 🔹 Firebase init
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Verifies that all districts and schools from Firestore have a corresponding auth user.
 */
async function verifyFirestoreUsers() {
  console.log("🚀 Starting verification process...");

  // 1. Get all authenticated user emails from the CSV
  const csvPath = path.join(process.cwd(), "authenticated_users.csv");
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Error: `authenticated_users.csv` not found.");
    console.error("Please run the `download_logins.js` script first.");
    return;
  }
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  
  // Parse the CSV to get a set of emails, handling quoted values.
  const authEmails = new Set(csvContent.split('\n').slice(1).map(row => {
      const emailField = row.split(',')[0];
      // Remove leading/trailing quotes that are added by the CSV generation
      if (emailField && emailField.startsWith('"') && emailField.endsWith('"')) {
          return emailField.slice(1, -1);
      }
      return emailField;
  }).filter(Boolean)); // Filter out any empty rows

  console.log(`Loaded ${authEmails.size} existing users from CSV.`);

  const missingUsers = [];

  // 2. Get all districts from Firestore
  const districtsSnapshot = await db.collection('districts').get();
  console.log(`Found ${districtsSnapshot.size} districts in Firestore. Now checking...`);

  for (const districtDoc of districtsSnapshot.docs) {
    const districtId = districtDoc.id;

    // 3. Check for district admin user
    const districtEmail = `${districtId}@cotd.com`;
    if (!authEmails.has(districtEmail)) {
      missingUsers.push({ type: "District Admin", email: districtEmail, reason: "Not found in authenticated users" });
    }

    // 4. Get all schools in the district
    const schoolsSnapshot = await districtDoc.ref.collection('schools').get();
    for (const schoolDoc of schoolsSnapshot.docs) {
      const schoolId = schoolDoc.id;
      
      // 5. Check for school admin user
      const schoolEmail = `${schoolId}@${districtId}.school`;
      if (!authEmails.has(schoolEmail)) {
        missingUsers.push({ type: "School Admin", email: schoolEmail, reason: "Not found in authenticated users" });
      }
    }
  }

  // 6. Report the results
  console.log("\n--- Verification Complete ---");
  if (missingUsers.length === 0) {
    console.log("\n✅ All good! Every district and school in Firestore has a corresponding authenticated user.");
  } else {
    console.log(`\n🚨 Found ${missingUsers.length} missing users:`);
    console.table(missingUsers);
    console.log("\nTo fix this, you can re-run the `seed.js` script to create the missing users.");
  }
}

// 🔹 Run
verifyFirestoreUsers().catch(error => {
  console.error("❌ An error occurred during verification:", error);
});
