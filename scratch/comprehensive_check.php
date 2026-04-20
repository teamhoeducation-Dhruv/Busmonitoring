<?php
require_once 'api/db.php';
try {
    $pdo = getDbConnection();
    echo "--- System Status Check ---\n";
    
    $dist = $pdo->query("SELECT id, name FROM districts WHERE id=32")->fetch();
    if ($dist) {
        echo "District 32 Name: " . $dist['name'] . "\n";
    }

    $stmt = $pdo->query("SELECT COUNT(*) FROM students WHERE district_id IS NULL OR school_dias_code IS NULL");
    echo "Students with missing links: " . $stmt->fetchColumn() . "\n";

    $stmt = $pdo->query("SELECT school_dias_code, COUNT(*) FROM students GROUP BY school_dias_code");
    echo "\nStudents per School:\n";
    foreach ($stmt as $row) {
        echo "School {$row['school_dias_code']}: {$row['count']}\n";
    }

    $stmt = $pdo->query("SELECT date, student_name, school_name FROM daily_submissions ORDER BY date DESC LIMIT 5");
    echo "\nLatest Submissions:\n";
    foreach ($stmt as $row) {
        echo "{$row['date']}: {$row['student_name']} ({$row['school_name']})\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
 d:\Bus Monitoring Portal\scratch\comprehensive_check.php
