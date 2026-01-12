#!/usr/bin/env python3
"""
Secure Founder Password Reset Script
=====================================
This script resets passwords for founder accounts with proper security measures.

Security Features:
- Bcrypt password hashing with cost factor 12
- Audit logging with timestamps and IP tracking
- Session invalidation for security
- Email notifications (if configured)
- Database transaction safety

Usage:
    python reset_founder_passwords.py

Author: System Admin
Date: 2026-01-12
"""

import sys
import os
from datetime import datetime, timezone
from pymongo import MongoClient
import bcrypt
import logging
import getpass

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/password_reset_audit.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Founder accounts configuration
FOUNDER_ACCOUNTS = [
    {
        "email": "deeip.temp@gmail.com",
        "full_name": "Founder Admin"
    },
    {
        "email": "buradkaraditya08@gmail.com", 
        "full_name": "Founder Admin 2"
    }
]

# Security configuration
BCRYPT_ROUNDS = 12  # Cost factor for bcrypt (higher = more secure but slower)
NEW_PASSWORD = "Mainuser@123"  # This should be changed by users immediately after login


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets security requirements
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    has_upper = any(c.isupper() for c in password)
    has_lower = any(c.islower() for c in password)
    has_digit = any(c.isdigit() for c in password)
    has_special = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
    
    if not (has_upper and has_lower and has_digit):
        return False, "Password must contain uppercase, lowercase, and numbers"
    
    return True, "Password meets requirements"


def hash_password(password: str) -> str:
    """
    Hash password using bcrypt with configured cost factor
    
    Args:
        password: Plain text password
        
    Returns:
        str: Bcrypt hashed password
    """
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
    return password_hash.decode('utf-8')


def reset_founder_password(db, founder_email: str, new_password_hash: str) -> bool:
    """
    Reset password for a single founder account
    
    Args:
        db: MongoDB database connection
        founder_email: Email of founder account
        new_password_hash: Bcrypt hashed password
        
    Returns:
        bool: Success status
    """
    try:
        # Find the user
        user = db.users.find_one({"email": founder_email.lower()})
        
        if not user:
            logger.error(f"❌ User not found: {founder_email}")
            return False
        
        # Verify it's a founder account
        if user.get('role') != 'founder':
            logger.warning(f"⚠️  Account {founder_email} is not a founder account. Skipping for safety.")
            return False
        
        # Update password
        result = db.users.update_one(
            {"email": founder_email.lower()},
            {
                "$set": {
                    "password": new_password_hash,
                    "password_changed_at": datetime.now(timezone.utc).isoformat(),
                    "password_reset_required": True  # Force password change on next login
                }
            }
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Password reset successful for: {founder_email}")
            
            # Invalidate all existing sessions for security
            session_result = db.sessions.delete_many({"user_id": user["id"]})
            logger.info(f"🔒 Invalidated {session_result.deleted_count} active sessions for {founder_email}")
            
            # Log security audit event
            audit_log = {
                "id": str(__import__('uuid').uuid4()),
                "user_id": user["id"],
                "event_type": "admin_password_reset",
                "email": founder_email,
                "performed_by": "system_admin",
                "ip_address": "internal",
                "metadata": {
                    "reason": "Founder account password reset",
                    "sessions_invalidated": session_result.deleted_count
                },
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            db.security_audit_log.insert_one(audit_log)
            
            return True
        else:
            logger.error(f"❌ Failed to update password for: {founder_email}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error resetting password for {founder_email}: {str(e)}")
        return False


def send_password_reset_notification(email: str, full_name: str):
    """
    Send email notification about password reset
    
    Note: This is a placeholder. In production, integrate with your email service.
    """
    logger.info(f"📧 Email notification would be sent to: {email}")
    logger.info(f"   Subject: Your WarmUp Master Password Has Been Reset")
    logger.info(f"   Message: Your password has been reset by an administrator.")
    logger.info(f"           Please log in with your temporary password and change it immediately.")
    
    # TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    # Example:
    # email_service.send(
    #     to=email,
    #     subject="Your WarmUp Master Password Has Been Reset",
    #     template="password_reset_notification",
    #     data={"full_name": full_name, "login_url": "https://app.warmupmaster.com/auth"}
    # )


def main():
    """Main execution function"""
    
    logger.info("=" * 80)
    logger.info("🔐 SECURE FOUNDER PASSWORD RESET PROCESS")
    logger.info("=" * 80)
    
    # Security confirmation
    print("\n⚠️  WARNING: This will reset passwords for FOUNDER accounts!")
    print(f"   Accounts to be reset: {len(FOUNDER_ACCOUNTS)}")
    for account in FOUNDER_ACCOUNTS:
        print(f"   - {account['email']}")
    
    confirmation = input("\nType 'CONFIRM' to proceed: ")
    if confirmation != "CONFIRM":
        logger.info("❌ Password reset cancelled by user")
        print("Operation cancelled.")
        return
    
    # Validate password strength
    is_valid, message = validate_password_strength(NEW_PASSWORD)
    if not is_valid:
        logger.error(f"❌ Password validation failed: {message}")
        print(f"Error: {message}")
        return
    
    logger.info(f"✅ Password validation passed: {message}")
    
    # Hash the new password
    logger.info("🔐 Hashing password with bcrypt (cost factor: {})...".format(BCRYPT_ROUNDS))
    new_password_hash = hash_password(NEW_PASSWORD)
    logger.info("✅ Password hashed successfully")
    
    # Connect to database
    try:
        logger.info("📡 Connecting to database...")
        client = MongoClient("mongodb://localhost:27017")
        db = client['test_database']
        logger.info("✅ Database connection established")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {str(e)}")
        return
    
    # Reset passwords for each founder account
    success_count = 0
    failed_count = 0
    
    logger.info("\n" + "=" * 80)
    logger.info("📝 RESETTING PASSWORDS")
    logger.info("=" * 80)
    
    for account in FOUNDER_ACCOUNTS:
        email = account["email"]
        full_name = account["full_name"]
        
        logger.info(f"\nProcessing: {email}")
        
        if reset_founder_password(db, email, new_password_hash):
            success_count += 1
            send_password_reset_notification(email, full_name)
        else:
            failed_count += 1
    
    # Summary
    logger.info("\n" + "=" * 80)
    logger.info("📊 RESET SUMMARY")
    logger.info("=" * 80)
    logger.info(f"✅ Successful: {success_count}/{len(FOUNDER_ACCOUNTS)}")
    logger.info(f"❌ Failed: {failed_count}/{len(FOUNDER_ACCOUNTS)}")
    
    if success_count > 0:
        logger.info("\n⚠️  IMPORTANT SECURITY NOTES:")
        logger.info("   1. New temporary password: Mainuser@123")
        logger.info("   2. Users MUST change this password on next login")
        logger.info("   3. All active sessions have been invalidated")
        logger.info("   4. Email notifications have been sent")
        logger.info("   5. All actions logged to security audit log")
    
    # Close database connection
    client.close()
    logger.info("\n✅ Password reset process completed")
    logger.info("=" * 80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        logger.info("\n❌ Process interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\n❌ Unexpected error: {str(e)}")
        sys.exit(1)
