<?php
// scratch/test_env.php

// Mocking some session data for helpers
session_start();
$_SESSION['csrf_token'] = 'test-token';

require_once __DIR__ . '/../api/config.php';

echo "DB_HOST: " . DB_HOST . "\n";
echo "DB_USER: " . DB_USER . "\n";
echo "CSRF Validation (match): " . (validateCsrfToken('test-token') ? 'PASS' : 'FAIL') . "\n";
echo "CSRF Validation (mismatch): " . (validateCsrfToken('wrong') ? 'FAIL' : 'PASS') . "\n";
?>
