<?php
require_once 'api/db.php';
try {
    $pdo = getDbConnection();
    $stmt = $pdo->query("SELECT column_name FROM information_schema.columns WHERE table_name = 'daily_remarks'");
    echo "Columns in daily_remarks:\n";
    foreach ($stmt as $row) {
        echo "- {$row['column_name']}\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
 d:\Bus Monitoring Portal\scratch\check_remarks_columns.php
