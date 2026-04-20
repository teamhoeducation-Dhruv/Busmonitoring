<?php
// api/add_student.php
require_once 'db.php';
checkAuth();
// Temporarily logging CSRF status
$token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
error_log("Add Student: CSRF Token received: " . $token);

try {
    checkCsrf();
} catch (Exception $e) {
    error_log("Add Student: CSRF check failed");
    jsonResponse(['error' => 'CSRF failure'], 403);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $name = trim($data['name'] ?? '');
    $school_dias_code = trim($data['school_dias_code'] ?? '');
    $standard = trim($data['standard'] ?? '');
    $districtSlug = trim($data['districtSlug'] ?? '');
    
    // Optional bus details
    $bus_number = trim($data['bus_number'] ?? '');
    $bus_pass_number = trim($data['bus_pass_number'] ?? '');
    $bus_time_morning = trim($data['bus_time_morning'] ?? '');
    $bus_time_evening = trim($data['bus_time_evening'] ?? '');
    
    if (!$name || !$school_dias_code || !$districtSlug) {
        jsonResponse(['error' => 'Missing required fields'], 400);
    }
    
    $pdo = getDbConnection();
    
    try {
        $userDistrictId = $_SESSION['district_id'] ?? null;
        $userRole = $_SESSION['role'] ?? '';
        $user_id = $_SESSION['user_id'] ?? null;
        $isAdmin = ($userRole === 'admin');

        // Self-Healing: If district_id is missing from session, fetch it fresh
        if (!$isAdmin && $userRole === 'school' && $userDistrictId === null && $user_id !== null) {
            $uStmt = $pdo->prepare("SELECT district_id FROM users WHERE id = ?");
            $uStmt->execute([$user_id]);
            $userData = $uStmt->fetch();
            if ($userData) {
                $userDistrictId = $userData['district_id'];
                $_SESSION['district_id'] = $userDistrictId; 
            }
        }

        $dStmt = $pdo->prepare("SELECT id FROM districts WHERE slug = ?");
        $dStmt->execute([$districtSlug]);
        $district = $dStmt->fetch();
        
        if (!$district) {
            jsonResponse(['error' => 'District not found'], 404);
        }

        // For school users, verify they belong to the district they are adding to
        if (!$isAdmin && $userRole === 'school' && $district['id'] != $userDistrictId) {
            jsonResponse(['error' => 'Permission denied - district mismatch'], 403);
        }
        
        // Final sanity check: Does this school exist?
        $scCheck = $pdo->prepare("SELECT id FROM schools WHERE dias_code = ?");
        $scCheck->execute([$school_dias_code]);
        if (!$scCheck->fetch()) {
            jsonResponse(['error' => 'School not found'], 404);
        }

        $stmt = $pdo->prepare("INSERT INTO students (name, school_dias_code, district_id, standard, bus_number, bus_pass_number, bus_time_morning, bus_time_evening) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $school_dias_code, $district['id'], $standard, $bus_number, $bus_pass_number, $bus_time_morning, $bus_time_evening]);
        
        jsonResponse(['status' => 'success']);
    } catch (Exception $e) {
        jsonResponse(['error' => 'Failed to add student: ' . $e->getMessage()], 500);
    }
}

jsonResponse(['error' => 'Invalid method'], 405);
?>
