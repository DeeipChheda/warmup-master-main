#!/usr/bin/env python3

import requests
import sys
import json
import time
from datetime import datetime

class DeliverabilityFeaturesTest:
    def __init__(self, base_url="https://warmup-master.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.domain_id = None
        self.tests_run = 0
        self.tests_passed = 0

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    Details: {details}")

    def setup_user_and_domain(self):
        """Setup test user and domain"""
        print("🔧 Setting up test user and domain...")
        
        # Register user
        timestamp = int(time.time())
        user_data = {
            "email": f"deliverability_test_{timestamp}@example.com",
            "password": "TestPass123!",
            "full_name": "Deliverability Test User"
        }
        
        response = requests.post(f"{self.api_url}/auth/register", json=user_data)
        if response.status_code == 200:
            data = response.json()
            self.token = data['token']
            self.user_id = data['user']['id']
            print("✅ User registered successfully")
        else:
            print("❌ User registration failed")
            return False
        
        # Create domain
        domain_data = {
            "domain": f"deliverability-test-{timestamp}.com",
            "mode": "cold_outreach"
        }
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        response = requests.post(f"{self.api_url}/domains", json=domain_data, headers=headers)
        if response.status_code == 200:
            self.domain_id = response.json()['id']
            print("✅ Domain created successfully")
            return True
        else:
            print("❌ Domain creation failed")
            return False

    def test_daily_limit_enforcement(self):
        """Test daily sending limit enforcement"""
        print("\n📋 Testing Daily Limit Enforcement")
        
        if not self.domain_id:
            self.log_test("Daily Limit Test", False, "No domain available")
            return False
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # Get current domain info
        response = requests.get(f"{self.api_url}/domains/{self.domain_id}", headers=headers)
        if response.status_code != 200:
            self.log_test("Get Domain Info", False, "Failed to get domain info")
            return False
        
        domain_info = response.json()
        daily_limit = domain_info['daily_limit']
        sent_today = domain_info['sent_today']
        
        print(f"    Domain daily limit: {daily_limit}, sent today: {sent_today}")
        
        # Try to create a campaign that exceeds the daily limit
        campaign_data = {
            "domain_id": self.domain_id,
            "name": "Limit Test Campaign",
            "subject": "Test Subject",
            "body": "Test body",
            "recipients": [f"test{i}@example.com" for i in range(daily_limit + 5)]  # Exceed limit
        }
        
        response = requests.post(f"{self.api_url}/campaigns", json=campaign_data, headers=headers)
        
        if response.status_code == 403:
            self.log_test("Daily Limit Enforcement", True, "Campaign correctly rejected for exceeding daily limit")
            return True
        else:
            self.log_test("Daily Limit Enforcement", False, f"Expected 403, got {response.status_code}")
            return False

    def test_warmup_progression(self):
        """Test warmup system"""
        print("\n📋 Testing Warmup System")
        
        if not self.domain_id:
            self.log_test("Warmup Test", False, "No domain available")
            return False
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # Get domain warmup info
        response = requests.get(f"{self.api_url}/domains/{self.domain_id}", headers=headers)
        if response.status_code != 200:
            self.log_test("Get Warmup Info", False, "Failed to get domain info")
            return False
        
        domain_info = response.json()
        warmup_day = domain_info['warmup_day']
        warmup_completed = domain_info['warmup_completed']
        daily_limit = domain_info['daily_limit']
        
        print(f"    Warmup day: {warmup_day}, completed: {warmup_completed}, daily limit: {daily_limit}")
        
        # For new domains, warmup should not be completed and should be on day 0
        if warmup_day == 0 and not warmup_completed:
            self.log_test("Warmup Initial State", True, "Domain correctly in warmup state")
        else:
            self.log_test("Warmup Initial State", False, f"Unexpected warmup state: day {warmup_day}, completed {warmup_completed}")
        
        # Check warmup logs
        response = requests.get(f"{self.api_url}/warmup-logs/{self.domain_id}", headers=headers)
        if response.status_code == 200:
            logs = response.json()
            self.log_test("Warmup Logs Access", True, f"Retrieved {len(logs)} warmup log entries")
        else:
            self.log_test("Warmup Logs Access", False, "Failed to access warmup logs")
        
        return True

    def test_plan_restrictions(self):
        """Test plan-based restrictions"""
        print("\n📋 Testing Plan Restrictions")
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # Try to create a second domain (should fail for free plan)
        domain_data = {
            "domain": f"second-domain-{int(time.time())}.com",
            "mode": "cold_outreach"
        }
        
        response = requests.post(f"{self.api_url}/domains", json=domain_data, headers=headers)
        
        if response.status_code == 403:
            self.log_test("Free Plan Domain Limit", True, "Second domain correctly rejected for free plan")
        else:
            self.log_test("Free Plan Domain Limit", False, f"Expected 403, got {response.status_code}")
        
        # Try to use premium mode (should fail for free plan)
        domain_data = {
            "domain": f"premium-mode-test-{int(time.time())}.com",
            "mode": "founder_outbound"  # Not available in free plan
        }
        
        response = requests.post(f"{self.api_url}/domains", json=domain_data, headers=headers)
        
        if response.status_code == 403:
            self.log_test("Free Plan Mode Restriction", True, "Premium mode correctly rejected for free plan")
        else:
            self.log_test("Free Plan Mode Restriction", False, f"Expected 403, got {response.status_code}")
        
        return True

    def test_campaign_sending_flow(self):
        """Test complete campaign sending flow"""
        print("\n📋 Testing Campaign Sending Flow")
        
        if not self.domain_id:
            self.log_test("Campaign Flow Test", False, "No domain available")
            return False
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        # Create a contact first
        contact_data = {
            "email": f"campaign_test_{int(time.time())}@example.com",
            "first_name": "Test",
            "last_name": "Contact"
        }
        
        response = requests.post(f"{self.api_url}/contacts", json=contact_data, headers=headers)
        if response.status_code != 200:
            self.log_test("Contact Creation for Campaign", False, "Failed to create contact")
            return False
        
        # Create campaign
        campaign_data = {
            "domain_id": self.domain_id,
            "name": f"Flow Test Campaign {int(time.time())}",
            "subject": "Test Campaign Subject",
            "body": "Hello, this is a test campaign email.",
            "recipients": [contact_data["email"]]
        }
        
        response = requests.post(f"{self.api_url}/campaigns", json=campaign_data, headers=headers)
        if response.status_code != 200:
            self.log_test("Campaign Creation", False, "Failed to create campaign")
            return False
        
        campaign_id = response.json()['id']
        self.log_test("Campaign Creation", True, "Campaign created successfully")
        
        # Send campaign
        response = requests.post(f"{self.api_url}/campaigns/{campaign_id}/send", headers=headers)
        if response.status_code == 200:
            self.log_test("Campaign Sending", True, "Campaign sent successfully")
            
            # Wait a moment for mock processing
            time.sleep(2)
            
            # Check campaign stats
            response = requests.get(f"{self.api_url}/campaigns", headers=headers)
            if response.status_code == 200:
                campaigns = response.json()
                sent_campaign = next((c for c in campaigns if c['id'] == campaign_id), None)
                if sent_campaign and sent_campaign['sent_count'] > 0:
                    self.log_test("Campaign Stats Update", True, f"Campaign stats updated: {sent_campaign['sent_count']} sent")
                else:
                    self.log_test("Campaign Stats Update", False, "Campaign stats not updated")
            
            return True
        else:
            self.log_test("Campaign Sending", False, f"Failed to send campaign: {response.status_code}")
            return False

    def test_dashboard_integration(self):
        """Test dashboard stats integration"""
        print("\n📋 Testing Dashboard Integration")
        
        headers = {'Authorization': f'Bearer {self.token}', 'Content-Type': 'application/json'}
        
        response = requests.get(f"{self.api_url}/dashboard/stats", headers=headers)
        if response.status_code != 200:
            self.log_test("Dashboard Stats", False, "Failed to get dashboard stats")
            return False
        
        stats = response.json()
        required_fields = ['total_domains', 'active_campaigns', 'emails_sent_today', 'domains_in_warmup', 'average_health_score']
        
        all_present = all(field in stats for field in required_fields)
        if all_present:
            self.log_test("Dashboard Stats Fields", True, "All required fields present")
            print(f"    Stats: {stats}")
            
            # Verify stats make sense
            if stats['total_domains'] >= 1 and stats['domains_in_warmup'] >= 1:
                self.log_test("Dashboard Stats Values", True, "Stats values are logical")
            else:
                self.log_test("Dashboard Stats Values", False, f"Unexpected stats values: {stats}")
        else:
            missing = [f for f in required_fields if f not in stats]
            self.log_test("Dashboard Stats Fields", False, f"Missing fields: {missing}")
        
        return all_present

    def run_deliverability_tests(self):
        """Run all deliverability-focused tests"""
        print("🚀 Starting Deliverability Features Testing")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Setup
        if not self.setup_user_and_domain():
            print("❌ Setup failed, stopping tests")
            return False
        
        # Run tests
        self.test_daily_limit_enforcement()
        self.test_warmup_progression()
        self.test_plan_restrictions()
        self.test_campaign_sending_flow()
        self.test_dashboard_integration()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Deliverability Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All deliverability tests passed!")
            return True
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return False

def main():
    tester = DeliverabilityFeaturesTest()
    success = tester.run_deliverability_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())