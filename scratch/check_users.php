<?php
require_once 'api/db.php';
try {
    $pdo = getDbConnection();
    $stmt = $pdo->query("SELECT email, role FROM users");
    echo "Users in database:\n";
    foreach ($stmt as $row) {
        echo "- {$row['email']} ({$row['role']})\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
