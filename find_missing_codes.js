
import xlsx from 'xlsx';

/**
 * Reads data.xlsx and logs all rows that are missing a "School DISE Code".
 */
function findMissingSchoolCodes() {
  console.log("🔍 Starting analysis of data.xlsx for missing school codes...");

  try {
    const workbook = xlsx.readFile('data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    console.log(`- Total records found in spreadsheet: ${data.length}`);

    const missingCodeRows = [];

    data.forEach((item, index) => {
      // Check if "School DISE Code" is null, undefined, or an empty string
      if (item["School DISE Code"] == null || String(item["School DISE Code"]).trim() === '') {
        missingCodeRows.push({ 
          rowNumber: index + 2, // Adding 2 to match spreadsheet row number (1 for header, 1 for 0-based index)
          studentName: item["Student's Name"] || "N/A",
          schoolName: item["School Name"] || "N/A",
          district: item["District"] || "N/A",
        });
      }
    });

    if (missingCodeRows.length === 0) {
      console.log("\n--- ✅ Success: No records are missing the 'School DISE Code'. ---");
    } else {
      console.log(`\n--- ⚠️ Found ${missingCodeRows.length} records missing the 'School DISE Code'. ---`);
      console.log("Please add the correct 'School DISE Code' to the following rows in data.xlsx:");
      missingCodeRows.forEach(row => {
        console.log(`  - Row ${row.rowNumber}: Student: "${row.studentName}", School: "${row.schoolName}", District: "${row.district}"`);
      });
    }

  } catch (error) {
    console.error("❌ An error occurred while reading or processing data.xlsx:", error);
    console.error("Please ensure the file 'data.xlsx' exists in the project root and is not corrupted.");
  }
}

findMissingSchoolCodes();
