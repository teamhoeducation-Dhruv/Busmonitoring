<?php
require 'api/db.php';
$pdo = getDbConnection();
$date = '2026-04-20';
$stmt = $pdo->prepare("
    SELECT DISTINCT COALESCE(ds.bus_number, s.bus_number) as bus_number
    FROM daily_submissions ds
    JOIN students s ON ds.student_id = s.id
    WHERE ds.date = ? AND ds.traveling_bus = true
    AND (ds.bus_number IS NOT NULL AND ds.bus_number != '' OR s.bus_number IS NOT NULL AND s.bus_number != '')
");
$stmt->execute([$date]);
$busNumbers = $stmt->fetchAll(PDO::FETCH_COLUMN);

echo "Bus numbers for $date:\n";
print_r($busNumbers);
?>
