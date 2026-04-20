<?php
// api/tracking.php
require_once 'db.php';
require_once 'amnex_api.php';

checkAuth(true); // Requiring admin for tracking for now

$pdo = getDbConnection();
$action = $_GET['action'] ?? '';
$amnex = new AmnexAPI();

if ($action === 'get_location') {
    $busNo = $_GET['bus_no'] ?? '';
    if (!$busNo) {
        jsonResponse(['error' => 'Missing bus number'], 400);
    }

    $data = $amnex->getVehicleData($busNo);
    if (!$data) {
        jsonResponse(['error' => 'No tracking data available or vehicle not found'], 404);
    }

    jsonResponse($data);
}

if ($action === 'get_all_active') {
    $date = $_GET['date'] ?? date('Y-m-d');
    
    // 1. Find all traveling buses from today's submissions
    // We join with students to be sure we get the latest bus_number if for some reason it's missing in submissions
    $stmt = $pdo->prepare("
        SELECT DISTINCT COALESCE(ds.bus_number, s.bus_number) as bus_number
        FROM daily_submissions ds
        JOIN students s ON ds.student_id = s.id
        WHERE ds.date = ? AND ds.traveling_bus = true
        AND (ds.bus_number IS NOT NULL AND ds.bus_number != '' OR s.bus_number IS NOT NULL AND s.bus_number != '')
    ");
    $stmt->execute([$date]);
    $busNumbers = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (empty($busNumbers)) {
        jsonResponse([]);
    }

    $results = [];
    foreach ($busNumbers as $busNo) {
        $data = $amnex->getVehicleData($busNo);
        if ($data && is_array($data) && count($data) > 0) {
            // The API returns an array, we take the first element
            $results[] = $data[0]; 
        }
    }

    jsonResponse($results);
}

jsonResponse(['error' => 'Invalid action'], 400);
?>
