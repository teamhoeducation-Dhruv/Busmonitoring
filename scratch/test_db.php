<?php
require_once 'api/db.php';
try {
    $pdo = getDbConnection();
    echo "Connected successfully to " . DB_NAME . " at " . DB_HOST . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM students");
    echo "Total Students: " . $stmt->fetchColumn() . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM schools");
    echo "Total Schools: " . $stmt->fetchColumn() . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM daily_submissions");
    echo "Total Submissions: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->query("SELECT district_id, COUNT(*) as count FROM students GROUP BY district_id ORDER BY district_id");
    echo "\nStudents per District:\n";
    foreach ($stmt as $row) {
        echo "District {$row['district_id']}: {$row['count']}\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
