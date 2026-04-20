<?php
// scratch/check_db.php
require_once __DIR__ . '/../api/config.php';
require_once __DIR__ . '/../api/db.php';

try {
    $pdo = getDbConnection();
    echo "Connected successfully to " . DB_HOST . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM districts");
    echo "Districts count: " . $stmt->fetchColumn() . "\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) FROM talukas");
    echo "Talukas count: " . $stmt->fetchColumn() . "\n";
    
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
?>
