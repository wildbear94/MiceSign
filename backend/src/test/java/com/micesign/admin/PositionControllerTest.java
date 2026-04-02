package com.micesign.admin;

import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PositionControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createPosition_returns201() { /* POST /api/v1/admin/positions -> 201 */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createPosition_duplicateName_returns400() { /* ORG_DUPLICATE_NAME */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void reorderPositions_updatesSortOrder() { /* PUT /reorder -> 200 */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void deactivatePosition_withActiveUsers_returns400() { /* ORG_HAS_ACTIVE_USERS */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void deactivatePosition_noUsers_returns200() { /* Success deactivation */ }
}
