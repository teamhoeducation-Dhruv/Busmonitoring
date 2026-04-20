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
            $data = json_decode($response, true);
            if (isset($data['token'])) {
                $token = $data['token'];
                
                // Save to cache
                file_put_contents($this->cacheFile, json_encode([
                    'token' => $token,
                    'timestamp' => time()
                ]));

                return $token;
            }
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

    public function getMultipleVehicleData($busNumbers) {
        $token = $this->getToken();
        if (!$token) return [];

        $uniqueBuses = array_unique(array_filter($busNumbers));
        if (empty($uniqueBuses)) return [];

        $multiHandle = curl_multi_init();
        $curlHandles = [];
        $failedOriginals = []; // Keep track if we need retro-fallback

        // 1. Build initial batch
        foreach ($uniqueBuses as $busNo) {
            $cleanBusNo = strtoupper(preg_replace('/[^A-Z0-9]/', '', $busNo));
            if (empty($cleanBusNo)) continue;

            $url = $this->baseUrl . '/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode($cleanBusNo);

            $ch = curl_init($url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'accept: */*',
                'Authorization: Bearer ' . $token
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_TIMEOUT, 15);

            curl_multi_add_handle($multiHandle, $ch);
            $curlHandles[$cleanBusNo] = [
                'ch' => $ch,
                'original' => strtoupper($busNo)
            ];
        }

        // 2. Execute requests
        $isRunning = null;
        do {
            curl_multi_exec($multiHandle, $isRunning);
            curl_multi_select($multiHandle);
        } while ($isRunning > 0);

        $results = [];

        // 3. Process results
        foreach ($curlHandles as $cleanBusNo => $info) {
            $ch = $info['ch'];
            $response = curl_multi_getcontent($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $success = false;

            if ($httpCode === 200 && $response) {
                $data = json_decode($response, true);
                // Filter out 201 valid failures or empty data
                if (!empty($data) && (!isset($data['responsecode']) || $data['responsecode'] !== '201')) {
                    if (isset($data[0])) {
                        $results[] = $data[0];
                        $success = true;
                    } elseif (isset($data['busNo']) || isset($data['vehicleNo'])) {
                        $results[] = $data;
                        $success = true;
                    }
                }
            }

            // Retry trigger for raw busno
            if (!$success && $cleanBusNo !== $info['original']) {
                $failedOriginals[] = $info['original'];
            }

            curl_multi_remove_handle($multiHandle, $ch);
            curl_close($ch);
        }

        // 4. Retry batch for un-normalized failures (Fallback)
        if (!empty($failedOriginals)) {
            $retryHandles = [];
            foreach ($failedOriginals as $rawBusNo) {
                $url = $this->baseUrl . '/VehicleTracking/LiveVehicleData_Tribal?BusNo=' . urlencode($rawBusNo);
                $ch = curl_init($url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, ['accept: */*', 'Authorization: Bearer ' . $token]);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                
                curl_multi_add_handle($multiHandle, $ch);
                $retryHandles[] = $ch;
            }

            $isRunning = null;
            do {
                curl_multi_exec($multiHandle, $isRunning);
                curl_multi_select($multiHandle);
            } while ($isRunning > 0);

            foreach ($retryHandles as $ch) {
                $response = curl_multi_getcontent($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                
                if ($httpCode === 200 && $response) {
                    $data = json_decode($response, true);
                    if (!empty($data) && (!isset($data['responsecode']) || $data['responsecode'] !== '201')) {
                        if (isset($data[0])) {
                            $results[] = $data[0];
                        } elseif (isset($data['busNo']) || isset($data['vehicleNo'])) {
                            $results[] = $data;
                        }
                    }
                }
                curl_multi_remove_handle($multiHandle, $ch);
                curl_close($ch);
            }
        }

        curl_multi_close($multiHandle);
        return $results;
    }
}
?>
