#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class EmailMarketingAPITester:
    def __init__(self, base_url="https://warmup-master.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                try:
                    response_data = response.json()
                    self.log_test(name, True, f"Status: {response.status_code}")
                    return True, response_data
                except:
                    self.log_test(name, True, f"Status: {response.status_code} (No JSON response)")
                    return True, {}
            else:
                try:
                    error_data = response.json()
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {error_data}")
                except:
                    self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}: {response.text}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = int(time.time())
        test_user = {
            "email": f"test_user_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": "Test User"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return test_user
        return None

    def test_user_login(self, user_credentials):
        """Test user login"""
        if not user_credentials:
            self.log_test("User Login", False, "No user credentials available")
            return False
            
        login_data = {
            "email": user_credentials["email"],
            "password": user_credentials["password"]
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response = self.run_test(
            "Get User Profile",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            required_fields = ['total_domains', 'active_campaigns', 'emails_sent_today', 'domains_in_warmup', 'average_health_score']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Dashboard Stats Fields", False, f"Missing fields: {missing_fields}")
                return False
            else:
                self.log_test("Dashboard Stats Fields", True, "All required fields present")
        
        return success

    def test_domain_creation(self):
        """Test domain creation with plan limits"""
        domain_data = {
            "domain": f"test-domain-{int(time.time())}.com",
            "mode": "cold_outreach"
        }
        
        success, response = self.run_test(
            "Domain Creation",
            "POST",
            "domains",
            200,
            data=domain_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_domains(self):
        """Test get domains list"""
        success, response = self.run_test(
            "Get Domains",
            "GET",
            "domains",
            200
        )
        return success, response if success else []

    def test_domain_validation(self, domain_id):
        """Test domain DNS validation (mocked)"""
        if not domain_id:
            self.log_test("Domain Validation", False, "No domain ID available")
            return False
            
        success, response = self.run_test(
            "Domain Validation",
            "POST",
            f"domains/{domain_id}/validate",
            200
        )
        return success

    def test_contact_creation(self):
        """Test contact creation"""
        contact_data = {
            "email": f"contact_{int(time.time())}@example.com",
            "first_name": "John",
            "last_name": "Doe",
            "company": "Test Company"
        }
        
        success, response = self.run_test(
            "Contact Creation",
            "POST",
            "contacts",
            200,
            data=contact_data
        )
        
        if success and 'id' in response:
            return response['id'], contact_data['email']
        return None, None

    def test_get_contacts(self):
        """Test get contacts list"""
        success, response = self.run_test(
            "Get Contacts",
            "GET",
            "contacts",
            200
        )
        return success, response if success else []

    def test_campaign_creation(self, domain_id, contact_email):
        """Test campaign creation"""
        if not domain_id or not contact_email:
            self.log_test("Campaign Creation", False, "Missing domain ID or contact email")
            return None
            
        campaign_data = {
            "domain_id": domain_id,
            "name": f"Test Campaign {int(time.time())}",
            "subject": "Test Subject",
            "body": "Hello, this is a test email.",
            "recipients": [contact_email]
        }
        
        success, response = self.run_test(
            "Campaign Creation",
            "POST",
            "campaigns",
            200,
            data=campaign_data
        )
        
        if success and 'id' in response:
            return response['id']
        return None

    def test_get_campaigns(self):
        """Test get campaigns list"""
        success, response = self.run_test(
            "Get Campaigns",
            "GET",
            "campaigns",
            200
        )
        return success, response if success else []

    def test_send_campaign(self, campaign_id):
        """Test campaign sending"""
        if not campaign_id:
            self.log_test("Send Campaign", False, "No campaign ID available")
            return False
            
        success, response = self.run_test(
            "Send Campaign",
            "POST",
            f"campaigns/{campaign_id}/send",
            200
        )
        return success

    def test_plan_limits(self):
        """Test plan-based domain limits"""
        # Try to create multiple domains to test free plan limit (1 domain)
        domain_data = {
            "domain": f"limit-test-{int(time.time())}.com",
            "mode": "cold_outreach"
        }
        
        success, response = self.run_test(
            "Plan Limit Test (Second Domain)",
            "POST",
            "domains",
            403,  # Should fail with 403 for free plan
            data=domain_data
        )
        
        # For free plan, second domain should be rejected
        return success

    def test_warmup_logs(self, domain_id):
        """Test warmup logs endpoint"""
        if not domain_id:
            self.log_test("Warmup Logs", False, "No domain ID available")
            return False
            
        success, response = self.run_test(
            "Warmup Logs",
            "GET",
            f"warmup-logs/{domain_id}",
            200
        )
        return success

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🚀 Starting Email Marketing SaaS API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test user registration and authentication
        user_credentials = self.test_user_registration()
        if not user_credentials:
            print("❌ Registration failed, stopping tests")
            return False
        
        # Test login
        if not self.test_user_login(user_credentials):
            print("❌ Login failed, stopping tests")
            return False
        
        # Test user profile
        self.test_get_user_profile()
        
        # Test dashboard stats
        self.test_dashboard_stats()
        
        # Test domain management
        domain_id = self.test_domain_creation()
        self.test_get_domains()
        
        if domain_id:
            self.test_domain_validation(domain_id)
            self.test_warmup_logs(domain_id)
        
        # Test plan limits
        self.test_plan_limits()
        
        # Test contact management
        contact_id, contact_email = self.test_contact_creation()
        self.test_get_contacts()
        
        # Test campaign management
        if domain_id and contact_email:
            campaign_id = self.test_campaign_creation(domain_id, contact_email)
            self.test_get_campaigns()
            
            if campaign_id:
                # Wait a moment before sending
                time.sleep(1)
                self.test_send_campaign(campaign_id)
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = EmailMarketingAPITester()
    success = tester.run_comprehensive_test()
    
    # Save detailed results
    results_file = f"/app/test_reports/backend_test_results_{int(time.time())}.json"
    with open(results_file, 'w') as f:
        json.dump({
            "summary": {
                "total_tests": tester.tests_run,
                "passed_tests": tester.tests_passed,
                "success_rate": (tester.tests_passed / tester.tests_run * 100) if tester.tests_run > 0 else 0,
                "timestamp": datetime.now().isoformat()
            },
            "detailed_results": tester.test_results
        }, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: {results_file}")
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())