import admin from "firebase-admin";

// 🔹 Firebase init
import serviceAccount from "./serviceAccountKey.json" assert { type: "json" };

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// 🔧 CONFIG
const DRY_RUN = false; // ❗ change to false to delete
const BATCH_LIMIT = 450;

// 🔹 Helpers
const normalize = (val) =>
  String(val || "").trim().toLowerCase();

async function deleteDuplicateStudents() {
  console.log(
    DRY_RUN
      ? "🟡 DRY RUN MODE — NO DATA WILL BE DELETED"
      : "🔴 DELETE MODE — DUPLICATES WILL BE REMOVED"
  );

  const districtsSnap = await db.collection("districts").get();
  console.log(`📍 Districts found: ${districtsSnap.size}`);

  let totalDuplicates = 0;
  let totalDeleted = 0;

  for (const districtDoc of districtsSnap.docs) {
    const districtId = districtDoc.id;
    console.log(`\n🏫 Processing district: ${districtId}`);

    const studentsRef = districtDoc.ref.collection("students");
    const studentsSnap = await studentsRef.get();

    console.log(`👨‍🎓 Students found: ${studentsSnap.size}`);

    const studentMap = new Map();
    const duplicates = [];

    studentsSnap.forEach((doc) => {
      const data = doc.data();

      const key = [
        normalize(data.name),
        normalize(data.busPassNo),
        normalize(data.schoolDiseCode),
        normalize(districtId),
      ].join("|");

      if (!studentMap.has(key)) {
        studentMap.set(key, doc);
      } else {
        duplicates.push(doc);
      }
    });

    console.log(`❌ Duplicates detected: ${duplicates.length}`);
    totalDuplicates += duplicates.length;

    if (duplicates.length === 0) continue;

    // 🔥 Delete in batches
    let batch = db.batch();
    let opCount = 0;

    for (const dupDoc of duplicates) {
      if (!DRY_RUN) {
        batch.delete(dupDoc.ref);
        opCount++;
        totalDeleted++;
      } else {
        console.log(`🟡 Would delete: ${dupDoc.ref.path}`);
      }

      if (opCount >= BATCH_LIMIT) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (!DRY_RUN && opCount > 0) {
      await batch.commit();
    }
  }

  console.log("\n===============================");
  console.log(`✅ Duplicate records found: ${totalDuplicates}`);
  console.log(`🗑️ Records deleted: ${DRY_RUN ? 0 : totalDeleted}`);
  console.log("===============================\n");

  console.log("🎯 DUPLICATE CLEANUP COMPLETED");
}

// 🔹 Run
deleteDuplicateStudents().catch(console.error);
