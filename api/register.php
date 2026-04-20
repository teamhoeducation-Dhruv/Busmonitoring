<?php
// api/register.php
require_once 'db.php';

// Public endpoint, but still protected by method check
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['error' => 'Method not allowed'], 405);
}

$data = json_decode(file_get_contents('php://input'), true);

$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';
$confirmPassword = $data['confirm_password'] ?? '';
$district_id = (int)($data['district_id'] ?? 0);
$taluka_id = (int)($data['taluka_id'] ?? 0);
$school_name = trim($data['school_name'] ?? '');
$dias_code = trim($data['dias_code'] ?? '');

// 1. Basic Validation
if (!$email || !$password || !$district_id || !$taluka_id || !$school_name || !$dias_code) {
    jsonResponse(['error' => 'All fields are required'], 400);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['error' => 'Invalid email format'], 400);
}

if ($password !== $confirmPassword) {
    jsonResponse(['error' => 'Passwords do not match'], 400);
}

if (strlen($password) < 8) {
    jsonResponse(['error' => 'Password must be at least 8 characters long'], 400);
}

$pdo = getDbConnection();

try {
    // 2. Check for duplicate Email or DISE code in users table
    $stmt = $pdo->prepare("SELECT email, school_dias_code FROM users WHERE LOWER(email) = LOWER(?) OR school_dias_code = ?");
    $stmt->execute([$email, $dias_code]);
    $existing = $stmt->fetch();
    
    if ($existing) {
        if (strtolower($existing['email']) === strtolower($email)) {
            jsonResponse(['error' => 'A user with this email already exists'], 400);
        } else {
            jsonResponse(['error' => 'A user for this DISE code is already registered'], 400);
        }
    }

    $pdo->beginTransaction();

    // 3. Ensure the school exists in the schools table
    // If it doesn't, we create it; if it does, we associate the user with it.
    $stmt = $pdo->prepare("SELECT id FROM schools WHERE LOWER(dias_code) = LOWER(?)");
    $stmt->execute([$dias_code]);
    $school = $stmt->fetch();

    if (!$school) {
        $stmt = $pdo->prepare("INSERT INTO schools (dias_code, name, district_id, taluka_id) VALUES (?, ?, ?, ?)");
        $stmt->execute([$dias_code, $school_name, $district_id, $taluka_id]);
    }

    // 4. Create the user
    $password_hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, password_hash, role, district_id, school_dias_code) VALUES (?, ?, 'school', ?, ?)");
    $stmt->execute([$email, $password_hash, $district_id, $dias_code]);

    $pdo->commit();

    jsonResponse(['status' => 'success', 'message' => 'Registration successful! Please log in.']);

} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonResponse(['error' => 'Database error during registration. Please check if your district/taluka selection is valid.'], 500);
}
?>
