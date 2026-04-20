
import admin from "firebase-admin";
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

// 🔹 Firebase init
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Finds and deletes all Firebase Authentication users whose email starts with 'unknown_school_'.
 */
async function deleteUnknownSchoolUsers() {
  console.log("🚀 Starting deletion process for 'unknown_school' users...");

  const usersToDelete = [];
  let pageToken;

  // Loop through all pages of authenticated users.
  while (true) {
    const listUsersResult = await admin.auth().listUsers(1000, pageToken);
    listUsersResult.users.forEach(userRecord => {
      if (userRecord.email && userRecord.email.startsWith('unknown_school_')) {
        usersToDelete.push({ email: userRecord.email, uid: userRecord.uid });
      }
    });

    pageToken = listUsersResult.pageToken;
    if (!pageToken) {
      break;
    }
  }

  if (usersToDelete.length === 0) {
    console.log("\n--- Finished: No users found starting with 'unknown_school_'. ---");
    return;
  }

  console.log(`\n🔎 Found ${usersToDelete.length} users to delete:`);
  // Log first 10 found users for reference
  usersToDelete.slice(0, 10).forEach(user => console.log(`  - ${user.email}`));
  if (usersToDelete.length > 10) console.log('  ...');

  // Extract UIDs for bulk deletion
  const uidsToDelete = usersToDelete.map(user => user.uid);
  
  // Firebase allows deleting up to 1000 users at a time.
  const batchSize = 1000;
  let totalDeleted = 0;
  for (let i = 0; i < uidsToDelete.length; i += batchSize) {
    const batchUids = uidsToDelete.slice(i, i + batchSize);
    try {
        const deleteResult = await admin.auth().deleteUsers(batchUids);
        totalDeleted += deleteResult.successCount;
        console.log(`\n🗑️ Successfully deleted ${deleteResult.successCount} users.`);
        if (deleteResult.failureCount > 0) {
            console.error(`❌ Failed to delete ${deleteResult.failureCount} users. Errors:`);
            deleteResult.errors.forEach(err => console.error(err.error));
        }
    } catch (error) {
        console.error('An error occurred during batch deletion:', error);
    }
  }

  console.log(`\n--- Success: Removed a total of ${totalDeleted} 'unknown_school' users. ---`);
}

// 🔹 Run the deletion script
deleteUnknownSchoolUsers().catch(error => {
  console.error("❌ A critical error occurred during the user deletion process:", error);
});
