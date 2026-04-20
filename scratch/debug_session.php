<?php
// scratch/debug_session.php
require_once __DIR__ . '/../api/config.php';

echo "Session ID: " . session_id() . "\n";
echo "Session Data: \n";
print_r($_SESSION);

if (isset($_SERVER['HTTP_X_CSRF_TOKEN'])) {
    echo "X-CSRF-Token Header: " . $_SERVER['HTTP_X_CSRF_TOKEN'] . "\n";
    echo "Validation: " . (validateCsrfToken($_SERVER['HTTP_X_CSRF_TOKEN']) ? "PASS" : "FAIL") . "\n";
}
?>
