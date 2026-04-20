<?php
// api/amnex_api.php

class AmnexAPI {
    private $username = 'Amnex_Admin';
    private $password = 'Amnex@123';
    private $baseUrl = 'https://gsrtctracking.amnex.co.in';
    private $cacheFile = __DIR__ . '/cache/amnex_token.json';

    public function getToken() {
        if (file_exists($this->cacheFile)) {
            $cache = json_decode(file_get_contents($this->cacheFile), true);
            // Tokens are valid for 60 mins. We use 55 mins to be safe.
            if ($cache && isset($cache['token']) && (time() - $cache['timestamp'] < 3300)) {
                return $cache['token'];
            }
        }

        return $this->login();
    }

    private function login() {
        $url = $this->baseUrl . '/auth/login';
        $data = [
            'username' => $this->username,
            'password' => $this->password
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json', 'accept: */*']);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For some environments

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            // The response itself is the token string based on the sample JWT provided
            $token = trim($response, '"'); // Remove quotes if present
            
            // Save to cache
            file_put_contents($this->cacheFile, json_encode([
                'token' => $token,
                'timestamp' => time()
            ]));

            return $token;
        }

        error_log("Amnex Login Failed: HTTP $httpCode - $response");
        return null;
    }

    public function getVehicleData($busNo) {
        $token = $this->getToken();
        if (!$token) return null;

        // Normalization: Remove hyphens and spaces if present for the API call
        $cleanBusNo = strtoupper(preg_replace('/[^A-Z0-9]/', '', $busNo));

        $url = $this->baseUrl . '/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode($cleanBusNo);

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: */*',
            'Authorization: Bearer ' . $token
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            $data = json_decode($response, true);
            
            // If empty or error message, try with the original busNo (maybe hyphens are needed?)
            if (empty($data) || (isset($data['responsecode']) && $data['responsecode'] == '201')) {
                if ($cleanBusNo !== strtoupper($busNo)) {
                    return $this->getVehicleDataRaw($busNo, $token);
                }
            }
            return $data;
        }

        return null;
    }

    private function getVehicleDataRaw($busNo, $token) {
        $url = $this->baseUrl . '/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode(strtoupper($busNo));

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'accept: */*',
            'Authorization: Bearer ' . $token
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

        $response = curl_exec($ch);
        curl_close($ch);
        return json_decode($response, true);
    }
}
?>
