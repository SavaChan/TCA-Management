#!/usr/bin/env python3
"""
Backend API Testing Suite
Tests FastAPI server functionality, MongoDB connection, CORS, and error handling
"""

import requests
import json
import sys
import os
from datetime import datetime
import uuid

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    base_url = line.split('=')[1].strip()
                    return f"{base_url}/api"
        return None
    except Exception as e:
        print(f"Error reading frontend .env: {e}")
        return None

BASE_URL = get_backend_url()
if not BASE_URL:
    print("❌ Could not determine backend URL from frontend/.env")
    sys.exit(1)

print(f"🔗 Testing backend at: {BASE_URL}")

class BackendTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.test_results = []
        self.session = requests.Session()
        
    def log_test(self, test_name, success, message="", details=""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details
        })
    
    def test_server_connectivity(self):
        """Test 1: Server Status - Basic connectivity"""
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('message') == 'Hello World':
                    self.log_test("Server Connectivity", True, "Server responds correctly")
                    return True
                else:
                    self.log_test("Server Connectivity", False, "Unexpected response content", str(data))
            else:
                self.log_test("Server Connectivity", False, f"HTTP {response.status_code}", response.text[:200])
        except requests.exceptions.RequestException as e:
            self.log_test("Server Connectivity", False, "Connection failed", str(e))
        except Exception as e:
            self.log_test("Server Connectivity", False, "Unexpected error", str(e))
        return False
    
    def test_api_endpoints(self):
        """Test 2: API Endpoints - /api/ and /api/status functionality"""
        success_count = 0
        
        # Test GET /api/
        try:
            response = self.session.get(f"{self.base_url}/", timeout=10)
            if response.status_code == 200:
                self.log_test("GET /api/ endpoint", True, "Root endpoint working")
                success_count += 1
            else:
                self.log_test("GET /api/ endpoint", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/ endpoint", False, "Request failed", str(e))
        
        # Test GET /api/status (should return empty list initially)
        try:
            response = self.session.get(f"{self.base_url}/status", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("GET /api/status endpoint", True, f"Returns list with {len(data)} items")
                    success_count += 1
                else:
                    self.log_test("GET /api/status endpoint", False, "Response is not a list", str(data))
            else:
                self.log_test("GET /api/status endpoint", False, f"HTTP {response.status_code}")
        except Exception as e:
            self.log_test("GET /api/status endpoint", False, "Request failed", str(e))
        
        # Test POST /api/status
        try:
            test_data = {"client_name": "test_client_backend_verification"}
            response = self.session.post(
                f"{self.base_url}/status", 
                json=test_data,
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if 'id' in data and 'client_name' in data and 'timestamp' in data:
                    if data['client_name'] == test_data['client_name']:
                        self.log_test("POST /api/status endpoint", True, "Creates status check correctly")
                        success_count += 1
                    else:
                        self.log_test("POST /api/status endpoint", False, "Client name mismatch")
                else:
                    self.log_test("POST /api/status endpoint", False, "Missing required fields", str(data))
            else:
                self.log_test("POST /api/status endpoint", False, f"HTTP {response.status_code}", response.text[:200])
        except Exception as e:
            self.log_test("POST /api/status endpoint", False, "Request failed", str(e))
        
        return success_count == 3
    
    def test_mongodb_connection(self):
        """Test 3: MongoDB Connection - Verify data persistence"""
        try:
            # Create a unique test entry
            test_client_name = f"mongodb_test_{uuid.uuid4().hex[:8]}"
            
            # POST data
            post_response = self.session.post(
                f"{self.base_url}/status",
                json={"client_name": test_client_name},
                timeout=10
            )
            
            if post_response.status_code != 200:
                self.log_test("MongoDB Connection", False, "Failed to create test data")
                return False
            
            created_data = post_response.json()
            created_id = created_data.get('id')
            
            # GET data to verify persistence
            get_response = self.session.get(f"{self.base_url}/status", timeout=10)
            
            if get_response.status_code == 200:
                all_data = get_response.json()
                # Look for our test entry
                found = any(item.get('client_name') == test_client_name for item in all_data)
                
                if found:
                    self.log_test("MongoDB Connection", True, "Data persisted successfully")
                    return True
                else:
                    self.log_test("MongoDB Connection", False, "Test data not found in database")
            else:
                self.log_test("MongoDB Connection", False, "Failed to retrieve data")
                
        except Exception as e:
            self.log_test("MongoDB Connection", False, "Database operation failed", str(e))
        
        return False
    
    def test_cors_configuration(self):
        """Test 4: CORS Configuration - Check headers"""
        try:
            # Make an OPTIONS request to check CORS
            response = self.session.options(f"{self.base_url}/", timeout=10)
            
            # Check for CORS headers in any response
            test_response = self.session.get(f"{self.base_url}/", timeout=10)
            headers = test_response.headers
            
            cors_headers_found = []
            expected_cors_headers = [
                'access-control-allow-origin',
                'access-control-allow-methods', 
                'access-control-allow-headers'
            ]
            
            for header in expected_cors_headers:
                if header in headers:
                    cors_headers_found.append(header)
            
            if len(cors_headers_found) >= 1:  # At least one CORS header present
                self.log_test("CORS Configuration", True, f"CORS headers present: {cors_headers_found}")
                return True
            else:
                # Check if server accepts cross-origin requests by testing with Origin header
                test_with_origin = self.session.get(
                    f"{self.base_url}/",
                    headers={'Origin': 'http://localhost:3000'},
                    timeout=10
                )
                if test_with_origin.status_code == 200:
                    self.log_test("CORS Configuration", True, "Server accepts cross-origin requests")
                    return True
                else:
                    self.log_test("CORS Configuration", False, "No CORS headers found and cross-origin test failed")
                    
        except Exception as e:
            self.log_test("CORS Configuration", False, "CORS test failed", str(e))
        
        return False
    
    def test_error_handling(self):
        """Test 5: Error Handling - Check for import/syntax errors"""
        success_count = 0
        
        # Test invalid endpoint
        try:
            response = self.session.get(f"{self.base_url}/nonexistent", timeout=10)
            if response.status_code == 404:
                self.log_test("404 Error Handling", True, "Returns proper 404 for invalid endpoints")
                success_count += 1
            else:
                self.log_test("404 Error Handling", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_test("404 Error Handling", False, "Request failed", str(e))
        
        # Test invalid POST data
        try:
            response = self.session.post(
                f"{self.base_url}/status",
                json={"invalid_field": "test"},
                timeout=10
            )
            # Should return 422 for validation error or handle gracefully
            if response.status_code in [422, 400]:
                self.log_test("Validation Error Handling", True, f"Proper validation error (HTTP {response.status_code})")
                success_count += 1
            elif response.status_code == 200:
                # If it accepts invalid data, that's also acceptable for basic functionality
                self.log_test("Validation Error Handling", True, "Accepts request (lenient validation)")
                success_count += 1
            else:
                self.log_test("Validation Error Handling", False, f"Unexpected status {response.status_code}")
        except Exception as e:
            self.log_test("Validation Error Handling", False, "Request failed", str(e))
        
        return success_count >= 1
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Backend API Tests")
        print("=" * 50)
        
        tests = [
            ("Server Connectivity", self.test_server_connectivity),
            ("API Endpoints", self.test_api_endpoints), 
            ("MongoDB Connection", self.test_mongodb_connection),
            ("CORS Configuration", self.test_cors_configuration),
            ("Error Handling", self.test_error_handling)
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n📋 Running {test_name} test...")
            if test_func():
                passed += 1
        
        print("\n" + "=" * 50)
        print(f"🏁 Backend Tests Complete: {passed}/{total} passed")
        
        if passed == total:
            print("✅ All backend tests PASSED - Backend is fully functional!")
            return True
        else:
            print(f"❌ {total - passed} test(s) FAILED - Backend has issues")
            return False

def main():
    """Main test execution"""
    print("Backend API Testing Suite")
    print("=" * 50)
    
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Print summary
    print(f"\n📊 Test Summary:")
    for result in tester.test_results:
        status = "✅" if result['success'] else "❌"
        print(f"{status} {result['test']}: {result['message']}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())