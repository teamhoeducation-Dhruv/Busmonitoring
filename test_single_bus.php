<?php
require 'api/amnex_api.php';
$api = new AmnexAPI();
$token = $api->getToken();
echo "Token: $token\n";

$busNo = 'GJ18ZT2840';

$urls = [
    'Raw' => 'https://gsrtctracking.amnex.co.in/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode($busNo),
    'Cleaned' => 'https://gsrtctracking.amnex.co.in/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode(preg_replace('/[^A-Z0-9]/', '', $busNo)),
    'Dashed' => 'https://gsrtctracking.amnex.co.in/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode('GJ-18-ZT-2840')
];

foreach ($urls as $type => $url) {
    echo "Testing $type Format: $url\n";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['accept: */*', 'Authorization: Bearer ' . $token]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    echo "Response: $response\n\n";
    curl_close($ch);
}
?>
