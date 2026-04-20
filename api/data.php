<?php
// api/data.php
require_once 'db.php';
// checkAuth() will be called selectively for sensitive actions

$pdo = getDbConnection();
$action = $_GET['action'] ?? '';

if ($action === 'school_info') {
    checkAuth();
    $diasCode = $_GET['diasCode'] ?? '';
    $stmt = $pdo->prepare("SELECT s.*, d.name as district_name, d.slug as district_slug 
                           FROM schools s 
                           JOIN districts d ON s.district_id = d.id 
                           WHERE LOWER(s.dias_code) = LOWER(?)");
    $stmt->execute([$diasCode]);
    $school = $stmt->fetch();
    jsonResponse($school ?: ['error' => 'Not found']);
}

if ($action === 'districts') {
    $stmt = $pdo->query("SELECT id, name, slug FROM districts ORDER BY name ASC");
    jsonResponse($stmt->fetchAll());
}

if ($action === 'schools') {
    $districtSlug = $_GET['districtSlug'] ?? '';
    
    $stmt = $pdo->prepare("SELECT id FROM districts WHERE slug = ?");
    $stmt->execute([$districtSlug]);
    $district = $stmt->fetch();
    
    if (!$district) jsonResponse([]);
    
    $stmt = $pdo->prepare("SELECT id, dias_code, name FROM schools WHERE district_id = ? ORDER BY name ASC");
    $stmt->execute([$district['id']]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'talukas') {
    $district_id = $_GET['district_id'] ?? '';
    if (!$district_id) jsonResponse([]);
    
    $stmt = $pdo->prepare("SELECT id, name FROM talukas WHERE district_id = ? ORDER BY name ASC");
    $stmt->execute([$district_id]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'students') {
    checkAuth();
    $districtSlug = $_GET['districtSlug'] ?? '';
    $schoolCode = $_GET['schoolCode'] ?? '';
    
    $pdo = getDbConnection();
    
    $query = "SELECT s.*, sc.name as school_name 
              FROM students s 
              JOIN schools sc ON s.school_dias_code = sc.dias_code";
              
    $params = [];
    $where = [];
    
    if (!empty($districtSlug)) {
        $where[] = "s.district_id IN (SELECT id FROM districts WHERE slug = ?)";
        $params[] = $districtSlug;
    }
    
    if (!empty($schoolCode)) {
        $where[] = "s.school_dias_code = ?";
        $params[] = $schoolCode;
    }
    
    if (!empty($where)) {
        $query .= " WHERE " . implode(" AND ", $where);
    }
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'all_districts_stats') {
    if ($_SESSION['role'] !== 'admin') {
        jsonResponse(['error' => 'Forbidden'], 403);
    }
    
    $filterSlug = $_GET['filterSlug'] ?? '';
    
    $query = "SELECT d.id, d.name, d.slug, 
              COUNT(s.id) as total_students,
              SUM(CASE WHEN s.traveling_bus = true THEN 1 ELSE 0 END) as traveling_count,
              SUM(CASE WHEN s.not_traveling_bus = true THEN 1 ELSE 0 END) as not_traveling_count
              FROM districts d
              LEFT JOIN students s ON d.id = s.district_id ";
              
    $params = [];
    if (!empty($filterSlug)) {
        $query .= " WHERE d.slug = ? ";
        $params[] = $filterSlug;
    }
    $query .= " GROUP BY d.id, d.name, d.slug ORDER BY d.name";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    jsonResponse($stmt->fetchAll());
}

if ($action === 'daily_submissions') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $stmt = $pdo->prepare("SELECT ds.*, d.name as district_name 
                           FROM daily_submissions ds 
                           LEFT JOIN districts d ON ds.district_id = d.id 
                           WHERE ds.date = ?");
    $stmt->execute([$date]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'daily_remarks') {
    $date = $_GET['date'] ?? date('Y-m-d');
    $stmt = $pdo->prepare("SELECT dr.*, d.name as district_name 
                           FROM daily_remarks dr 
                           LEFT JOIN districts d ON dr.district_id = d.id 
                           WHERE dr.date = ?");
    $stmt->execute([$date]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'all_students') {
    checkAuth();
    $stmt = $pdo->query("SELECT s.*, d.name as district_name, sc.name as school_name 
                         FROM students s 
                         LEFT JOIN districts d ON s.district_id = d.id 
                         LEFT JOIN schools sc ON s.school_dias_code = sc.dias_code");
    jsonResponse($stmt->fetchAll());
}

if ($action === 'buses_by_district') {
    checkAuth();
    $stmt = $pdo->query("
        SELECT 
            d.name as district_name,
            s.bus_number,
            COUNT(s.id) as student_count
        FROM students s
        LEFT JOIN districts d ON s.district_id = d.id
        WHERE s.bus_number IS NOT NULL AND s.bus_number != ''
        GROUP BY d.name, s.bus_number
        ORDER BY d.name ASC, s.bus_number ASC
    ");
    $rows = $stmt->fetchAll();
    
    // Group by district
    $grouped = [];
    foreach ($rows as $row) {
        $district = $row['district_name'] ?? 'Unknown';
        if (!isset($grouped[$district])) {
            $grouped[$district] = [];
        }
        $grouped[$district][] = [
            'bus_number' => $row['bus_number'],
            'student_count' => (int)$row['student_count']
        ];
    }
    jsonResponse($grouped);
}

if ($action === 'all_schools') {
    checkAuth();
    $stmt = $pdo->query("SELECT sc.*, d.name as district_name 
                         FROM schools sc 
                         LEFT JOIN districts d ON sc.district_id = d.id");
    jsonResponse($stmt->fetchAll());
}

if ($action === 'performance_report') {
    checkAuth();
    if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
    
    $start = $_GET['startDate'] ?? '';
    $end = $_GET['endDate'] ?? '';
    
    if (!$start || !$end) jsonResponse(['error' => 'Missing range'], 400);

    // Calculate total days in range
    $startDT = new DateTime($start);
    $endDT = new DateTime($end);
    $totalDays = $startDT->diff($endDT)->days + 1;

    $stmt = $pdo->prepare("
        WITH date_entries AS (
            SELECT school_dias_code, date, 1 as submitted 
            FROM daily_submissions WHERE date BETWEEN ? AND ?
            UNION
            SELECT school_dias_code, date, 1 as submitted 
            FROM daily_remarks WHERE date BETWEEN ? AND ?
        ),
        school_stats AS (
            SELECT school_dias_code, COUNT(DISTINCT date) as days_submitted
            FROM date_entries
            GROUP BY school_dias_code
        ),
        remarks_only AS (
            SELECT school_dias_code, COUNT(DISTINCT date) as remark_only_days
            FROM daily_remarks dr
            WHERE date BETWEEN ? AND ?
            AND NOT EXISTS (SELECT 1 FROM daily_submissions ds WHERE ds.school_dias_code = dr.school_dias_code AND ds.date = dr.date)
            GROUP BY school_dias_code
        )
        SELECT 
            sc.name as school_name, 
            sc.dias_code, 
            d.name as district_name,
            ? as total_days,
            COALESCE(ss.days_submitted, 0) as days_submitted,
            (? - COALESCE(ss.days_submitted, 0)) as days_not_submitted,
            COALESCE(ro.remark_only_days, 0) as remarks_only_days
        FROM schools sc
        JOIN districts d ON sc.district_id = d.id
        LEFT JOIN school_stats ss ON sc.dias_code = ss.school_dias_code
        LEFT JOIN remarks_only ro ON sc.dias_code = ro.school_dias_code
        ORDER BY d.name, sc.name
    ");
    
    $stmt->execute([$start, $end, $start, $end, $start, $end, $totalDays, $totalDays]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'routemaster_report') {
    checkAuth();
    if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
    
    $start = $_GET['startDate'] ?? '';
    $end = $_GET['endDate'] ?? '';
    
    if (!$start || !$end) jsonResponse(['error' => 'Missing range'], 400);

    $stmt = $pdo->prepare("
        SELECT 
            bus_number as route,
            SUM(CASE WHEN traveling_bus = true THEN 1 ELSE 0 END) as traveling,
            SUM(CASE WHEN traveling_bus = false THEN 1 ELSE 0 END) as not_traveling
        FROM daily_submissions
        WHERE date BETWEEN ? AND ?
        GROUP BY bus_number
        ORDER BY bus_number ASC
    ");
    $stmt->execute([$start, $end]);
    jsonResponse($stmt->fetchAll());
}

if ($action === 'not_submitted_schools') {
    checkAuth();
    if ($_SESSION['role'] !== 'admin') jsonResponse(['error' => 'Forbidden'], 403);
    
    $date = $_GET['date'] ?? date('Y-m-d');
    
    $stmt = $pdo->prepare("
        SELECT sc.dias_code as id, sc.name, d.name as district
        FROM schools sc
        JOIN districts d ON sc.district_id = d.id
        WHERE sc.dias_code NOT IN (
            SELECT school_dias_code FROM daily_submissions WHERE date = ?
            UNION
            SELECT school_dias_code FROM daily_remarks WHERE date = ?
        )
        ORDER BY d.name, sc.name
    ");
    $stmt->execute([$date, $date]);
    jsonResponse($stmt->fetchAll());
}

jsonResponse(['error' => 'Invalid action'], 400);
?>
