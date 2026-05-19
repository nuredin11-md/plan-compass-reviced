# Security Specification

## 1. Data Invariants
*   **User Profiles (`/userProfiles/{userId}`)**: A user's profile can only be created or modified if `userId` exactly matches the authenticated `request.auth.uid`. Field `role` cannot be self-escalated unless done by a verified master admin.
*   **Indicators (`/indicators/{code}`)**: Master indicators can be read by any authenticated user. Writing (creation, update, deletion) is strictly reserved for the administrative user role (`admin`), with validation enforcing that name and category values are not excessively large.
*   **Monthly Entries (`/monthlyEntries/{entryId}`)**: Monthly indicator submissions must bind to a valid indicator code. The field `actual` must be either `null` or an integer between `0` and `1000000`. The field `updatedAt` must always match the server's transactional time (`request.time`).
*   **Audit Logs (`/auditLogs/{logId}`)**: Audit trails are append-only. They can never be updated, deleted, or cleared by users. Admin users may read the logs. Creation requires a valid authenticated user.

---

## 2. The "Dirty Dozen" Poison Payloads

### Payload 1: Self-Promote / Privilege Escalation to Admin
*   **Target Path**: `/userProfiles/malicious_user_id`
*   **Payload**: `{ "id": "malicious_user_id", "email": "malicious@attacker.com", "displayName": "Attacker", "role": "admin", "region": "Amhara", "facility": "Addis Alem", "department": "MCH" }`
*   **Expected Result**: `PERMISSION_DENIED` (Cannot write to a profile unless role state validation is satisfied or user is checked).

### Payload 2: Spoof ID / Write to Another User's Profile
*   **Target Path**: `/userProfiles/victim_user_id`
*   **Payload**: `{ "id": "malicious_user_id", "email": "attacker@email.com", "displayName": "Attacker", "role": "data_entry" }`
*   **Expected Result**: `PERMISSION_DENIED` (Auth UID `malicious_user_id` does not match document ID `victim_user_id`).

### Payload 3: Indicator Creation by Role `viewer`
*   **Target Path**: `/indicators/TEST_CODE`
*   **Payload**: `{ "code": "TEST_CODE", "category": "General", "name": "Fake", "unit": "%", "baseline2015": 0, "target2016": 100, "department": "MCH" }`
*   **Expected Result**: `PERMISSION_DENIED` (User has role `viewer` in profile, role `admin` is required for master plan changes).

### Payload 4: Invalid Identifier Spoofing (Resource Poisoning)
*   **Target Path**: `/indicators/STOLEN_PROFILING_ID_STOLEN_PROFILING_ID_ExcessivelyLongIdThatExceedsNormalSizes_JunkTextHere`
*   **Payload**: `{ "code": "STOLEN_PROFILING_ID...", "category": "General", "name": "Fake", "unit": "%", "baseline2015": 0, "target2016": 100, "department": "MCH" }`
*   **Expected Result**: `PERMISSION_DENIED` (ID exceeds length boundary of 128 characters).

### Payload 5: Monthly Entry with Non-Numeric Performance
*   **Target Path**: `/monthlyEntries/MCH_ANC_04_Hamle`
*   **Payload**: `{ "code": "MCH_ANC_04", "month": "Hamle", "actual": "one hundred", "updatedAt": "2026-05-19T21:58:12Z" }`
*   **Expected Result**: `PERMISSION_DENIED` (The field `actual` is not of type number).

### Payload 6: Monthly Entry and Spoofing server-time `updatedAt`
*   **Target Path**: `/monthlyEntries/MCH_ANC_04_Hamle`
*   **Payload**: `{ "code": "MCH_ANC_04", "month": "Hamle", "actual": 85, "updatedAt": "1999-01-01T00:00:00Z" }`
*   **Expected Result**: `PERMISSION_DENIED` (`updatedAt` must strictly equal `request.time`).

### Payload 7: Monthly Entry with Negative Performance Value
*   **Target Path**: `/monthlyEntries/MCH_ANC_04_Hamle`
*   **Payload**: `{ "code": "MCH_ANC_04", "month": "Hamle", "actual": -50, "updatedAt": "request.time" }`
*   **Expected Result**: `PERMISSION_DENIED` (`actual` must range from `0` to `1000000`).

### Payload 8: Indicator Creation with Shadow Keys (Ghost Fields)
*   **Target Path**: `/indicators/TEST_CODE`
*   **Payload**: `{ "code": "TEST_CODE", "category": "General", "name": "Fake", "unit": "%", "baseline2015": 0, "target2016": 100, "department": "MCH", "isApproved": true, "ghostSecretField": "override" }`
*   **Expected Result**: `PERMISSION_DENIED` (Exact key validation failed; shadow properties detected).

### Payload 9: Audit Log State Modification (Append-Only Write Hijack)
*   **Target Path**: `/auditLogs/existing_log_uuid`
*   **Payload**: `{ "id": "existing_log_uuid", "timestamp": "2026-05-19T21:58:12Z", "userId": "usr-dev", "userEmail": "admin@hospital.org", "action": "WIPE_HISTORY", "resource": "all", "details": "Legitimate log became compromised", "role": "admin" }`
*   **Expected Result**: `PERMISSION_DENIED` (Audit logs cannot be updated or modified after initial creation).

### Payload 10: Unauthenticated Write To Audit Log
*   **Target Path**: `/auditLogs/new_log_uuid`
*   **Payload**: `{ "id": "new_log_uuid", "timestamp": "2026-05-19T21:58:12Z", "userId": "attacker", "userEmail": "anon@hack.net", "action": "INSERT_LOG", "resource": "indicators", "details": "Anonymously inserted", "role": "viewer" }`
*   **Expected Result**: `PERMISSION_DENIED` (User must be authenticated to append audits).

### Payload 11: Audit Log Deletion
*   **Target Path**: `/auditLogs/existing_log_uuid`
*   **Expected Result**: `PERMISSION_DENIED` (Deletions on audit log documents are unconditionally forbidden).

### Payload 12: Monthly Entry Blanket Read (Unfiltered Scrape)
*   **Target Path**: `/monthlyEntries`
*   **Operation**: Query without authentication
*   **Expected Result**: `PERMISSION_DENIED` (Requires active authenticated session).

---

## 3. Recommended Tests Runner

Tests are declared in standard environment testing scripts using `firebase/rules-unit-testing`, asserting that trying to send any of payloads 1-12 returns a rejected promise or PERMISSION_DENIED exception.
