<?php
require_once 'db.php';
// This script automatically logs in as master1@cotd.com for testing purposes.
$pdo = getDbConnection();
$stmt = $pdo->prepare("SELECT u.id, u.email, u.role, u.district_id, d.slug as district_slug 
                       FROM users u 
                       LEFT JOIN districts d ON u.district_id = d.id 
                       WHERE u.email = 'master1@cotd.com'");
$stmt->execute();
$user = $stmt->fetch();

if ($user) {
    session_start();
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['district_id'] = $user['district_id'];
    $_SESSION['district_slug'] = $user['district_slug'];
    
    echo "<h1>Auto-login Successful</h1>";
    echo "<p>Logged in as: master1@cotd.com</p>";
    echo "<p><a href='../public/master.html'>Go to Master Dashboard</a></p>";
} else {
    echo "<h1>Auto-login Failed</h1>";
    echo "<p>User master1@cotd.com not found in database.</p>";
}
?>
 d:\Bus Monitoring Portal\api\test_login.php
