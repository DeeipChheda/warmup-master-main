#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class EmailMarketingAPITester:
    def __init__(self, base_url="https://next-steps-109.preview.emergentagent.com"):
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
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
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

    # ============= SENDING ACCOUNTS TESTS =============
    
    def test_login_with_credentials(self, email, password):
        """Test login with specific credentials"""
        login_data = {
            "email": email,
            "password": password
        }
        
        success, response = self.run_test(
            "Login with Test Credentials",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_get_sending_accounts_empty(self):
        """Test getting sending accounts list (should be empty initially)"""
        success, response = self.run_test(
            "Get Sending Accounts (Empty)",
            "GET",
            "sending-accounts",
            200
        )
        
        if success:
            if isinstance(response, list) and len(response) == 0:
                self.log_test("Sending Accounts Empty Check", True, "List is empty as expected")
            else:
                self.log_test("Sending Accounts Empty Check", False, f"Expected empty list, got: {response}")
        
        return success, response if success else []

    def test_create_sending_account(self):
        """Test creating a new SMTP sending account"""
        account_data = {
            "email": "test@example.com",
            "provider": "smtp",
            "smtp_host": "smtp.gmail.com",
            "smtp_port": 587,
            "smtp_password": "testpass123",
            "warmup_enabled": True
        }
        
        success, response = self.run_test(
            "Create Sending Account",
            "POST",
            "sending-accounts",
            200,
            data=account_data
        )
        
        if success and 'id' in response:
            # Verify SMTP password is encrypted (not returned in plain text)
            if response.get('smtp_password_encrypted') == '********':
                self.log_test("SMTP Password Encryption", True, "Password is properly encrypted")
            else:
                self.log_test("SMTP Password Encryption", False, "Password not properly encrypted")
            return response['id']
        return None

    def test_get_sending_accounts_with_data(self):
        """Test getting sending accounts list (should have data now)"""
        success, response = self.run_test(
            "Get Sending Accounts (With Data)",
            "GET",
            "sending-accounts",
            200
        )
        
        if success:
            if isinstance(response, list) and len(response) > 0:
                self.log_test("Sending Accounts Data Check", True, f"Found {len(response)} account(s)")
            else:
                self.log_test("Sending Accounts Data Check", False, "Expected accounts in list")
        
        return success, response if success else []

    def test_get_single_sending_account(self, account_id):
        """Test getting a specific sending account"""
        if not account_id:
            self.log_test("Get Single Sending Account", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Get Single Sending Account",
            "GET",
            f"sending-accounts/{account_id}",
            200
        )
        
        if success:
            # Verify required fields are present
            required_fields = ['id', 'email', 'provider', 'warmup_enabled']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Account Fields Check", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Account Fields Check", True, "All required fields present")
        
        return success

    def test_verify_sending_account(self, account_id):
        """Test verifying SMTP connection (will fail due to fake SMTP, but endpoint should work)"""
        if not account_id:
            self.log_test("Verify Sending Account", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Verify Sending Account",
            "POST",
            f"sending-accounts/{account_id}/verify",
            400  # Expected to fail with fake SMTP credentials
        )
        
        # This should fail with 400 due to fake SMTP, but endpoint should respond
        if success:
            self.log_test("Verify Endpoint Working", True, "Verification endpoint responded as expected")
        
        return success

    def test_pause_sending_account(self, account_id):
        """Test pausing a sending account"""
        if not account_id:
            self.log_test("Pause Sending Account", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Pause Sending Account",
            "POST",
            f"sending-accounts/{account_id}/pause",
            200
        )
        
        return success

    def test_resume_sending_account(self, account_id):
        """Test resuming a paused sending account"""
        if not account_id:
            self.log_test("Resume Sending Account", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Resume Sending Account",
            "POST",
            f"sending-accounts/{account_id}/resume",
            200
        )
        
        return success

    def test_get_warmup_stats(self, account_id):
        """Test getting warmup statistics"""
        if not account_id:
            self.log_test("Get Warmup Stats", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Get Warmup Stats",
            "GET",
            f"sending-accounts/{account_id}/warmup/stats",
            200
        )
        
        if success:
            # Verify required stats fields
            required_fields = ['total_sent', 'total_delivered', 'reply_rate', 'current_day', 'status']
            missing_fields = [field for field in required_fields if field not in response]
            if missing_fields:
                self.log_test("Warmup Stats Fields", False, f"Missing fields: {missing_fields}")
            else:
                self.log_test("Warmup Stats Fields", True, "All required stats fields present")
        
        return success

    def test_update_sending_account(self, account_id):
        """Test updating sending account daily_send_limit"""
        if not account_id:
            self.log_test("Update Sending Account", False, "No account ID available")
            return False
            
        update_data = {
            "daily_send_limit": 100
        }
        
        success, response = self.run_test(
            "Update Sending Account",
            "PATCH",
            f"sending-accounts/{account_id}",
            200,
            data=update_data
        )
        
        if success and response.get('daily_send_limit') == 100:
            self.log_test("Daily Limit Update Check", True, "Daily send limit updated correctly")
        elif success:
            self.log_test("Daily Limit Update Check", False, f"Expected daily_send_limit=100, got {response.get('daily_send_limit')}")
        
        return success

    def test_delete_sending_account(self, account_id):
        """Test deleting a sending account"""
        if not account_id:
            self.log_test("Delete Sending Account", False, "No account ID available")
            return False
            
        success, response = self.run_test(
            "Delete Sending Account",
            "DELETE",
            f"sending-accounts/{account_id}",
            200
        )
        
        return success

    def run_sending_accounts_test(self):
        """Run comprehensive sending accounts API tests"""
        print("🚀 Starting Sending Accounts API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Login with test credentials
        if not self.test_login_with_credentials("buradkaraditya08@gmail.com", "Founder@123"):
            print("❌ Login failed, stopping tests")
            return False
        
        # Test 1: Get empty sending accounts list
        success, accounts = self.test_get_sending_accounts_empty()
        if not success:
            print("❌ Failed to get sending accounts list")
            return False
        
        # Test 2: Create new sending account
        account_id = self.test_create_sending_account()
        if not account_id:
            print("❌ Failed to create sending account")
            return False
        
        # Test 3: Verify account appears in list
        success, accounts = self.test_get_sending_accounts_with_data()
        if not success:
            print("❌ Failed to get updated sending accounts list")
            return False
        
        # Test 4: Get single account
        self.test_get_single_sending_account(account_id)
        
        # Test 5: Verify account (expected to fail with fake SMTP)
        self.test_verify_sending_account(account_id)
        
        # Test 6: Pause account
        self.test_pause_sending_account(account_id)
        
        # Test 7: Resume account
        self.test_resume_sending_account(account_id)
        
        # Test 8: Get warmup stats
        self.test_get_warmup_stats(account_id)
        
        # Test 9: Update account
        self.test_update_sending_account(account_id)
        
        # Test 10: Delete account
        self.test_delete_sending_account(account_id)
        
        # Print final results
        print("\n" + "=" * 60)
        print(f"📊 Sending Accounts Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All sending accounts tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

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
    import sys
    
    # Check if we should run sending accounts tests specifically
    if len(sys.argv) > 1 and sys.argv[1] == "sending-accounts":
        tester = EmailMarketingAPITester()
        success = tester.run_sending_accounts_test()
    else:
        tester = EmailMarketingAPITester()
        success = tester.run_comprehensive_test()
    
    # Create test_reports directory if it doesn't exist
    import os
    os.makedirs("/app/test_reports", exist_ok=True)
    
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