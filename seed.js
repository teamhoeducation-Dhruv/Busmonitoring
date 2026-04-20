
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import admin from "firebase-admin";
import xlsx from 'xlsx';
import serviceAccount from './serviceAccountKey.json' assert { type: 'json' };

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyCoMoMKUwuDW_9ZmfwuyWRhKBaWDCb0UJg",
    authDomain: "cotd-survey-b19cf.firebaseapp.com",
    projectId: "cotd-survey-b19cf",
    storageBucket: "cotd-survey-b19cf.appspot.com",
    messagingSenderId: "1046494039326",
    appId: "1:1046494039326:web:54477d764d528bf52c8d0f",
    measurementId: "G-7YXL7CZLGL"
};
initializeApp(firebaseConfig);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// --- Data Sanitization Helper ---
function sanitizeString(str) {
    if (typeof str !== 'string') {
        str = String(str);
    }
    return str.replace(/\//g, '-').replace(/\s/g, '').replace(/[\u0a80-\u0aff]/g, (match) => {
        const gujaratiNumerals = {
            '૦': '0', '૧': '1', '૨': '2', '૩': '3', '૪': '4',
            '૫': '5', '૬': '6', '૭': '7', '૮': '8', '૯': '9'
        };
        return gujaratiNumerals[match] || match;
    });
}

// --- AUTH USER CREATION (Harmless to run, ignores existing users) ---
async function createAuthUsers(data, districtPassword) {
    const auth = admin.auth();
    const districts = new Set();
    const schools = new Map();
    data.forEach(item => {
        if (item.District) districts.add(sanitizeString(item.District));
        if (item["School DISE Code"] && item.District) {
            const schoolId = sanitizeString(item["School DISE Code"]);
            const districtId = sanitizeString(item.District);
            if (schoolId && !schools.has(schoolId)) schools.set(schoolId, { districtId });
        }
    });
    console.log("--- Checking/Creating Auth Users ---");
    for (const district of districts) {
        try { await auth.createUser({ email: `${district}@cotd.com`, password: districtPassword }); } catch (e) { /* Ignore */ }
    }
    for (const [schoolId, schoolInfo] of schools.entries()) {
        let password = schoolId; if (password.length < 6) password = "123456";
        try { await auth.createUser({ email: `${schoolId}@${schoolInfo.districtId}.school`, password }); } catch (e) { /* Ignore */ }
    }
    console.log("--- Auth User Check Complete ---");
}

// --- FINAL, UNCONDITIONAL UPDATE/INSERT LOGIC ---
async function upsertFirestore(data) {
    console.log("--- UPSERTING: Updating existing data and adding new records without deleting. ---");
    const BATCH_SIZE = 400;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const chunk = data.slice(i, i + BATCH_SIZE);
        console.log(`- Processing records ${i + 1} to ${i + chunk.length} of ${data.length}...`);

        chunk.forEach((item, chunkIndex) => {
            const absoluteIndex = i + chunkIndex;

            const districtNameRaw = item["District"] || "Unknown District";
            const schoolDiseCodeRaw = item["School DISE Code"] || `unknown_school_${absoluteIndex}`;
            const studentNameRaw = item["Student's Name"] || `Unknown Student ${absoluteIndex}`;
            
            const districtName = sanitizeString(districtNameRaw);
            const schoolDiseCode = sanitizeString(schoolDiseCodeRaw);

            const studentId = `${districtName}-${schoolDiseCode}-${sanitizeString(studentNameRaw)}-${absoluteIndex}`;

            const districtRef = db.collection('districts').doc(districtName);
            batch.set(districtRef, { name: districtNameRaw.trim() }, { merge: true });

            const schoolRef = db.collection('districts').doc(districtName).collection('schools').doc(schoolDiseCode);
            batch.set(schoolRef, { 
                name: item["School Name"] || "N/A", 
                dias_code: schoolDiseCode,
                principal_name: item["Principal's Name"] || "N/A",
                principal_contact: item["Principal's Contact No"] || "N/A"
            }, { merge: true });

            const studentRef = db.collection('districts').doc(districtName).collection('students').doc(studentId);
            batch.set(studentRef, {
                name: item["Student's Name"] || "N/A",
                standard: item["Standard (Grade)"] || "N/A",
                school_name: item["School Name"] || "N/A",
                school_dias_code: sanitizeString(schoolDiseCodeRaw),
                district: districtNameRaw.trim(),
                route: item["Route (Starting Point - Ending Point)"] || "N/A",
                beneficiary_villages: item["Names of Beneficiary Villages"] || "N/A",
                address_pickup: item["Address (Pick-up)"] || "N/A",
                bus_pass_no: item["બસપાસ નં."] || "N/A",
                bus_number: item["Bus Number"] || "N/A",
                bus_timing_morning: item["Bus Timing Details: Morning"] || "N/A",
                bus_timing_evening: item["Bus Timing Details: Evening"] || "N/A",
                depot_manager_name: item["Depot Manager's Name"] || "N/A",
                depot_manager_contact: item["Depot Manager's Contact No"] || "N/A"
            }, { merge: true }); // merge:true performs the update/insert (upsert)
        });
        await batch.commit();
    }
    console.log("--- Upsert complete. All rows from the file are now in the database. ---");
}

async function runUpdate() {
    try {
        // The purge function has been removed.
        console.log("--- Reading data from data.xlsx for update ---");
        const workbook = xlsx.readFile('data.xlsx');
        const sheetName = workbook.SheetNames[0];
        const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        console.log(`- Found ${data.length} records to process.`);
        
        const districtPassword = "bmb@123";
        await createAuthUsers(data, districtPassword); // Check for any new users
        await upsertFirestore(data); // Run the update/insert process

        console.log("\n--- SCRIPT FINISHED: Database update is complete. ---");
        process.exit(0);
    } catch (error) {
        console.error("FATAL ERROR during update process: ", error);
        process.exit(1);
    }
}

runUpdate();
