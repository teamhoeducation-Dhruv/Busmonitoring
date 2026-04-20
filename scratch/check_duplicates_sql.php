<?php
require_once 'api/db.php';
try {
    $pdo = getDbConnection();
    echo "--- Checking for Duplicates in PostgreSQL ---\n";
    
    // Check for duplicate students by name and school within a district
    $stmt = $pdo->query("
        SELECT name, school_dias_code, district_id, COUNT(*) 
        FROM students 
        GROUP BY name, school_dias_code, district_id 
        HAVING COUNT(*) > 1
    ");
    $duplicates = $stmt->fetchAll();
    
    if (empty($duplicates)) {
        echo "No name-based duplicates found in students table.\n";
    } else {
        echo "Found " . count($duplicates) . " duplicate student groups:\n";
        foreach ($duplicates as $row) {
            echo "- Name: {$row['name']}, School: {$row['school_dias_code']}, Count: {$row['count']}\n";
        }
    }

    // Check for duplicate schools by dias_code
    $stmt = $pdo->query("SELECT dias_code, COUNT(*) FROM schools GROUP BY dias_code HAVING COUNT(*) > 1");
    $duplicates = $stmt->fetchAll();
    if (empty($duplicates)) {
        echo "No duplicate schools by DIAS code found.\n";
    } else {
        echo "Found duplicate schools!\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
 d:\Bus Monitoring Portal\scratch\check_duplicates_sql.php
