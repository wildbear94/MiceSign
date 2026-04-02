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
class DepartmentControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createDepartment_returns201() { /* POST /api/v1/admin/departments with valid body -> 201 */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createDepartment_duplicateName_returns400() { /* ORG_DUPLICATE_NAME */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void createDepartment_depthExceeded_returns400() { /* ORG_DEPTH_EXCEEDED at depth > 3 */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void getDepartmentTree_returnsNestedStructure() { /* GET / returns tree with children */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void getDepartmentMembers_returnsUserList() { /* GET /{id}/members returns department members */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void deactivateDepartment_withActiveChildren_returns400() { /* ORG_HAS_ACTIVE_CHILDREN */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void updateDepartment_circularReference_returns400() { /* ORG_CIRCULAR_REF when setting parent to descendant */ }

    @Test @Disabled("Wave 0 stub — waiting for Plan 03-01 production code")
    void getUserCount_returnsCorrectActiveCount() { /* GET /{id}/user-count returns count of active users — needed by D-06 deactivation dialog and D-16 parent-move confirmation */ }
}
