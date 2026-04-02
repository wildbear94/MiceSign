package com.micesign.admin;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UserManagementServiceTest {

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void lastSuperAdmin_cannotBeDemoted() { /* ORG_LAST_SUPER_ADMIN when demoting sole SUPER_ADMIN */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void lastSuperAdmin_cannotBeDeactivated() { /* ORG_LAST_SUPER_ADMIN when deactivating sole SUPER_ADMIN */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createUser_setsInitialPasswordAndForceChange() { /* password encoded, mustChangePassword=true */ }
}
