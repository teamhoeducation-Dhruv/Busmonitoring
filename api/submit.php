<?php
// api/submit.php
require_once 'db.php';
checkAuth();
checkCsrf();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    $action = $_GET['action'] ?? '';
    $pdo = getDbConnection();
    
    // Authorization helper
    $userDistrictId = $_SESSION['district_id'] ?? null;
    $isAdmin = ($_SESSION['role'] === 'admin');

    if ($action === 'remark') {
        $schoolCode = $data['schoolCode'] ?? '';
        $remark = $data['remark'] ?? '';
        $date = $data['date'] ?? date('Y-m-d');
        
        if (!$schoolCode || !$remark) {
            jsonResponse(['error' => 'Missing data'], 400);
        }
        
        // Scope to user's district if not admin
        $sql = "INSERT INTO daily_remarks (date, school_dias_code, district_id, school_name, remark) 
                SELECT ?, sc.dias_code, sc.district_id, sc.name, ? 
                FROM schools sc WHERE sc.dias_code = ?";
        $params = [$date, $remark, $schoolCode];

        if (!$isAdmin) {
            $sql .= " AND sc.district_id = ?";
            $params[] = $userDistrictId;
        }
        $sql .= " LIMIT 1";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        
        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'Permission denied or school not found'], 403);
        }
        jsonResponse(['status' => 'success']);
    }

    if ($action === 'delete_student') {
        $studentId = $data['studentId'] ?? '';
        if (!$studentId) jsonResponse(['error' => 'Missing student ID'], 400);
        
        $sql = "DELETE FROM students WHERE id = ?";
        $params = [$studentId];
        
        if (!$isAdmin) {
            $sql .= " AND district_id = ?";
            $params[] = $userDistrictId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'Permission denied or student not found'], 403);
        }
        jsonResponse(['status' => 'success']);
    }

    if ($action === 'update_student') {
        $studentId = $data['studentId'] ?? '';
        if (!$studentId) jsonResponse(['error' => 'Missing student ID'], 400);
        
        $sql = "UPDATE students SET name = ?, standard = ?, bus_number = ?, bus_pass_number = ?, bus_time_morning = ?, bus_time_evening = ? WHERE id = ?";
        $params = [
            $data['name'],
            $data['standard'],
            $data['bus_number'],
            $data['bus_pass_number'],
            $data['bus_time_morning'],
            $data['bus_time_evening'],
            $studentId
        ];

        if (!$isAdmin) {
            $sql .= " AND district_id = ?";
            $params[] = $userDistrictId;
        }

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        if ($stmt->rowCount() === 0) {
            jsonResponse(['error' => 'Permission denied or student not found'], 403);
        }
        jsonResponse(['status' => 'success']);
    }

    $updates = $data['updates'] ?? [];
    
    if (empty($updates)) {
        jsonResponse(['status' => 'success', 'message' => 'No updates']);
    }
    
    $pdo->beginTransaction();
    
    try {
        $updateSql = "UPDATE students SET traveling_bus = ?, not_traveling_bus = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        if (!$isAdmin) $updateSql .= " AND district_id = ?";

        $historySql = "INSERT INTO daily_submissions (date, student_id, district_id, school_dias_code, student_name, school_name, traveling_bus, remarks, bus_number) 
                       SELECT CURRENT_DATE, s.id, s.district_id, s.school_dias_code, s.name, sc.name, ?, ?, s.bus_number 
                       FROM students s 
                       JOIN schools sc ON s.school_dias_code = sc.dias_code 
                       WHERE s.id = ?";
        if (!$isAdmin) $historySql .= " AND s.district_id = ?";

        $updateStmt = $pdo->prepare($updateSql);
        $historyStmt = $pdo->prepare($historySql);
                                     
        foreach ($updates as $u) {
            $isTraveling = $u['traveling_bus'] ? 1 : 0;
            $studentId = $u['studentId'];
            $remarks = $u['remarks'] ?? null;
            
            $uParams = [$isTraveling, $u['not_traveling_bus'] ? 1 : 0, $studentId];
            if (!$isAdmin) $uParams[] = $userDistrictId;
            $updateStmt->execute($uParams);
            
            if ($updateStmt->rowCount() > 0) {
                $hParams = [$isTraveling, $remarks, $studentId];
                if (!$isAdmin) $hParams[] = $userDistrictId;
                $historyStmt->execute($hParams);
            }
        }
        $pdo->commit();
        jsonResponse(['status' => 'success']);
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Update error: " . $e->getMessage());
        jsonResponse(['error' => 'Failed to update: ' . $e->getMessage()], 500);
    }
}

jsonResponse(['error' => 'Invalid method'], 405);
?>
