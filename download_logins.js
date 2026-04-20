
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

// 🔹 Firebase init
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

/**
 * Escapes a string for CSV format according to RFC 4180 standard.
 * @param {any} value The value to escape.
 * @returns {string} The escaped string, ready for CSV.
 */
function escapeCsv(value) {
  const stringValue = String(value == null ? "" : value);
  
  if (/[",\n\r]/.test(stringValue)) {
    // Enclose in double quotes and escape existing double quotes by doubling them.
    const escapedValue = stringValue.replace(/"/g, '');
    return `"${escapedValue}"`;
  }
  
  return stringValue;
}

/**
 * Downloads all existing Firebase authenticated users and saves them to a CSV file.
 */
async function downloadExistingLogins() {
  console.log("🚀 Starting download of all authenticated users...");

  const allUsers = [];
  let pageToken;

  // Loop through all pages of users
  while (true) {
    const listUsersResult = await admin.auth().listUsers(1000, pageToken);
    listUsersResult.users.forEach(userRecord => {
      allUsers.push({ 
        uid: userRecord.uid,
        email: userRecord.email,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        creationTime: userRecord.metadata.creationTime
      });
    });

    pageToken = listUsersResult.pageToken;
    if (!pageToken) {
      break;
    }
  }

  console.log(`Found a total of ${allUsers.length} authenticated users.`);

  if (allUsers.length === 0) {
    console.log("No users to download.");
    return;
  }

  // Prepare CSV content
  const header = ["Email (Login ID)", "User ID (UID)", "Last Sign-In Time", "Creation Time"];
  const rows = allUsers.map(user => [
    user.email || "N/A", 
    user.uid,
    user.lastSignInTime || "N/A",
    user.creationTime || "N/A"
  ]);

  const csvContent = [header, ...rows]
    .map(row => row.map(escapeCsv).join(','))
    .join("\n");

  const filePath = path.join(process.cwd(), "authenticated_users.csv");
  fs.writeFileSync(filePath, csvContent);

  console.log(`\n✅ Success! All user login IDs have been saved to the following file:`);
  console.log(filePath);
}

// 🔹 Run
downloadExistingLogins().catch(error => {
  console.error("❌ An error occurred while downloading users:", error);
});
