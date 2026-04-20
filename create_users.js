
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// 🔹 Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Creates a Firebase Authentication user.
 * Skips if the user already exists.
 * @param {string} email The email for the new user.
 */
async function createAuthUser(email) {
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: "password", // Default password for all created users
    });
    console.log(`✅ Successfully created new user: ${userRecord.email}`);
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      // This is expected, do nothing.
    } else {
      console.error(`❌ Error creating user ${email}:`, error);
    }
  }
}

/**
 * Fetches all districts and schools from Firestore and creates auth users for them.
 * It intelligently handles placeholder "unknown_school_" document IDs by using the
 * 'dias_code' field from within the document when available.
 */
async function createUsersFromFirestore() {
  console.log("🚀 Starting user creation process from Firestore data...");

  const districtsSnapshot = await db.collection('districts').get();
  console.log(`Found ${districtsSnapshot.size} districts. Processing...`);

  // Using Promise.all to process districts and their schools concurrently
  await Promise.all(districtsSnapshot.docs.map(async (districtDoc) => {
    const districtId = districtDoc.id;
    
    // Create District Admin User
    const districtEmail = `${districtId}@cotd.com`;
    await createAuthUser(districtEmail);

    // Get all schools in the district
    const schoolsSnapshot = await districtDoc.ref.collection('schools').get();
    
    // Create School Admin Users
    await Promise.all(schoolsSnapshot.docs.map(async (schoolDoc) => {
      let schoolIdToUse = schoolDoc.id;
      const schoolData = schoolDoc.data();

      // If the doc ID is a placeholder, try to use the 'dias_code' field instead.
      if (schoolIdToUse.startsWith('unknown_school_') && schoolData.dias_code) {
        console.log(`🟡 Placeholder ID ${schoolIdToUse} found. Using 'dias_code': ${schoolData.dias_code}`);
        schoolIdToUse = schoolData.dias_code;
      }

      if (schoolIdToUse) {
        const schoolEmail = `${schoolIdToUse}@${districtId}.school`;
        await createAuthUser(schoolEmail);
      } else {
        console.error(`❌ Skipping user creation for doc ${schoolDoc.id} due to missing ID.`);
      }
    }));
  }));

  console.log("\n--- User Creation Complete ---");
  console.log("All existing districts and schools should now have corresponding auth users.");
}

// 🔹 Run the user creation script
createUsersFromFirestore().catch(error => {
  console.error("❌ A critical error occurred during the user creation process:", error);
});
