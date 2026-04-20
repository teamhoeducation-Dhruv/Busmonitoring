<?php
// api/auth.php
require_once 'db.php';

$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $action === 'login') {
    $data = json_decode(file_get_contents('php://input'), true);
    $email = $data['email'] ?? '';
    $password = $data['password'] ?? '';
    
    $pdo = getDbConnection();
    // Use LOWER() to ignore case
    $stmt = $pdo->prepare("SELECT u.id, u.email, u.password_hash, u.role, u.school_dias_code, u.district_id, d.slug as district_slug 
                           FROM users u 
                           LEFT JOIN districts d ON u.district_id = d.id 
                           WHERE LOWER(u.email) = LOWER(?)");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    
    // For districts, they might not be generated in users table yet, or their password might be '123456'. 
    // In migration, we might temporarily accept simple passwords or generate them.
    // For now, assume password_verify is used.
    if ($user && password_verify($password, $user['password_hash'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['email'] = $user['email'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['district_id'] = $user['district_id'];
        $_SESSION['district_slug'] = $user['district_slug'];
        $_SESSION['school_dias_code'] = $user['school_dias_code'];
        
        jsonResponse([
            'status' => 'success',
            'csrf_token' => generateCsrfToken(),
            'user' => [
                'email' => $user['email'],
                'role' => $user['role'],
                'district_slug' => $user['district_slug'],
                'school_dias_code' => $user['school_dias_code']
            ]
        ]);
    } else {
        jsonResponse(['error' => 'Invalid email or password'], 401);
    }
}

if ($action === 'logout') {
    session_destroy();
    jsonResponse(['status' => 'success']);
}

if ($action === 'status') {
    if (isset($_SESSION['user_id'])) {
        jsonResponse([
            'status' => 'logged_in',
            'user' => [
                'email' => $_SESSION['email'],
                'role' => $_SESSION['role'],
                'district_slug' => $_SESSION['district_slug'] ?? null,
                'school_dias_code' => $_SESSION['school_dias_code'] ?? null
            ]
        ]);
    } else {
        jsonResponse(['status' => 'logged_out']);
    }
}

jsonResponse(['error' => 'Invalid action'], 400);
?>
