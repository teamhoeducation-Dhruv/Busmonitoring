<?php
// api/upload.php
require_once 'db.php';
checkAuth(true); // Require admin for upload

$data = json_decode(file_get_contents('php://input'), true);

if (!is_array($data)) {
    jsonResponse(['error' => 'Invalid JSON payload'], 400);
}

$pdo = getDbConnection();
$pdo->beginTransaction();

try {
    $districtStmt = $pdo->prepare("INSERT INTO districts (name, slug) VALUES (?, ?) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id, slug");
    
    $schoolStmt = $pdo->prepare("INSERT INTO schools (dias_code, name, district_id, principal_name, principal_contact) 
                                 VALUES (?, ?, ?, ?, ?) 
                                 ON CONFLICT (dias_code) DO UPDATE SET name=EXCLUDED.name, principal_name=EXCLUDED.principal_name, principal_contact=EXCLUDED.principal_contact RETURNING id");
                                 
    $studentStmt = $pdo->prepare("INSERT INTO students (name, school_dias_code, district_id, route, beneficiary_villages, standard, address, bus_pass_number, bus_number, bus_time_morning, bus_time_evening, depot_manager_name, depot_manager_contact)
                                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");

    $districtsMap = []; // slug -> id
    
    foreach ($data as $row) {
        $districtName = trim($row['District'] ?? '');
        $studentName = trim($row['વિદ્યાર્થીનું નામ'] ?? '');
        $schoolDiasCode = trim($row['શાળાનો ડાયસ કોડ'] ?? '');
        
        if (!$districtName || !$studentName || !$schoolDiasCode) continue;
        
        $districtSlug = strtolower(preg_replace('/\s+/', '_', $districtName));
        
        if (!isset($districtsMap[$districtSlug])) {
             $districtStmt->execute([$districtName, $districtSlug]);
             $dist = $districtStmt->fetch(); // May be empty if ON CONFLICT DO NOTHING, but we are doing DO UPDATE so it should return
             if ($dist) {
                 $districtsMap[$districtSlug] = $dist['id'];
             } else {
                 $s = $pdo->prepare("SELECT id FROM districts WHERE slug = ?");
                 $s->execute([$districtSlug]);
                 $districtsMap[$districtSlug] = $s->fetch()['id'];
             }
             
             // Auto-create user for district if it doesn't exist with a random password
             $email = $districtSlug . '@cotd.com';
             $randomPass = bin2hex(random_bytes(6)); // 12 char random
             $passHash = password_hash($randomPass, PASSWORD_DEFAULT);
             $u = $pdo->prepare("INSERT INTO users (email, password_hash, role, district_id) VALUES (?, ?, 'district', ?) ON CONFLICT (email) DO NOTHING");
             $u->execute([$email, $passHash, $districtsMap[$districtSlug]]);
             // NOTE: In a production environment, you would send this $randomPass to the district admin via a secure channel.
        }
        $districtId = $districtsMap[$districtSlug];
        
        $schoolName = trim($row['શાળાનું નામ'] ?? '');
        $principalName = trim($row['આચાર્યનું નામ'] ?? '');
        $principalContact = trim($row['આચાર્યનો કોન્ટેક્ટ નં.'] ?? '');
        $schoolStmt->execute([$schoolDiasCode, $schoolName, $districtId, $principalName, $principalContact]);
        
        $studentStmt->execute([
            $studentName,
            $schoolDiasCode,
            $districtId,
            trim($row['રૂટ (સ્ટાર્ટિંગ પોઇન્ટ-એન્ડીંગ પોઇન્ટ)'] ?? ''),
            trim($row['લાભાવિંત ગામોના નામ'] ?? ''),
            trim($row['ધોરણ '] ?? ''),
            trim($row['એડ્રેસ (પીકઅપ)'] ?? ''),
            trim($row['બસપાસ નં.'] ?? ''),
            trim($row['બસ નંબર'] ?? ''),
            trim($row['બસના સમયની વિગત : સવાર'] ?? ''),
            trim($row['બસના સમયની વિગત :સાંજ'] ?? ''),
            trim($row['ડેપો મેનેજરનુ નામ'] ?? ''),
            trim($row['ડેપો મેનેજરનો કોન્ટેક્ટ નં.'] ?? '')
        ]);
    }
    
    $pdo->commit();
    jsonResponse(['status' => 'success', 'message' => 'Batch uploaded successfully']);

} catch (Exception $e) {
    $pdo->rollBack();
    error_log("Upload error:" . $e->getMessage());
    jsonResponse(['error' => 'Failed to process batch: ' . $e->getMessage()], 500);
}
?>
