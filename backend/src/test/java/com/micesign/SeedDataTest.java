package com.micesign;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class SeedDataTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void departmentsSeeded() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM department", Integer.class);
        assertThat(count).isGreaterThanOrEqualTo(7);
    }

    @Test
    void positionsSeeded() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM `position`", Integer.class);
        assertThat(count).isEqualTo(7);
    }

    @Test
    void superAdminExists() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM `user` WHERE email = 'admin@micesign.com' AND role = 'SUPER_ADMIN'",
            Integer.class);
        assertThat(count).isEqualTo(1);
    }

    @Test
    void approvalTemplatesSeeded() {
        Integer count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM approval_template WHERE code IN ('GENERAL', 'EXPENSE', 'LEAVE')",
            Integer.class);
        assertThat(count).isEqualTo(3);
    }

    @Test
    void departmentHierarchyExists() {
        // root department (parent_id IS NULL)
        Integer rootCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM department WHERE parent_id IS NULL", Integer.class);
        assertThat(rootCount).isGreaterThanOrEqualTo(1);

        // Child departments have parent_id set
        Integer childCount = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM department WHERE parent_id IS NOT NULL", Integer.class);
        assertThat(childCount).isGreaterThanOrEqualTo(6);
    }
}
